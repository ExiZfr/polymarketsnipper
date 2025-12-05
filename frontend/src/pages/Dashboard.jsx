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
    Clock,
    DollarSign,
    Target
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

function Dashboard({ token, setToken }) {
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [moduleStates, setModuleStates] = useState({
        radar: 'ON',
        listener: 'OFF',
        executor: 'OFF'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [statsRes, logsRes, chartRes] = await Promise.all([
                    axios.get(`${API_URL}/dashboard/stats`, config),
                    axios.get(`${API_URL}/dashboard/logs`, config),
                    axios.get(`${API_URL}/dashboard/activity_chart?hours=24`, config)
                ]);

                setStats(statsRes.data);
                setLogs(logsRes.data);
                setChartData(chartRes.data);

                // Update module states from stats
                setModuleStates({
                    radar: statsRes.data.radar_status || 'ON',
                    listener: statsRes.data.listener_status || 'OFF',
                    executor: statsRes.data.executor_status || 'OFF'
                });

                setIsLoading(false);
            } catch (err) {
                console.error(err);
                if (err.response && err.response.status === 401) {
                    setToken(null);
                }
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [token, setToken]);

    const handleModuleToggle = async (module) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const currentState = moduleStates[module];
            const isCurrentlyOn = currentState === 'ON' || currentState === 'SCANNING';
            const action = isCurrentlyOn ? 'stop' : 'start';

            await axios.post(`${API_URL}/control/${module}/${action}`, {}, config);

            // Optimistically update state
            setModuleStates(prev => ({
                ...prev,
                [module]: isCurrentlyOn ? 'OFF' : 'ON'
            }));
        } catch (err) {
            console.error(`Failed to toggle ${module}:`, err);
        }
    };

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

    // Parse log message for visual enhancements
    const getLogStyle = (log) => {
        const msg = log.message.toLowerCase();

        // Detect important events
        if (msg.includes('snipe') || msg.includes('🎯')) {
            return { color: 'text-yellow-300', bg: 'bg-yellow-500/10', icon: '🎯' };
        }
        if (msg.includes('trade') || msg.includes('💰') || msg.includes('✅')) {
            return { color: 'text-green-300', bg: 'bg-green-500/10', icon: '💰' };
        }
        if (msg.includes('found') || msg.includes('detected') || msg.includes('📄')) {
            return { color: 'text-blue-300', bg: 'bg-blue-500/10', icon: '📰' };
        }
        if (msg.includes('scanning') || msg.includes('📡') || msg.includes('🐦')) {
            return { color: 'text-purple-300', bg: 'bg-purple-500/10', icon: '🔍' };
        }
        if (msg.includes('started') || msg.includes('activated') || msg.includes('🚀')) {
            return { color: 'text-cyan-300', bg: 'bg-cyan-500/10', icon: '🚀' };
        }
        if (msg.includes('stopped') || msg.includes('paused') || msg.includes('⏸')) {
            return { color: 'text-orange-300', bg: 'bg-orange-500/10', icon: '⏸️' };
        }
        if (log.level === 'ERROR') {
            return { color: 'text-red-300', bg: 'bg-red-500/10', icon: '❌' };
        }
        if (log.level === 'WARNING') {
            return { color: 'text-yellow-300', bg: 'bg-yellow-500/10', icon: '⚠️' };
        }

        return { color: 'text-gray-300', bg: '', icon: 'ℹ️' };
    };

    return (
        <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Command Center</h1>
                    <p className="text-textMuted text-sm md:text-base">Real-time monitoring and control system</p>
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm text-textMuted bg-surface/50 px-3 py-1.5 rounded-full border border-border/50">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    System Online
                </div>
            </header>

            {/* Top Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                    title="Active Events"
                    value={stats?.active_markets || 0}
                    icon={Target}
                    trend={stats?.total_markets ? `${stats.total_markets} total` : null}
                    color="blue"
                />
                <StatCard
                    title="Volume Tracked"
                    value={stats?.total_volume ? `$${(stats.total_volume / 1000000).toFixed(1)}M` : '$0'}
                    icon={DollarSign}
                    color="green"
                />
                <StatCard
                    title="Events Detected"
                    value={stats?.total_markets || 0}
                    icon={Zap}
                    color="yellow"
                />
                <StatCard
                    title="Trades Today"
                    value={stats?.trades_today || 0}
                    icon={TrendingUp}
                    color="purple"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Section */}
                <motion.div
                    variants={itemVariants}
                    className="lg:col-span-2 bg-surface/40 backdrop-blur-md border border-border/50 rounded-2xl p-4 md:p-6 shadow-xl"
                >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            Activity Overview (Last 24h)
                        </h2>
                    </div>
                    <div className="h-[250px] md:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
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
                                <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                                    itemStyle={{ color: '#E5E7EB' }}
                                />
                                <Area type="monotone" dataKey="events" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" name="Events" />
                                <Area type="monotone" dataKey="trades" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorTrades)" name="Trades" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Module Status Column */}
                <div className="space-y-4">
                    <ModuleCard
                        title="Market Radar"
                        status={moduleStates.radar}
                        icon={Radio}
                        description="Scanning Polymarket API for new opportunities"
                        onToggle={() => handleModuleToggle('radar')}
                    />
                    <ModuleCard
                        title="Social Listener"
                        status={moduleStates.listener}
                        icon={Ear}
                        description="Monitoring Twitter feeds for keywords"
                        onToggle={() => handleModuleToggle('listener')}
                    />
                    <ModuleCard
                        title="Trade Executor"
                        status={moduleStates.executor}
                        icon={Zap}
                        description="Ready to execute orders with <300ms latency"
                        onToggle={() => handleModuleToggle('executor')}
                    />
                </div>
            </div>

            {/* Enhanced Logs Console */}
            <motion.div
                variants={itemVariants}
                className="bg-black/40 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden shadow-xl"
            >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border-b border-border/50 bg-surface/30 gap-4">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-textMuted" />
                        <h2 className="font-mono text-sm font-bold text-textMuted uppercase tracking-wider">System Logs</h2>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        {['all', 'info', 'warning', 'error'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={twMerge(
                                    "px-3 py-1 rounded-md text-xs font-medium transition-colors uppercase whitespace-nowrap",
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
                <div className="h-64 overflow-y-auto p-4 font-mono text-xs space-y-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    <AnimatePresence initial={false}>
                        {logs.filter(l => activeTab === 'all' || l.level.toLowerCase() === activeTab).length === 0 ? (
                            <div className="text-textMuted italic opacity-50">No logs to display...</div>
                        ) : (
                            logs
                                .filter(l => activeTab === 'all' || l.level.toLowerCase() === activeTab)
                                .slice(0, 50)
                                .map((log) => {
                                    const style = getLogStyle(log);
                                    return (
                                        <motion.div
                                            key={log.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                            className={twMerge(
                                                "flex items-start gap-2 p-2 rounded hover:bg-white/5 transition-colors",
                                                style.bg
                                            )}
                                        >
                                            <span className="text-gray-500 whitespace-nowrap text-[10px]">
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </span>
                                            <span className="text-lg leading-none">
                                                {style.icon}
                                            </span>
                                            <span className={twMerge("font-semibold w-20 text-[10px] truncate", style.color)}>
                                                [{log.module}]
                                            </span>
                                            <span className={twMerge("flex-1 break-all", style.color)}>
                                                {log.message}
                                            </span>
                                        </motion.div>
                                    );
                                })
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
            className="bg-surface/40 backdrop-blur-md border border-border/50 rounded-2xl p-4 md:p-5 shadow-lg hover:border-primary/30 transition-colors group"
        >
            <div className="flex justify-between items-start mb-3 md:mb-4">
                <div className={twMerge("p-2 rounded-lg", colorMap[color])}>
                    <Icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                {trend && (
                    <span className="text-[10px] md:text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                        {trend}
                    </span>
                )}
            </div>
            <h3 className="text-textMuted text-xs md:text-sm font-medium mb-1">{title}</h3>
            <p className="text-xl md:text-2xl font-bold text-white group-hover:text-primary transition-colors truncate">{value}</p>
        </motion.div>
    );
}

function ModuleCard({ title, status, icon: Icon, description, onToggle }) {
    const isRunning = status === 'ON' || status === 'SCANNING';
    const isScanning = status === 'SCANNING';

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
                                "w-1.5 h-1.5 rounded-full",
                                isScanning ? "animate-ping bg-yellow-500" : isRunning ? "animate-pulse bg-green-500" : "bg-red-500"
                            )} />
                            <span className={twMerge(
                                "text-xs font-medium uppercase",
                                isRunning ? "text-green-400" : "text-red-400"
                            )}>
                                {status}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onToggle}
                    className={twMerge(
                        "p-2 rounded-full transition-all hover:scale-110",
                        isRunning
                            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    )}
                >
                    {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
            </div>

            <p className="text-sm text-textMuted relative z-10">{description}</p>
        </motion.div>
    );
}

export default Dashboard;
