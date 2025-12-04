import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Radio, ExternalLink, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Markets({ token }) {
    const [markets, setMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchMarkets = async () => {
        try {
            setIsLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${API_URL}/radar/markets`, config);
            setMarkets(response.data);
        } catch (err) {
            console.error("Failed to fetch markets:", err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMarkets();
        const interval = setInterval(fetchMarkets, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, [token]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchMarkets();
    };

    const filteredMarkets = markets.filter(market =>
        market.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Polymarket Radar</h1>
                    <p className="text-textMuted">Real-time monitoring of Trump & Musk markets.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleRefresh}
                        className={twMerge(
                            "p-2 rounded-full bg-surface border border-border text-textMuted hover:text-white transition-all",
                            isRefreshing && "animate-spin text-primary"
                        )}
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-2 rounded-full border border-green-500/20">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-bold">Scanning Active</span>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-surface border border-border rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted" />
                    <input
                        type="text"
                        placeholder="Search markets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-surfaceHighlight rounded-xl text-textMuted hover:text-white transition-colors">
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                </button>
            </div>

            {/* Content Area */}
            {isLoading && markets.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-48 bg-surface/50 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : filteredMarkets.length === 0 ? (
                <div className="bg-surface border border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-20 h-20 bg-surfaceHighlight rounded-full flex items-center justify-center mb-6">
                        <Radio className="w-10 h-10 text-textMuted" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Markets Found</h3>
                    <p className="text-textMuted max-w-md mx-auto">
                        {searchTerm ? `No results for "${searchTerm}"` : "No markets detected yet. The radar is scanning..."}
                    </p>
                </div>
            ) : (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {filteredMarkets.map((market) => (
                        <MarketCard key={market.id} market={market} variants={itemVariants} />
                    ))}
                </motion.div>
            )}
        </div>
    );
}

function MarketCard({ market, variants }) {
    return (
        <motion.div
            variants={variants}
            className="group bg-surface border border-border hover:border-primary/50 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-primary/5 flex flex-col h-full"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="bg-primary/10 text-primary p-2 rounded-lg">
                    <DollarSign className="w-5 h-5" />
                </div>
                <a
                    href={`https://polymarket.com/event/${market.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-textMuted hover:text-white transition-colors"
                >
                    <ExternalLink className="w-5 h-5" />
                </a>
            </div>

            <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {market.title}
            </h3>

            <div className="mt-auto pt-4 flex items-center justify-between text-sm text-textMuted border-t border-border/50">
                <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(market.created_at).toLocaleDateString()}</span>
                </div>
                <div className="font-mono font-medium text-white">
                    Vol: ${Number(market.volume).toLocaleString()}
                </div>
            </div>
        </motion.div>
    );
}

export default Markets;
