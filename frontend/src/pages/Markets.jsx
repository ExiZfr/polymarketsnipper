import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Radio, ExternalLink, DollarSign, Calendar, RefreshCw,
    MessageSquare, Mic, Megaphone, Users, AlertCircle, Flame, Clock, Target,
    Zap, Activity, TrendingUp, HelpCircle, X, Info, Award, BarChart3, Bell, Sparkles
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// New Market Notification Popup
function NewMarketNotification({ market, onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000); // Auto-close after 5 seconds
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="fixed top-20 right-6 z-50 max-w-sm"
        >
            <div className="bg-gradient-to-br from-primary/90 to-accent/90 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-white/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <motion.div
                            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.5, repeat: 2 }}
                            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                        >
                            <Sparkles className="w-6 h-6" />
                        </motion.div>
                        <div>
                            <h3 className="font-bold text-sm">New Snipable Market!</h3>
                            <p className="text-xs opacity-80">High-quality opportunity detected</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                    <h4 className="font-semibold text-sm line-clamp-2 leading-snug">
                        {market.title}
                    </h4>

                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4" />
                            <span className="font-bold">{(market.snipe_score * 100).toFixed(0)}% Snipability</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="font-bold">{market.urgency_rate}% Urgency</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <span className="px-2 py-1 bg-white/20 rounded-full text-xs capitalize">
                            {market.category}
                        </span>
                        <span className="px-2 py-1 bg-white/20 rounded-full text-xs capitalize">
                            {market.urgency}
                        </span>
                    </div>
                </div>

                {/* Progress bar */}
                <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 5, ease: "linear" }}
                    className="h-1 bg-white/30"
                />
            </div>
        </motion.div>
    );
}

// Help Modal Component
function HelpModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gradient-to-br from-surface via-surfaceHighlight to-surface border border-primary/30 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-primary/20"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary/20 to-accent/20 border-b border-border/50 p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
                            >
                                <HelpCircle className="w-7 h-7 text-white" />
                            </motion.div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Snipability Score Guide</h2>
                                <p className="text-sm text-textMuted">Understanding market quality metrics</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <X className="w-6 h-6 text-textMuted hover:text-white" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)] space-y-6">
                        {/* Overall Score */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-6"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <Flame className="w-6 h-6 text-yellow-400" />
                                <h3 className="text-xl font-bold text-white">Snipability Score (0-100%)</h3>
                            </div>
                            <p className="text-textMuted mb-4">
                                Le score global qui indique à quel point un marché est "snipable" - c'est-à-dire facile à trader rapidement avec profit.
                            </p>
                            <div className="space-y-2 bg-black/20 rounded-xl p-4">
                                <ScoreRange range="80-100%" color="text-green-400" label="Excellent" description="Marché hautement profitable, événement clair, liquidité élevée" />
                                <ScoreRange range="65-79%" color="text-blue-400" label="Très Bon" description="Bon potentiel, conditions favorables" />
                                <ScoreRange range="50-64%" color="text-yellow-400" label="Moyen" description="Potentiel modéré, risque acceptable" />
                                <ScoreRange range="35-49%" color="text-orange-400" label="Faible" description="Risque élevé, conditions sous-optimales" />
                                <ScoreRange range="0-34%" color="text-red-400" label="Très Faible" description="Non recommandé, filtré automatiquement" />
                            </div>
                        </motion.div>

                        {/* Urgency Rate Section */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 }}
                            className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-2xl p-6"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <Clock className="w-6 h-6 text-red-400" />
                                <h3 className="text-xl font-bold text-white">Urgency Rate (0-100%)</h3>
                            </div>
                            <p className="text-textMuted mb-4">
                                Taux d'urgence basé sur le temps restant avant expiration du marché.
                            </p>
                            <div className="space-y-2 bg-black/20 rounded-xl p-4">
                                <ScoreRange range="100%" color="text-red-400" label="Critique" description="< 1 jour - Action immédiate requise" />
                                <ScoreRange range="90%" color="text-orange-400" label="Très Urgent" description="1-7 jours - Haute priorité" />
                                <ScoreRange range="70%" color="text-yellow-400" label="Urgent" description="7-30 jours - Priorité moyenne" />
                                <ScoreRange range="40%" color="text-blue-400" label="Modéré" description="30-90 jours - Temps disponible" />
                                <ScoreRange range="10%" color="text-gray-400" label="Faible" description="> 90 jours - Pas urgent" />
                            </div>
                        </motion.div>

                        {/* Score Breakdown */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-surface/50 border border-border rounded-2xl p-6"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <BarChart3 className="w-6 h-6 text-primary" />
                                <h3 className="text-xl font-bold text-white">Composantes du Score</h3>
                            </div>
                            <p className="text-textMuted mb-6">
                                Le score de snipabilité est calculé à partir de 4 critères principaux :
                            </p>

                            <div className="space-y-4">
                                <MetricCard
                                    icon={Target}
                                    title="Trigger Clarity (30%)"
                                    color="text-blue-400"
                                    description="Clarté de l'événement déclencheur"
                                    examples={[
                                        "100% : Tweet avec contenu exact spécifié",
                                        "90% : Annonce publique avec citation",
                                        "70% : Discours ou déclaration générale",
                                        "50% : Action avec deadline claire",
                                        "30% : Événement vague ou ambigu"
                                    ]}
                                />

                                <MetricCard
                                    icon={Activity}
                                    title="Monitorability (25%)"
                                    color="text-purple-400"
                                    description="Facilité de surveillance en temps réel"
                                    examples={[
                                        "100% : Twitter/X (surveillance 24/7)",
                                        "80% : Flux RSS d'actualités",
                                        "70% : Discours publics programmés",
                                        "60% : Interviews/émissions",
                                        "40% : Actions difficiles à monitorer"
                                    ]}
                                />

                                <MetricCard
                                    icon={Zap}
                                    title="Reaction Speed (20%)"
                                    color="text-yellow-400"
                                    description="Temps de réaction nécessaire"
                                    examples={[
                                        "100% : Tweet instantané (<10s)",
                                        "70% : Annonce (quelques minutes)",
                                        "50% : Événement prévu (heures)",
                                        "20% : Long-terme (jours/semaines)"
                                    ]}
                                />

                                <MetricCard
                                    icon={Clock}
                                    title="Urgency (15%)"
                                    color="text-red-400"
                                    description="Temps restant avant expiration"
                                    examples={[
                                        "100% : < 1 jour",
                                        "90% : 1-7 jours",
                                        "70% : 7-30 jours",
                                        "50% : 30-90 jours",
                                        "20% : > 90 jours"
                                    ]}
                                />
                            </div>
                        </motion.div>

                        {/* Additional Metrics */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-surface/50 border border-border rounded-2xl p-6"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <Info className="w-6 h-6 text-cyan-400" />
                                <h3 className="text-xl font-bold text-white">Autres Métriques</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SimpleMetric
                                    icon={DollarSign}
                                    title="Volume"
                                    description="Montant total tradé sur le marché. Plus élevé = meilleure liquidité."
                                    threshold="Minimum : $5,000"
                                />
                                <SimpleMetric
                                    icon={TrendingUp}
                                    title="Liquidité"
                                    description="Capital disponible pour trader. Permet d'entrer/sortir facilement."
                                    threshold="Minimum : $2,000"
                                />
                                <SimpleMetric
                                    icon={AlertCircle}
                                    title="Urgence"
                                    description="Niveau de priorité basé sur le temps restant."
                                    levels="Critical > High > Medium > Low"
                                />
                                <SimpleMetric
                                    icon={Award}
                                    title="Catégorie"
                                    description="Type d'événement : Tweet, Speech, Announcement, etc."
                                    note="Influence la stratégie de monitoring"
                                />
                            </div>
                        </motion.div>

                        {/* Example */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <Award className="w-6 h-6 text-green-400" />
                                <h3 className="text-xl font-bold text-white">Exemple Concret</h3>
                            </div>
                            <div className="bg-black/30 rounded-xl p-4 space-y-3">
                                <p className="text-white font-semibold">
                                    "Will Trump tweet 'crypto' before Dec 31?"
                                </p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-textMuted">Trigger Clarity:</span>
                                        <span className="text-green-400 ml-2 font-bold">100%</span>
                                        <p className="text-xs text-textMuted mt-1">Tweet avec mot exact</p>
                                    </div>
                                    <div>
                                        <span className="text-textMuted">Monitorability:</span>
                                        <span className="text-green-400 ml-2 font-bold">100%</span>
                                        <p className="text-xs text-textMuted mt-1">Twitter 24/7</p>
                                    </div>
                                    <div>
                                        <span className="text-textMuted">Reaction Speed:</span>
                                        <span className="text-green-400 ml-2 font-bold">100%</span>
                                        <p className="text-xs text-textMuted mt-1">Instantané</p>
                                    </div>
                                    <div>
                                        <span className="text-textMuted">Urgency Rate:</span>
                                        <span className="text-yellow-400 ml-2 font-bold">70%</span>
                                        <p className="text-xs text-textMuted mt-1">26 jours restants</p>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-border/50">
                                    <span className="text-textMuted">Score Final:</span>
                                    <span className="text-green-400 ml-2 font-bold text-xl">94%</span>
                                    <span className="text-green-400 ml-2">Excellent !</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function ScoreRange({ range, color, label, description }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
            <div className="flex items-center gap-3">
                <span className={`font-mono font-bold ${color}`}>{range}</span>
                <span className="text-white font-semibold">{label}</span>
            </div>
            <span className="text-sm text-textMuted">{description}</span>
        </div>
    );
}

function MetricCard({ icon: Icon, title, color, description, examples }) {
    return (
        <div className="bg-black/20 rounded-xl p-4 border border-border/30">
            <div className="flex items-center gap-3 mb-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <h4 className="font-bold text-white">{title}</h4>
            </div>
            <p className="text-sm text-textMuted mb-3">{description}</p>
            <div className="space-y-1">
                {examples.map((ex, idx) => (
                    <div key={idx} className="text-xs text-textMuted flex items-start gap-2">
                        <span className={`${color} mt-0.5`}>•</span>
                        <span>{ex}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SimpleMetric({ icon: Icon, title, description, threshold, levels, note }) {
    return (
        <div className="bg-black/20 rounded-xl p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-white text-sm">{title}</h4>
            </div>
            <p className="text-xs text-textMuted mb-2">{description}</p>
            {threshold && <p className="text-xs text-yellow-400">⚡ {threshold}</p>}
            {levels && <p className="text-xs text-blue-400">📊 {levels}</p>}
            {note && <p className="text-xs text-purple-400">💡 {note}</p>}
        </div>
    );
}

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
    const [showHelp, setShowHelp] = useState(false);
    const [newMarkets, setNewMarkets] = useState([]);
    const [previousMarketIds, setPreviousMarketIds] = useState(new Set());

    const fetchMarkets = async (forceRefresh = false) => {
        try {
            setIsLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const url = forceRefresh
                ? `${API_URL}/radar/events?refresh=true`
                : `${API_URL}/radar/events`;
            const response = await axios.get(url, config);
            const fetchedMarkets = response.data;

            // Detect new markets
            if (previousMarketIds.size > 0) {
                const newOnes = fetchedMarkets.filter(m => !previousMarketIds.has(m.id));
                if (newOnes.length > 0) {
                    setNewMarkets(prev => [...prev, ...newOnes.slice(0, 3)]); // Show max 3 at a time
                }
            }

            // Update market IDs
            setPreviousMarketIds(new Set(fetchedMarkets.map(m => m.id)));
            setMarkets(fetchedMarkets);
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

    const removeNotification = (marketId) => {
        setNewMarkets(prev => prev.filter(m => m.id !== marketId));
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
        <div className="space-y-6 relative">
            {/* New Market Notifications */}
            <AnimatePresence>
                {newMarkets.map((market, index) => (
                    <div key={market.id} style={{ top: `${80 + index * 180}px` }} className="absolute">
                        <NewMarketNotification
                            market={market}
                            onClose={() => removeNotification(market.id)}
                        />
                    </div>
                ))}
            </AnimatePresence>

            {/* Help Modal */}
            <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

            {/* Floating Help Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowHelp(true)}
                className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-full shadow-2xl shadow-primary/50 flex items-center justify-center text-white hover:shadow-primary/70 transition-shadow"
            >
                <HelpCircle className="w-7 h-7" />
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
    const urgencyRate = event.urgency_rate || 0;

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

                        {/* Urgency Rate Badge */}
                        <div className="absolute top-0 left-0 px-3 py-1.5 bg-gradient-to-br from-red-500/30 to-orange-500/30 text-white rounded-br-2xl rounded-tl-2xl text-xs font-bold flex items-center gap-1.5 z-10">
                            <Clock className="w-3 h-3" />
                            {urgencyRate}%
                        </div>

                        {/* Market Image */}
                        {event.image ? (
                            <div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-surfaceHighlight mt-8">
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
                            <div className="w-full h-40 rounded-xl mb-4 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mt-8">
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
                            <div className="bg-black/20 rounded-lg p-3 border border-border/30">
                                <div className="text-textMuted text-xs mb-1">Urgency Rate</div>
                                <div className="text-white font-bold">{urgencyRate}%</div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-3 border border-border/30">
                                <div className="text-textMuted text-xs mb-1">Days Left</div>
                                <div className="text-white font-bold">{event.days_remaining || 'N/A'}</div>
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
