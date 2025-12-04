import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Terminal,
    Zap,
    Radio,
    Ear,
    Play,
    Pause,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    Clock
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Mock data for the chart (replace with real history if available)
const MOCK_CHART_DATA = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    events: Math.floor(Math.random() * 50) + 10,
    trades: Math.floor(Math.random() * 20),
}));

function Dashboard({ token, setToken }) {
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // for logs

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [statsRes, logsRes] = await Promise.all([
                    axios.get(`${API_URL}/dashboard/stats`, config),
                    axios.get(`${API_URL}/dashboard/logs`, config)
                ]);

                setStats(statsRes.data);
                setLogs(logsRes.data);
                setIsLoading(false);
            } catch (err) {
                console.error(err);
                if (err.response && err.response.status === 401) {
                    setToken(null);
                }
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 2000); // Faster polling for "live" feel
        return () => clearInterval(interval);
    }, [token, setToken]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Section */}
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Command Center</h1>
                    <p className="text-textMuted">Real-time monitoring and control system</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-textMuted bg-surface/50 px-3 py-1.5 rounded-full border border-border/50">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    System Online
                </div>
            </header>

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Active Markets"
                    value={stats?.active_markets || 0}
                    icon={Activity}
                    trend="+12%"
                    color="blue"
                />
                <StatCard
                    title="Events Detected"
                    value="1,234"
                    icon={Zap}
                    trend="+5%"
                    color="yellow"
                />
                <StatCard
                    title="Trades Executed"
                    value="89"
                    icon={TrendingUp}
                    trend="+2.4%"
                    color="green"
                />
                <StatCard
                    title="System Uptime"
                    value="24h 12m"
                    icon={Clock}
                    color="purple"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Section */}
                <motion.div
                    variants={itemVariants}
                    className="lg:col-span-2 bg-surface/40 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-xl"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            Activity Overview
                        </h2>
                        <select className="bg-background/50 border border-border/50 rounded-lg px-3 py-1 text-sm text-textMuted focus:outline-none focus:border-primary">
                            <option>Last 24 Hours</option>
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={MOCK_CHART_DATA}>
                                <defs>
                                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorTrades" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                                    itemStyle={{ color: '#E5E7EB' }}
                                />
                                <Area type="monotone" dataKey="events" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" />
                                <Area type="monotone" dataKey="trades" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorTrades)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Module Status Column */}
                <div className="space-y-4">
                    <ModuleCard
                        title="Market Radar"
                        status={stats?.radar_status}
                        icon={Radio}
                        description="Scanning Polymarket API for new opportunities"
                    />
                    <ModuleCard
                        title="Social Listener"
                        status={stats?.listener_status}
                        icon={Ear}
                        description="Monitoring Twitter feeds for keywords"
                    />
                    <ModuleCard
                        title="Trade Executor"
                        status={stats?.executor_status}
                        icon={Zap}
                        description="Ready to execute orders with <300ms latency"
                    />
                </div>
            </div>

            {/* Logs Console */}
            <motion.div
                variants={itemVariants}
                className="bg-black/40 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden shadow-xl"
            >
                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-surface/30">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-textMuted" />
                        <h2 className="font-mono text-sm font-bold text-textMuted uppercase tracking-wider">System Logs</h2>
                    </div>
                    <div className="flex gap-2">
                        {['all', 'info', 'warning', 'error'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={twMerge(
                                    "px-3 py-1 rounded-md text-xs font-medium transition-colors uppercase",
                                    activeTab === tab
                                        ? "bg-primary/20 text-primary border border-primary/30"
                                        : "text-textMuted hover:text-white hover:bg-white/5"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-64 overflow-y-auto p-4 font-mono text-xs space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    <AnimatePresence initial={false}>
                        {logs.filter(l => activeTab === 'all' || l.level.toLowerCase() === activeTab).length === 0 ? (
                            <div className="text-textMuted italic opacity-50">No logs to display...</div>
                        ) : (
                            logs
                                .filter(l => activeTab === 'all' || l.level.toLowerCase() === activeTab)
                                .map((log) => (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-start gap-3 group hover:bg-white/5 p-1 rounded"
                                    >
                                        <span className="text-gray-500 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span>
                                        <span className={twMerge(
                                            "font-bold px-1.5 rounded text-[10px] uppercase w-16 text-center",
                                            log.level === 'ERROR' ? "bg-red-500/20 text-red-400" :
                                                log.level === 'WARNING' ? "bg-yellow-500/20 text-yellow-400" :
                                                    "bg-blue-500/20 text-blue-400"
                                        )}>
                                            {log.level}
                                        </span>
                                        <span className="text-purple-400 font-semibold w-24 truncate">
                                            [{log.module}]
                                        </span>
                                        <span className="text-gray-300 group-hover:text-white transition-colors">
                                            {log.message}
                                        </span>
                                    </motion.div>
                                ))
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}

function StatCard({ title, value, icon: Icon, trend, color }) {
    const colorMap = {
        blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        green: "text-green-400 bg-green-400/10 border-green-400/20",
        yellow: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
        purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    };

    return (
        <motion.div
            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            className="bg-surface/40 backdrop-blur-md border border-border/50 rounded-2xl p-5 shadow-lg hover:border-primary/30 transition-colors group"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={twMerge("p-2 rounded-lg", colorMap[color])}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                        {trend}
                    </span>
                )}
            </div>
            <h3 className="text-textMuted text-sm font-medium mb-1">{title}</h3>
            <p className="text-2xl font-bold text-white group-hover:text-primary transition-colors">{value}</p>
        </motion.div>
    );
}

function ModuleCard({ title, status, icon: Icon, description }) {
    const isRunning = status === 'running' || status === 'active';

    return (
        <motion.div
            variants={{ hidden: { x: 20, opacity: 0 }, visible: { x: 0, opacity: 1 } }}
            className="bg-surface/40 backdrop-blur-md border border-border/50 rounded-2xl p-5 shadow-lg relative overflow-hidden group"
        >
            <div className={twMerge(
                "absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-10 rounded-bl-full transition-opacity group-hover:opacity-20",
                isRunning ? "from-green-500 to-transparent" : "from-red-500 to-transparent"
            )} />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={twMerge(
                        "p-2 rounded-lg transition-colors",
                        isRunning ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    )}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">{title}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className={twMerge(
                                "w-1.5 h-1.5 rounded-full animate-pulse",
                                isRunning ? "bg-green-500" : "bg-red-500"
                            )} />
                            <span className={twMerge(
                                "text-xs font-medium uppercase",
                                isRunning ? "text-green-400" : "text-red-400"
                            )}>
                                {status || 'Unknown'}
                            </span>
                        </div>
                    </div>
                </div>
                <button className={twMerge(
                    "p-2 rounded-full transition-all",
                    isRunning
                        ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                )}>
                    {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
            </div>

            <p className="text-sm text-textMuted relative z-10">{description}</p>
        </motion.div>
    );
}

export default Dashboard;
