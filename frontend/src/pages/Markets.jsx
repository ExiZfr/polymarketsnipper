import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Radio, ExternalLink, DollarSign, Calendar, RefreshCw,
    MessageSquare, Mic, Megaphone, Users, AlertCircle, Flame, Clock, Target,
    HelpCircle, Shield
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ... (CATEGORY_ICONS and CATEGORY_COLORS remain same)

function Markets({ token }) {
    const [markets, setMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedUrgency, setSelectedUrgency] = useState('all');
    const [showHelp, setShowHelp] = useState(false);

    // ... (fetchMarkets and useEffect remain same)

    // ... (handleRefresh and filteredMarkets remain same)

    // ... (containerVariants and itemVariants remain same)

    return (
        <div className="space-y-6 relative min-h-screen pb-20">
            <AnimatePresence>
                {showHelp && <RadarHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />}
            </AnimatePresence>

            {/* Floating Help Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowHelp(true)}
                className="fixed bottom-8 right-8 z-40 w-14 h-14 bg-gradient-to-r from-primary to-accent rounded-full shadow-2xl shadow-primary/30 flex items-center justify-center text-white border border-white/20 backdrop-blur-md"
            >
                <HelpCircle className="w-8 h-8" />
            </motion.button>
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

function RadarHelpModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative"
            >
                {/* Header */}
                <div className="sticky top-0 bg-surface/95 backdrop-blur-md border-b border-border p-6 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Target className="w-6 h-6 text-primary" />
                            Radar Scoring System
                        </h2>
                        <p className="text-textMuted text-sm">Understanding how we identify snipable markets</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <AlertCircle className="w-6 h-6 text-textMuted" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                    {/* Global Score */}
                    <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-6 border border-primary/20">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary/20 rounded-lg text-primary">
                                <Flame className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">Snipe Score (Global)</h3>
                                <p className="text-textMuted text-sm leading-relaxed">
                                    The master probability score (0-100%) indicating how "snipable" a market is. 
                                    It combines all sub-metrics below. A score > 45% is considered
                                    <span className="text-primary font-bold"> High Quality</span>.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <MetricCard
                            icon={Target}
                            title="Trigger Clarity"
                            color="text-blue-400"
                            bg="bg-blue-400/10"
                            desc="How precise is the resolution criteria? Direct quotes or specific numbers score 100%. Vague interpretations score low."
                        />
                        <MetricCard
                            icon={Activity}
                            title="Monitorability"
                            color="text-green-400"
                            bg="bg-green-400/10"
                            desc="Can we track this 24/7 via API? Twitter & RSS feeds score high. Offline events score low."
                        />
                        <MetricCard
                            icon={Zap}
                            title="Reaction Speed"
                            color="text-yellow-400"
                            bg="bg-yellow-400/10"
                            desc="Do we have a speed advantage? Instant tweets give us seconds before the market reacts."
                        />
                        <MetricCard
                            icon={Clock}
                            title="Urgency"
                            color="text-red-400"
                            bg="bg-red-400/10"
                            desc="Time sensitivity. Markets ending soon (24h-7d) score higher as capital isn't locked up for long."
                        />
                    </div>

                    {/* Confidence Levels */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-accent" />
                            Confidence Levels
                        </h3>
                        <div className="space-y-3">
                            <ConfidenceRow level="High (80-100%)" desc="Direct tweet from source, exact keyword match, high volume." color="text-green-400" />
                            <ConfidenceRow level="Medium (50-79%)" desc="Reliable news source, clear statement but maybe not direct quote." color="text-yellow-400" />
                            <ConfidenceRow level="Low (< 50%)" desc="Vague rumors, indirect sources, or low liquidity." color="text-red-400" />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function MetricCard({ icon: Icon, title, desc, color, bg }) {
    return (
        <div className="bg-surfaceHighlight/50 rounded-xl p-4 border border-border/50 hover:border-border transition-colors">
            <div className={`w-10 h-10 ${bg} ${color} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white mb-2">{title}</h4>
            <p className="text-xs text-textMuted leading-relaxed">{desc}</p>
        </div>
    );
}

function ConfidenceRow({ level, desc, color }) {
    return (
        <div className="flex items-center gap-4 p-3 bg-surfaceHighlight/30 rounded-lg border border-border/30">
            <span className={`font-bold text-sm w-32 ${color}`}>{level}</span>
            <span className="text-xs text-textMuted flex-1">{desc}</span>
        </div>
    );
}

export default Markets;
