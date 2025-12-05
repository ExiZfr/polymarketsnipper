import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, Radio, LogOut, Activity, Zap, Menu, X, History, Ear, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Layout({ children, setToken }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [matchPopup, setMatchPopup] = useState(null);

    const handleLogout = () => {
        setToken(null);
        navigate('/login');
    };

    // Global Match Polling
    useEffect(() => {
        const checkMatches = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const config = { headers: { Authorization: `Bearer ${token}` } };
                // Check for very recent trades (last 10 seconds)
                const res = await axios.get(`${API_URL}/history/trades?limit=1`, config);

                if (res.data && res.data.length > 0) {
                    const latestTrade = res.data[0];
                    const tradeTime = new Date(latestTrade.timestamp).getTime();
                    const now = new Date().getTime();

                    // If trade is less than 10 seconds old, show popup
                    if (now - tradeTime < 10000) {
                        setMatchPopup(latestTrade);
                    }
                }
            } catch (err) {
                // Silent fail for polling
            }
        };

        const interval = setInterval(checkMatches, 5000);
        return () => clearInterval(interval);
    }, []);

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/markets', label: 'Markets Radar', icon: Radio },
        { path: '/listener', label: 'Social Listener', icon: Ear },
        { path: '/history', label: 'Trade History', icon: History },
        { path: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-background text-text overflow-hidden font-sans selection:bg-primary selection:text-white">
            {/* Global Match Popup */}
            <AnimatePresence>
                {matchPopup && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -50, x: '-50%' }}
                        className="fixed top-6 left-1/2 z-[100] w-[90%] max-w-md"
                    >
                        <div className="bg-surface/90 backdrop-blur-xl border border-primary/50 rounded-2xl p-4 shadow-2xl shadow-primary/20 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />

                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2 text-primary font-bold">
                                    <Zap className="w-5 h-5 fill-current" />
                                    <span>SNIPE DETECTED!</span>
                                </div>
                                <button
                                    onClick={() => setMatchPopup(null)}
                                    className="text-textMuted hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <h3 className="text-white font-bold text-lg mb-1 leading-tight">
                                {matchPopup.market_title}
                            </h3>

                            <div className="bg-white/5 rounded-lg p-2 mb-3 text-xs text-textMuted font-mono break-all">
                                {matchPopup.trigger_event}
                            </div>

                            <div className="flex gap-3">
                                <Link
                                    to="/history"
                                    onClick={() => setMatchPopup(null)}
                                    className="flex-1 bg-primary hover:bg-primaryHover text-white text-center py-2 rounded-xl font-bold text-sm transition-colors"
                                >
                                    View Trade
                                </Link>
                                <button
                                    onClick={() => setMatchPopup(null)}
                                    className="px-4 py-2 bg-surface border border-border rounded-xl text-sm font-medium hover:text-white transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-lg border-b border-border z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        PolyBot
                    </h1>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-textMuted hover:text-white transition-colors"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex w-64 bg-surface/50 backdrop-blur-xl border-r border-border flex-col">
                <div className="p-6 flex items-center gap-3 border-b border-border/50">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        PolyBot
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={twMerge(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-[0_0_20px_rgba(59,130,246,0.15)] border border-primary/20"
                                        : "text-textMuted hover:bg-surfaceHighlight hover:text-white"
                                )}
                            >
                                <Icon className={twMerge("w-5 h-5 transition-colors", isActive ? "text-primary" : "group-hover:text-white")} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border/50">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-textMuted hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="md:hidden fixed inset-0 top-16 bg-background/95 backdrop-blur-xl z-40 p-4 flex flex-col"
                    >
                        <nav className="space-y-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={twMerge(
                                            "flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200",
                                            isActive
                                                ? "bg-primary/10 text-primary border border-primary/20"
                                                : "text-textMuted hover:bg-surfaceHighlight hover:text-white"
                                        )}
                                    >
                                        <Icon className={twMerge("w-5 h-5", isActive ? "text-primary" : "text-textMuted")} />
                                        <span className="font-medium text-lg">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="mt-auto pb-8">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-4 py-4 w-full rounded-xl text-textMuted hover:bg-red-500/10 hover:text-red-500 transition-all duration-200 border border-border"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="font-medium text-lg">Logout</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative pt-16 md:pt-0">
                {/* Background Glow */}
                <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />

                <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default Layout;
