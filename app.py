import cv2
import time
import requests
import numpy as np
import pyttsx3
import speech_recognition as sr
from pymongo import MongoClient
import openai

# 🔹 MongoDB Setup
MONGO_URI = ""
client = MongoClient(MONGO_URI)
db = client["study_tracker"]
users_collection = db["users"]
sessions_collection = db["study_sessions"]

# 🔹 API Endpoints
API_URL = "http://localhost:8000/tasks"
LOGIN_URL = "http://localhost:8000/login"
UPDATE_PROGRESS_URL = "http://localhost:8000/update_progress"

# 🔹 Initialize Text-to-Speech
engine = pyttsx3.init()
openai.api_key = ""  # Replace with a valid OpenAI API Key

# 🔹 Load Face Recognizer
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

# ✅ Speak Function
def speak(text):
    """Convert text to speech and print output."""
    print(f"🗣 {text}")  # Debugging print statement
    engine.say(text)
    engine.runAndWait()

# ✅ Update Study Progress
def update_progress(email, study_time, distraction_time, status):
    """Store study session details in MongoDB & backend."""
    data = {
        "email": email,
        "study_time": study_time,
        "distraction_time": distraction_time,
        "status": status,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    sessions_collection.insert_one(data)
    requests.post(UPDATE_PROGRESS_URL, json=data)
    print("✅ Study session saved.")

# ✅ Face Recognition
def recognize_face():
    """Recognize user before starting session."""
    cap = cv2.VideoCapture(0)
    user_recognized = False
    speak("Please look at the camera for recognition.")

    while not user_recognized:
        ret, frame = cap.read()
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)

        if len(faces) > 0:
            user_recognized = True
            speak("Face recognized. Welcome back!")
            print("✅ Face detected!")
        else:
            print("❌ No face detected. Please adjust your position.")

    cap.release()
    return True

# ✅ Listen to User
def listen(timeout=10):
    """Capture and recognize voice input."""
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        recognizer.adjust_for_ambient_noise(source)
        print("🎤 Listening...")
        try:
            audio = recognizer.listen(source, timeout=timeout)
            query = recognizer.recognize_google(audio).lower()
            print(f"🎤 Heard: {query}")
            return query
        except sr.UnknownValueError:
            return None
        except sr.RequestError:
            return None
        except sr.WaitTimeoutError:
            return None
    return None

# ✅ OpenAI Chatbot
def openai_answer(query):
    """Get response from OpenAI ChatGPT."""
    if not query:
        return "I couldn't understand your question. Please try again."

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": query}]
        )
        answer = response['choices'][0]['message']['content']
        print(f"🤖 ChatGPT Answer: {answer}")
        return answer
    except Exception as e:
        print(f"❌ OpenAI API Error: {e}")
        return "Sorry, I couldn't fetch an answer right now."

# ✅ Track Distraction & Study Time
def track_distraction(session_duration):
    """Monitor distractions and allow questions during study session."""
    cap = cv2.VideoCapture(0)
    last_seen = time.time()
    distraction_time = 0
    study_start = time.time()
    eyes_closed_start = None

    while time.time() - study_start < session_duration:
        ret, frame = cap.read()
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)

        if len(faces) > 0:
            last_seen = time.time()
            eyes_closed_start = None
            print("✅ User is focused.")
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
                return time.time() - study_start, distraction_time, "Skipped"

        print("🔄 Checking for 'Hey Buddy'...")
        query = listen()
        if query and "hey buddy" in query:
            speak("Yes, how can I help you?")
            question = listen()
            if question:
                if "distracted time" in question:
                    speak(f"You have been distracted for {distraction_time // 60} minutes so far.")
                else:
                    answer = openai_answer(question)
                    speak(answer)

        time.sleep(5)

    cap.release()
    study_time = time.time() - study_start
    return study_time, distraction_time, "Completed" if distraction_time < study_time * 0.3 else "Partially Completed"

# ✅ Login and Fetch User
def login_and_get_token():
    """Authenticate the most recently registered user."""
    latest_user = users_collection.find_one({}, sort=[("_id", -1)])

    if not latest_user:
        speak("No users found. Please register first.")
        return None, None

    email = latest_user["email"]
    speak(f"Logging in as {latest_user['username']}.")
    speak("Please say your password.")
    
    while True:
        password = listen(timeout=10)
        if not password:
            speak("I couldn't hear your password. Please try again.")
            continue

        login_data = {"email": email, "password": password}
        response = requests.post(LOGIN_URL, json=login_data)

        if response.status_code == 200:
            speak("Login successful.")
            return response.json()["access_token"], latest_user
        else:
            speak("Login failed. Please try again.")

# ✅ Main Execution
if __name__ == "__main__":
    print("🔹 Assistant is starting...")

    token, user = login_and_get_token()
    if not token:
        print("❌ Failed to log in. Exiting...")
        exit()

    session = requests.get(API_URL, headers={"Authorization": f"Bearer {token}"}).json()
    
    if session and "duration" in session:
        session_duration = session.get("duration", 3600)
    else:
        speak("How long would you like to study? Please say the duration in minutes.")
        duration_input = listen()
        session_duration = int(duration_input) * 60 if duration_input and duration_input.isdigit() else 3600

    speak(f"Study session will last for {session_duration // 60} minutes. Get ready!")
    time.sleep(5)

    if recognize_face():
        study_time, distraction_time, status = track_distraction(session_duration)
        speak(f"Session ended! You studied for {study_time // 60} minutes and were distracted for {distraction_time // 60} minutes.")
        update_progress(user["email"], study_time, distraction_time, status)
        if status == "Completed":
            speak("Great job staying focused! Keep up the good work.")