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
    const [taskStartDate, setTaskStartDate] = useState(""); // Start date for task
    const [taskStartTime, setTaskStartTime] = useState(""); // Start time for task
    const [taskEndTime, setTaskEndTime] = useState(""); // End time for task
    const [status, setStatus] = useState("pending");
    const [isRegistering, setIsRegistering] = useState(false);

    const api = axios.create({
        baseURL: "http://localhost:8000",
    });

    // Fetch tasks function
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

    // Register user function
    const registerUser = async () => {
        try {
            await api.post("/register", { username, email, password });
            alert("User registered successfully!");
            setIsRegistering(false);
        } catch (error) {
            alert("Error: " + (error.response?.data?.detail || "Unknown error"));
        }
    };

    // Login user function
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

    // Logout user function
    const logoutUser = () => {
        setToken(null);
        localStorage.removeItem("token");
        setTasks([]);
        alert("Logged out successfully!");
    };

    // Update task status function
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

    // Delete task function
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

    // Add task function (with start and end time on the same day)
    const addTask = async () => {
        try {
            const taskStartDateTime = `${taskStartDate}T${taskStartTime}`;
            const taskEndDateTime = `${taskStartDate}T${taskEndTime}`;

            // Check if end time is after start time
            if (new Date(taskEndDateTime) <= new Date(taskStartDateTime)) {
                alert("End time must be later than start time.");
                return;
            }

            await api.post("/add-task", 
                { 
                    task_schedule: taskStartDateTime,  // Combine start date and time
                    task_end_time: taskEndDateTime,    // Combine end date and end time
                    task, 
                    status 
                }, 
                {
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
            {/* Logo and App Heading */}
            <div className="logo-container">
                <img src="logo.png" alt="Logo" />
            </div>
            <h1>
                Study Buddy
            </h1>

            {/* Conditional Rendering for Login/Register or Task Management */}
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
                        {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
                        <button onClick={() => setIsRegistering(!isRegistering)} className="link-btn">
                            {isRegistering ? "Login" : "Register"}
                        </button>
                    </p>
                </div>
            ) : (
                <>
                    {/* Logout Button */}
                    <button onClick={logoutUser} className="btn logout">Logout</button>

                    {/* Task Management */}
                    <h2>Task Management</h2>
                    <input type="text" placeholder="Task" value={task} onChange={(e) => setTask(e.target.value)} />

                    {/* Start Date and Time */}
                    <div className="task-time-inputs">
                        <label htmlFor="taskStartDate">Start Date</label>
                        <input 
                            type="date" 
                            id="taskStartDate" 
                            value={taskStartDate} 
                            onChange={(e) => setTaskStartDate(e.target.value)} 
                        />
                    </div>
                    <div className="task-time-inputs">
                        <label htmlFor="taskStartTime">Start Time</label>
                        <input 
                            type="time" 
                            id="taskStartTime" 
                            value={taskStartTime} 
                            onChange={(e) => setTaskStartTime(e.target.value)} 
                        />
                    </div>

                    {/* End Time */}
                    <div className="task-time-inputs">
                        <label htmlFor="taskEndTime">End Time</label>
                        <input 
                            type="time" 
                            id="taskEndTime" 
                            value={taskEndTime} 
                            onChange={(e) => setTaskEndTime(e.target.value)} 
                        />
                    </div>

                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="pending">Pending</option>
                        <option value="incomplete">Incomplete</option>
                        <option value="completed">Completed</option>
                    </select>
                    <button onClick={addTask} className="btn">Add Task</button>

                    <h3>Your Tasks</h3>
                    <button onClick={fetchTasks} className="btn">Load Tasks</button>

                    {/* Task Table */}
                    <table>
                        <thead>
                            <tr>
                                <th>Task</th>
                                <th>Status</th>
                                <th>Start Date</th>
                                <th>Start Time</th>
                                <th>End Time</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.length > 0 ? (
                                tasks.map((task) => (
                                    <tr key={task._id}>
                                        <td>{task.task}</td>
                                        <td>{task.status}</td>
                                        <td>{new Date(task.task_schedule).toLocaleDateString()}</td>
                                        <td>{new Date(task.task_schedule).toLocaleTimeString()}</td>
                                        <td>{new Date(task.task_end_time).toLocaleTimeString()}</td>
                                        <td>
                                            <button onClick={() => updateTaskStatus(task._id, "completed")} className="btn">Mark Completed</button>
                                            <button onClick={() => updateTaskStatus(task._id, "incomplete")} className="btn">Mark Incomplete</button>
                                            <button onClick={() => deleteTask(task._id)} className="btn">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6">No tasks found. Click "Load Tasks".</td></tr>
                            )}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
}

export default App;
