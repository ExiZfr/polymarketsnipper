import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Radio, ExternalLink, DollarSign, Calendar, RefreshCw,
    MessageSquare, Mic, Megaphone, Users, AlertCircle, Flame, Clock, Target,
    Zap, Activity, TrendingUp
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Category icons mapping
const CATEGORY_ICONS = {
    'tweet': MessageSquare,
    'speech': Mic,
    'announcement': Megaphone,
    'interview': Users,
    'statement': AlertCircle,
    'action': Target,
    'reaction': TrendingUp,
    'other': Radio
};

// Category colors
const CATEGORY_COLORS = {
    'tweet': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    'speech': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    'announcement': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    'interview': 'text-green-400 bg-green-400/10 border-green-400/20',
    'statement': 'text-red-400 bg-red-400/10 border-red-400/20',
    'action': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    'reaction': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    'other': 'text-gray-400 bg-gray-400/10 border-gray-400/20'
};

function Markets({ token }) {
    const [markets, setMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedUrgency, setSelectedUrgency] = useState('all');

    const fetchMarkets = async (forceRefresh = false) => {
        try {
            setIsLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const url = forceRefresh
                ? `${API_URL}/radar/events?refresh=true`
                : `${API_URL}/radar/events`;
            const response = await axios.get(url, config);
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
        const interval = setInterval(() => fetchMarkets(), 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [token]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchMarkets(true);
    };

    // Filter markets
    const filteredMarkets = markets.filter(market => {
        const matchesSearch = market.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            market.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || market.category === selectedCategory;
        const matchesUrgency = selectedUrgency === 'all' || market.urgency === selectedUrgency;

        return matchesSearch && matchesCategory && matchesUrgency;
    });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0, scale: 0.95 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 12
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Political Radar v2</h1>
                    <p className="text-textMuted text-sm md:text-base">Snipable political events & declarations</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-primary transition-colors text-sm disabled:opacity-50"
                >
                    <RefreshCw className={twMerge("w-4 h-4", isRefreshing && "animate-spin")} />
                    {isRefreshing ? "Scanning..." : "Scan Again"}
                </button>
            </div>

            {/* Filters */}
            <div className="bg-surface border border-border rounded-2xl p-4 space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted" />
                    <input
                        type="text"
                        placeholder="Search events..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-textMuted focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    />
                </div>

                {/* Category & Urgency Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    >
                        <option value="all">All Categories</option>
                        <option value="tweet">🐦 Tweets</option>
                        <option value="speech">🎤 Speeches</option>
                        <option value="announcement">📢 Announcements</option>
                        <option value="interview">👥 Interviews</option>
                        <option value="statement">⚠️ Statements</option>
                        <option value="action">🎯 Actions</option>
                    </select>

                    <select
                        value={selectedUrgency}
                        onChange={(e) => setSelectedUrgency(e.target.value)}
                        className="bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    >
                        <option value="all">All Urgency</option>
                        <option value="critical">🔴 Critical</option>
                        <option value="high">🟠 High</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="low">🟢 Low</option>
                    </select>
                </div>

                {/* Results count */}
                <div className="mt-3 text-sm text-textMuted">
                    Showing {filteredMarkets.length} of {markets.length} high-quality snipable events
                </div>
            </div>

            {/* Content Area */}
            {isLoading && markets.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-96 bg-surface/50 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : filteredMarkets.length === 0 ? (
                <div className="bg-surface border border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-20 h-20 bg-surfaceHighlight rounded-full flex items-center justify-center mb-6">
                        <Radio className="w-10 h-10 text-textMuted" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Events Found</h3>
                    <p className="text-textMuted max-w-md mx-auto">
                        {searchTerm ? `No results for "${searchTerm}"` : "No high-quality snipable events detected yet. The radar is scanning..."}
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
                        <FlipCard key={market.id} event={market} variants={itemVariants} />
                    ))}
                </motion.div>
            )}
        </div>
    );
}

function FlipCard({ event, variants }) {
    const [isFlipped, setIsFlipped] = useState(false);
    const Icon = CATEGORY_ICONS[event.category] || Radio;
    const categoryColor = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;

    // Urgency badge color
    const urgencyColors = {
        'critical': 'bg-red-500/20 text-red-400 border-red-500/30',
        'high': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        'medium': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        'low': 'bg-green-500/20 text-green-400 border-green-500/30',
        'unknown': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };

    const breakdown = event.score_breakdown || {};

    return (
        <motion.div
            variants={variants}
            className="flip-card-container perspective-1000"
            style={{ height: '450px' }}
        >
            <motion.div
                className="flip-card-inner relative w-full h-full"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 80 }}
            >
                {/* FRONT */}
                <div
                    className="flip-card-face flip-card-front absolute w-full h-full backface-hidden cursor-pointer"
                    onClick={() => setIsFlipped(true)}
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <div className="group bg-surface border border-border hover:border-primary/50 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-primary/10 flex flex-col h-full relative overflow-hidden">
                        {/* Snipe Score Indicator */}
                        <div className="absolute top-0 right-0 px-4 py-2 bg-gradient-to-br from-primary/30 to-accent/30 text-white rounded-bl-2xl rounded-tr-2xl text-sm font-bold flex items-center gap-1.5 z-10">
                            <Flame className="w-4 h-4" />
                            {(event.snipe_score * 100).toFixed(0)}%
                        </div>

                        {/* Market Image */}
                        {event.image ? (
                            <div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-surfaceHighlight">
                                <img
                                    src={event.image}
                                    alt={event.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.classList.add('bg-gradient-to-br', 'from-primary/20', 'to-accent/20');
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="w-full h-40 rounded-xl mb-4 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                <Icon className="w-16 h-16 text-primary/30" />
                            </div>
                        )}

                        {/* Category & Urgency Badges */}
                        <div className="flex gap-2 mb-3">
                            <span className={twMerge("px-3 py-1 text-xs rounded-full border capitalize font-medium", categoryColor)}>
                                {event.category}
                            </span>
                            {event.urgency !== 'unknown' && (
                                <span className={twMerge(
                                    "px-3 py-1 text-xs rounded-full border capitalize font-medium",
                                    urgencyColors[event.urgency]
                                )}>
                                    {event.urgency}
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-white mb-3 line-clamp-3 group-hover:text-primary transition-colors leading-snug flex-1">
                            {event.title}
                        </h3>

                        {/* Time Remaining */}
                        {event.days_remaining !== null && (
                            <div className="flex items-center gap-2 text-sm text-textMuted mb-3">
                                <Clock className="w-4 h-4" />
                                <span>{event.days_remaining} days left</span>
                            </div>
                        )}

                        {/* Click to flip hint */}
                        <div className="mt-auto pt-3 border-t border-border/50 text-center">
                            <span className="text-xs text-textMuted uppercase tracking-wider">
                                Click for details →
                            </span>
                        </div>
                    </div>
                </div>

                {/* BACK */}
                <div
                    className="flip-card-face flip-card-back absolute w-full h-full backface-hidden cursor-pointer"
                    onClick={() => setIsFlipped(false)}
                    style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                    }}
                >
                    <div className="bg-gradient-to-br from-surface to-surfaceHighlight border border-primary/30 rounded-2xl p-6 flex flex-col h-full relative overflow-hidden shadow-xl shadow-primary/10">
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full" />

                        <h3 className="text-lg font-bold text-white mb-4 relative z-10">
                            <Zap className="w-5 h-5 inline mr-2 text-primary" />
                            Snipability Breakdown
                        </h3>

                        {/* Score bars */}
                        <div className="space-y-4 mb-6 flex-1">
                            <ScoreBar label="🎯 Trigger Clarity" value={breakdown.trigger_clarity || 0} />
                            <ScoreBar label="📡 Monitorability" value={breakdown.monitorability || 0} />
                            <ScoreBar label="⚡ Reaction Speed" value={breakdown.reaction_speed || 0} />
                            <ScoreBar label="⏰ Urgency" value={breakdown.urgency || 0} />
                        </div>

                        {/* Market metrics */}
                        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                            <div className="bg-black/20 rounded-lg p-3 border border-border/30">
                                <div className="text-textMuted text-xs mb-1">Volume</div>
                                <div className="text-white font-bold">${(event.volume / 1000).toFixed(1)}K</div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-3 border border-border/30">
                                <div className="text-textMuted text-xs mb-1">Liquidity</div>
                                <div className="text-white font-bold">${(event.liquidity / 1000).toFixed(1)}K</div>
                            </div>
                        </div>

                        {/* Persons */}
                        {event.persons && event.persons.length > 0 && (
                            <div className="flex gap-2 flex-wrap mb-4">
                                {event.persons.map((person, idx) => (
                                    <span key={idx} className="px-2 py-1 text-xs bg-primary/20 text-primary rounded-full border border-primary/30">
                                        {person}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Link */}
                        <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-primary transition-colors text-sm font-medium"
                        >
                            <ExternalLink className="w-4 h-4" />
                            View on Polymarket
                        </a>

                        {/* Flip back hint */}
                        <div className="mt-3 text-center">
                            <span className="text-xs text-textMuted uppercase tracking-wider">
                                ← Click to flip back
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

function ScoreBar({ label, value }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-textMuted">{label}</span>
                <span className="text-xs font-bold text-white">{value}%</span>
            </div>
            <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                />
            </div>
        </div>
    );
}

export default Markets;
