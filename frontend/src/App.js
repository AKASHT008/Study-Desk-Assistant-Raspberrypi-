import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./App.css"; 

function App() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [token, setToken] = useState(localStorage.getItem("token") || null);
    const [tasks, setTasks] = useState([]);
    const [task, setTask] = useState("");
    const [taskSchedule, setTaskSchedule] = useState("");
    const [status, setStatus] = useState("pending");
    const [isRegistering, setIsRegistering] = useState(false);

    const api = axios.create({
        baseURL: "http://localhost:8000",
    });

    const fetchTasks = useCallback(async () => {
        if (!token) return;
        try {
            const response = await api.get("/tasks", {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            console.log("Fetched Tasks:", response.data);
            setTasks(response.data.tasks);
        } catch (error) {
            console.error("Failed to fetch tasks:", error.response?.data?.detail || error.message);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchTasks();
        }
    }, [token, fetchTasks]);

    // ✅ **Fixed missing functions**
    const registerUser = async () => {
        try {
            await api.post("/register", { username, email, password });
            alert("User registered successfully!");
            setIsRegistering(false);
        } catch (error) {
            alert("Error: " + (error.response?.data?.detail || "Unknown error"));
        }
    };

    const loginUser = async () => {
        try {
            const response = await api.post("/login", { email, password });
            const userToken = response.data.access_token;
            setToken(userToken);
            localStorage.setItem("token", userToken);
            alert("Login successful!");
            fetchTasks();
        } catch (error) {
            alert("Error: " + (error.response?.data?.detail || "Login failed"));
        }
    };

    const logoutUser = () => {
        setToken(null);
        localStorage.removeItem("token");
        setTasks([]);
        alert("Logged out successfully!");
    };

    const updateTaskStatus = async (taskId, newStatus) => {
        try {
            await api.put(`/update-task/${taskId}`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            alert("Task updated successfully!");
            fetchTasks();
        } catch (error) {
            console.error("Failed to update task:", error.response?.data?.detail || error.message);
            alert("Failed to update task.");
        }
    };

    const deleteTask = async (taskId) => {
        try {
            await api.delete(`/delete-task/${taskId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            alert("Task deleted successfully!");
            fetchTasks();
        } catch (error) {
            console.error("Failed to delete task:", error.response?.data?.detail || error.message);
            alert("Failed to delete task.");
        }
    };

    const addTask = async () => {
        try {
            await api.post("/add-task", { task_schedule: taskSchedule, task, status }, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            alert("Task added successfully!");
            fetchTasks();
        } catch (error) {
            console.error("Task Error:", error.response?.data?.detail || error.message);
            alert("Failed to add task.");
        }
    };

    return (
        <div className="container">
            {/* 🔹 Logo at the top-left */}
            <div className="logo-container">
                <img src="logo.png" alt="Logo" />
            </div>
            <h1>
                Study Desk Assistant
                <img src="logo.png" alt="Logo" />
                </h1>
            {!token ? (
                <div className="login-box">
                    <h2>{isRegistering ? "Sign Up" : "Login"}</h2>
                    {isRegistering && (
                        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                    )}
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    {isRegistering ? (
                        <button onClick={registerUser} className="btn">Register</button>
                    ) : (
                        <button onClick={loginUser} className="btn">Login</button>
                    )}
                    <p>
                        {isRegistering ? "Already have an account?" : "Don't have an account?"} {" "}
                        <button onClick={() => setIsRegistering(!isRegistering)} className="link-btn">
                            {isRegistering ? "Login" : "Register"}
                        </button>
                    </p>
                </div>
            ) : (
                <>
                    <button onClick={logoutUser} className="btn logout">Logout</button>
                    <h2>Task Management</h2>
                    <input type="text" placeholder="Task" value={task} onChange={(e) => setTask(e.target.value)} />
                    <input type="datetime-local" value={taskSchedule} onChange={(e) => setTaskSchedule(e.target.value)} />
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="pending">Pending</option>
                        <option value="incomplete">Incomplete</option>
                        <option value="completed">Completed</option>
                    </select>
                    <button onClick={addTask} className="btn">Add Task</button>
                    <h3>Your Tasks</h3>
                    <button onClick={fetchTasks} className="btn">Load Tasks</button>
                    <ul>
                        {tasks.length > 0 ? (
                            tasks.map((task) => (
                                <li key={task._id}>
                                    {task.task} - {task.status} ({task.task_schedule})
                                    <button onClick={() => updateTaskStatus(task._id, "completed")} className="btn">Mark Completed</button>
                                    <button onClick={() => updateTaskStatus(task._id, "incomplete")} className="btn">Mark Incomplete</button>
                                    <button onClick={() => deleteTask(task._id)} className="btn">Delete</button>
                                </li>
                            ))
                        ) : (
                            <p>No tasks found. Click "Load Tasks".</p>
                        )}
                    </ul>
                </>
            )}
        </div>
    );
}


export default App;
