import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { History, CheckCircle2, XCircle, Clock, Filter, Search } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function HistoryPage({ token }) {
    const [trades, setTrades] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const response = await axios.get(`${API_URL}/history/trades`, config);
                setTrades(response.data);
            } catch (err) {
                console.error("Failed to fetch trades:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTrades();
        const interval = setInterval(fetchTrades, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, [token]);

    const filteredTrades = trades.filter(trade => {
        const matchesStatus = filterStatus === 'all' || trade.status.toLowerCase() === filterStatus;
        const matchesSearch = trade.market_title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Trade History</h1>
                    <p className="text-textMuted">Review past automated executions</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted" />
                    <input
                        type="text"
                        placeholder="Search markets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    {['all', 'filled', 'pending', 'failed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={twMerge(
                                "px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-colors",
                                filterStatus === status
                                    ? "bg-primary text-white"
                                    : "bg-background border border-border text-textMuted hover:text-white"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Trades List */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-textMuted">Loading history...</div>
                ) : filteredTrades.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center">
                        <History className="w-12 h-12 text-textMuted mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">No Trades Found</h3>
                        <p className="text-textMuted">No trades match your current filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-surfaceHighlight text-xs uppercase text-textMuted font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Time</th>
                                    <th className="px-6 py-4">Market</th>
                                    <th className="px-6 py-4">Side</th>
                                    <th className="px-6 py-4">Price</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Trigger</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredTrades.map((trade) => (
                                    <motion.tr
                                        key={trade.id}
                                        variants={itemVariants}
                                        className="hover:bg-white/5 transition-colors"
                                    >
                                        <td className="px-6 py-4 text-sm text-textMuted whitespace-nowrap">
                                            {new Date(trade.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white line-clamp-2 max-w-xs">
                                                {trade.market_title}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={twMerge(
                                                "px-2 py-1 rounded text-xs font-bold",
                                                trade.side === 'BUY' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                            )}>
                                                {trade.side} {trade.outcome}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-white">
                                            ${trade.price.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-white">
                                            ${trade.amount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={trade.status} />
                                        </td>
                                        <td className="px-6 py-4 text-xs text-textMuted max-w-xs truncate">
                                            {trade.trigger_event || '-'}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function StatusBadge({ status }) {
    const styles = {
        filled: "bg-green-500/20 text-green-400 border-green-500/30",
        pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        failed: "bg-red-500/20 text-red-400 border-red-500/30"
    };

    const icons = {
        filled: CheckCircle2,
        pending: Clock,
        failed: XCircle
    };

    const Icon = icons[status.toLowerCase()] || Clock;

    return (
        <div className={twMerge(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium w-fit",
            styles[status.toLowerCase()] || styles.pending
        )}>
            <Icon className="w-3.5 h-3.5" />
            <span className="capitalize">{status}</span>
        </div>
    );
}

export default HistoryPage;
