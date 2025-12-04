import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Dashboard({ token, setToken }) {
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };

                const statsRes = await axios.get(`${API_URL}/dashboard/stats`, config);
                setStats(statsRes.data);

                const logsRes = await axios.get(`${API_URL}/dashboard/logs`, config);
                setLogs(logsRes.data);
            } catch (err) {
                console.error(err);
                if (err.response && err.response.status === 401) {
                    setToken(null);
                }
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [token, setToken]);

    const handleLogout = () => setToken(null);

    return (
        <div className="min-h-screen bg-primary p-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-accent">PolyBot Dashboard</h1>
                <button
                    onClick={handleLogout}
                    className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
                >
                    Logout
                </button>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard title="Radar Status" value={stats?.radar_status || 'Loading...'} color="text-green-400" />
                <StatCard title="Listener Status" value={stats?.listener_status || 'Loading...'} color="text-green-400" />
                <StatCard title="Executor Status" value={stats?.executor_status || 'Loading...'} color="text-gray-400" />
                <StatCard title="Active Markets" value={stats?.active_markets || 0} />
            </div>

            {/* Logs Section */}
            <div className="bg-secondary rounded-lg p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">System Logs</h2>
                <div className="h-64 overflow-y-auto font-mono text-sm">
                    {logs.length === 0 ? (
                        <p className="text-gray-500">No logs available.</p>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="mb-2">
                                <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className={`mx-2 font-bold ${getLevelColor(log.level)}`}>{log.level}</span>
                                <span className="text-accent">[{log.module}]</span>
                                <span className="ml-2">{log.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, color = 'text-white' }) {
    return (
        <div className="bg-secondary p-6 rounded-lg shadow-lg">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">{title}</h3>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
    );
}

function getLevelColor(level) {
    switch (level) {
        case 'ERROR': return 'text-red-500';
        case 'WARNING': return 'text-yellow-500';
        default: return 'text-green-500';
    }
}

export default Dashboard;
