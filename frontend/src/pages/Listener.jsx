import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Radio, RefreshCw, Activity, Search, Twitter, Rss } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function ListenerPage({ token }) {
    const [logs, setLogs] = useState([]);
    const [targets, setTargets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const logsEndRef = useRef(null);

    const fetchData = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Fetch logs specifically for Listener module
            const logsRes = await axios.get(`${API_URL}/dashboard/logs?limit=100&module=Listener`, config);
            setLogs(logsRes.data);

            // Fetch active targets (using events endpoint)
            const eventsRes = await axios.get(`${API_URL}/radar/events`, config);
            // Filter for active events only
            const active = eventsRes.data.filter(e => e.days_remaining >= 0);
            setTargets(active);

            setIsLoading(false);
        } catch (err) {
            console.error("Failed to fetch listener data:", err);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000); // Fast polling for logs
        return () => clearInterval(interval);
    }, [token]);

    // Auto-scroll to bottom of logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Social Listener</h1>
                    <p className="text-textMuted">Real-time monitoring of Twitter & News feeds</p>
                </div>
                <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-2 rounded-full border border-green-500/20">
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span className="text-sm font-bold">Monitoring Active</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Active Targets List */}
                <div className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-border/50 bg-surfaceHighlight/50">
                        <h2 className="font-bold text-white flex items-center gap-2">
                            <Radio className="w-5 h-5 text-primary" />
                            Active Targets ({targets.length})
                        </h2>
                    </div>
                    <div className="overflow-y-auto p-4 space-y-3 flex-1">
                        {targets.map(target => (
                            <div key={target.id} className="bg-background/50 border border-border/50 p-3 rounded-xl hover:border-primary/30 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={twMerge(
                                        "text-[10px] px-2 py-0.5 rounded-full uppercase font-bold",
                                        target.category === 'tweet' ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                                    )}>
                                        {target.category}
                                    </span>
                                    <span className="text-xs text-textMuted">{target.days_remaining}d left</span>
                                </div>
                                <p className="text-sm font-medium text-white line-clamp-2 mb-2">{target.title}</p>
                                <div className="flex gap-2">
                                    {target.persons.map((p, i) => (
                                        <span key={i} className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Live Logs Terminal */}
                <div className="lg:col-span-2 bg-black/80 border border-border rounded-2xl overflow-hidden flex flex-col shadow-2xl font-mono">
                    <div className="p-3 border-b border-border/30 bg-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-green-400" />
                            <span className="text-xs font-bold text-green-400">LISTENER_OUTPUT_STREAM</span>
                        </div>
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-1.5 text-xs md:text-sm">
                        {logs.length === 0 ? (
                            <div className="text-gray-600 italic">Waiting for logs...</div>
                        ) : (
                            logs.slice().reverse().map((log) => (
                                <div key={log.id} className="flex gap-3 hover:bg-white/5 p-0.5 rounded">
                                    <span className="text-gray-500 whitespace-nowrap min-w-[80px]">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span className={twMerge(
                                        "font-bold min-w-[60px]",
                                        log.level === 'INFO' ? "text-blue-400" :
                                            log.level === 'WARNING' ? "text-yellow-400" : "text-red-400"
                                    )}>
                                        [{log.level}]
                                    </span>
                                    <span className="text-gray-300 break-all">
                                        {log.message}
                                    </span>
                                </div>
                            ))
                        )}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ListenerPage;
