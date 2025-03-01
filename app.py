import cv2
import time
import requests
import numpy as np
import pyttsx3
import speech_recognition as sr
from pymongo import MongoClient
import openai

# MongoDB Setup
MONGO_URI = ""
client = MongoClient(MONGO_URI)
db = client["study_session"]
collection = db["tasks"]

# API Endpoints
API_URL = "http://localhost:8000/tasks"
LOGIN_URL = "http://localhost:8000/login"
NOTIFY_URL = "http://localhost:8000/send_notification"
UPDATE_PROGRESS_URL = "http://localhost:8000/update_progress"

# Initialize Text-to-Speech
engine = pyttsx3.init()
openai.api_key = ""

# Load Face Recognizer
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

def speak(text):
    engine.say(text)
    engine.runAndWait()

def send_notification(message):
    data = {"message": message}
    requests.post(NOTIFY_URL, json=data)

def update_progress(study_time, distraction_time, status):
    data = {"study_time": study_time, "distraction_time": distraction_time, "status": status}
    requests.post(UPDATE_PROGRESS_URL, json=data)

def recognize_face():
    cap = cv2.VideoCapture(0)
    user_recognized = False
    speak("Please sit in front of the camera for recognition.")
    
    while not user_recognized:
        ret, frame = cap.read()
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) > 0:
            user_recognized = True
            speak("Face recognized. Welcome back! Starting study session.")
        
    cap.release()
    return True

def listen():
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        recognizer.adjust_for_ambient_noise(source)
        try:
            audio = recognizer.listen(source, timeout=10)
            query = recognizer.recognize_google(audio)
            return query.lower()
        except sr.UnknownValueError:
            speak("Sorry, I couldn't understand. Please try again.")
        except sr.RequestError:
            speak("Could not connect to speech service.")
    return None

def openai_answer(query):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful study assistant."},
            {"role": "user", "content": query}
        ]
    )
    return response['choices'][0]['message']['content']

def track_distraction(session_duration):
    cap = cv2.VideoCapture(0)
    last_seen = time.time()
    distraction_time = 0
    study_start = time.time()
    eyes_closed_start = None
    last_update = time.time()
    break_reminder_given = False
    
    while time.time() - study_start < session_duration:
        ret, frame = cap.read()
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)

        if len(faces) > 0:
            last_seen = time.time()
            eyes_closed_start = None
        else:
            if time.time() - last_seen > 30:
                speak("You seem distracted! Focus on your studies.")
                distraction_time += time.time() - last_seen
                last_seen = time.time()
            
            if eyes_closed_start is None:
                eyes_closed_start = time.time()
            elif time.time() - eyes_closed_start > 60:
                speak("Wake up! Open your eyes.")
            elif time.time() - eyes_closed_start > 120:
                speak("Session stopped due to inactivity.")
                cap.release()
                return study_time, distraction_time, "Skipped"
        
        if time.time() - last_update > 900:
            remaining_time = session_duration - (time.time() - study_start)
            speak(f"You have {int(remaining_time / 60)} minutes left. Keep going!")
            last_update = time.time()
        
        if session_duration >= 3600 and not break_reminder_given and time.time() - study_start > 2700:
            speak("You've been studying for 45 minutes. Consider taking a 5-minute break.")
            break_reminder_given = True

        speak("Do you have any questions?")
        query = listen()
        if query:
            answer = openai_answer(query)
            speak(answer)

        time.sleep(5)
    
    cap.release()
    study_time = time.time() - study_start
    return study_time, distraction_time, "Completed" if distraction_time < study_time * 0.3 else "Partially Completed"

def login_and_get_token():
    login_data = {
        "email": "akash@gmail.com",  # Hardcoded login details
        "password": "12345"
    }
    response = requests.post(LOGIN_URL, json=login_data)
    return response.json()["access_token"] if response.status_code == 200 else None

if __name__ == "__main__":
    token = login_and_get_token()
    if token:
        session = requests.get(API_URL, headers={"Authorization": f"Bearer {token}"}).json()
        if session:
            session_duration = session.get("duration", 3600)
            speak("Study session starting in 10 Seconds. Get ready!")
            send_notification("Study session starting in 10msecond!")
            time.sleep(10)
            if recognize_face():
                study_time, distraction_time, status = track_distraction(session_duration)
                speak(f"Session ended! You studied for {study_time} seconds and were distracted for {distraction_time} seconds.")
                send_notification(f"Session ended! Studied {study_time} seconds, distracted {distraction_time} seconds. Status: {status}")
                update_progress(study_time, distraction_time, status)
                if status == "Completed":
                    speak("Great job staying focused! Keep up the good work.")
