import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Radio, ExternalLink, DollarSign, Calendar, RefreshCw,
    MessageSquare, Mic, Megaphone, Users, AlertCircle, Flame, Clock
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
    'other': Radio
};

// Category colors
const CATEGORY_COLORS = {
    'tweet': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    'speech': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    'announcement': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    'interview': 'text-green-400 bg-green-400/10 border-green-400/20',
    'statement': 'text-red-400 bg-red-400/10 border-red-400/20',
    'other': 'text-gray-400 bg-gray-400/10 border-gray-400/20'
};

function Markets({ token }) {
    const [markets, setMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedUrgency, setSelectedUrgency] = useState('all');

    const fetchMarkets = async () => {
        try {
            setIsLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            // Use new /events endpoint for full feature set
            const response = await axios.get(`${API_URL}/radar/events`, config);
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

    // Apply filters
    const filteredMarkets = markets.filter(market => {
        const matchesSearch = market.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || market.category === selectedCategory;
        const matchesUrgency = selectedUrgency === 'all' || market.urgency === selectedUrgency;
        return matchesSearch && matchesCategory && matchesUrgency;
    });

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
                    <h1 className="text-3xl font-bold text-white mb-2">Political Radar v2</h1>
                    <p className="text-textMuted">Snipable political events & declarations</p>
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
            <div className="bg-surface border border-border rounded-2xl p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted" />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        />
                    </div>

                    {/* Category Filter */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-background border border-border rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                        <option value="all">All Categories</option>
                        <option value="tweet">Tweets</option>
                        <option value="speech">Speeches</option>
                        <option value="announcement">Announcements</option>
                        <option value="interview">Interviews</option>
                        <option value="statement">Statements</option>
                    </select>

                    {/* Urgency Filter */}
                    <select
                        value={selectedUrgency}
                        onChange={(e) => setSelectedUrgency(e.target.value)}
                        className="bg-background border border-border rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-primary/50 outline-none"
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
                    Showing {filteredMarkets.length} of {markets.length} events
                </div>
            </div>

            {/* Content Area */}
            {isLoading && markets.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-64 bg-surface/50 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : filteredMarkets.length === 0 ? (
                <div className="bg-surface border border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-20 h-20 bg-surfaceHighlight rounded-full flex items-center justify-center mb-6">
                        <Radio className="w-10 h-10 text-textMuted" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Events Found</h3>
                    <p className="text-textMuted max-w-md mx-auto">
                        {searchTerm ? `No results for "${searchTerm}"` : "No events detected yet. The radar is scanning..."}
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
                        <EventCard key={market.id} event={market} variants={itemVariants} />
                    ))}
                </motion.div>
            )}
        </div>
    );
}

function EventCard({ event, variants }) {
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

    return (
        <motion.div
            variants={variants}
            className="group bg-surface border border-border hover:border-primary/50 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-primary/5 flex flex-col h-full relative overflow-hidden"
        >
            {/* Snipe Score Indicator */}
            <div className="absolute top-0 right-0 px-3 py-1 bg-primary/20 text-primary rounded-bl-2xl rounded-tr-2xl text-xs font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" />
                {(event.snipe_score * 100).toFixed(0)}%
            </div>

            {/* Header with Category Icon */}
            <div className="flex justify-between items-start mb-4 mt-6">
                <div className={twMerge("p-2 rounded-lg border", categoryColor)}>
                    <Icon className="w-5 h-5" />
                </div>
                <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-textMuted hover:text-white transition-colors"
                >
                    <ExternalLink className="w-5 h-5" />
                </a>
            </div>

            {/* Category & Urgency Badges */}
            <div className="flex gap-2 mb-3">
                <span className="px-2 py-1 text-xs rounded-full bg-surface border border-border text-textMuted capitalize">
                    {event.category}
                </span>
                {event.urgency !== 'unknown' && (
                    <span className={twMerge(
                        "px-2 py-1 text-xs rounded-full border capitalize font-medium",
                        urgencyColors[event.urgency]
                    )}>
                        {event.urgency}
                    </span>
                )}
            </div>

            {/* Title */}
            <h3 className="text-base font-bold text-white mb-3 line-clamp-3 group-hover:text-primary transition-colors leading-snug">
                {event.title}
            </h3>

            {/* Persons */}
            {event.persons && event.persons.length > 0 && (
                <div className="flex gap-1 mb-3 flex-wrap">
                    {event.persons.map((person, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                            {person}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="mt-auto pt-4 space-y-2 text-sm text-textMuted border-t border-border/50">
                {/* Days Remaining */}
                {event.days_remaining !== null && event.days_remaining !== undefined && (
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className={event.days_remaining <= 1 ? "text-red-400 font-bold" : ""}>
                            {event.days_remaining === 0 ? 'Today!' : `${event.days_remaining}d remaining`}
                        </span>
                    </div>
                )}

                {/* Volume & Date */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-mono font-medium text-white">
                            ${Number(event.volume).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                    {event.created_at && (
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(event.created_at).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default Markets;
