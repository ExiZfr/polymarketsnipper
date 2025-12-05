import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Shield, Key, Activity, Rss, Twitter, Tag, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Beautiful Toast Notification Component
function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-4 right-4 z-50 max-w-md"
        >
            <div className={`bg-gradient-to-r ${type === 'success' ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'
                } text-white rounded-2xl shadow-2xl p-4 border border-white/20 backdrop-blur-xl flex items-center gap-3`}>
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
                    className="flex-shrink-0"
                >
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </motion.div>
                <div className="flex-1">
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="font-semibold"
                    >
                        {type === 'success' ? '✨ Success!' : '❌ Error'}
                    </motion.p>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-sm opacity-90"
                    >
                        {message}
                    </motion.p>
                </div>
                <button
                    onClick={onClose}
                    className="flex-shrink-0 hover:bg-white/20 rounded-lg p-1 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </motion.div>
    );
}

function Settings({ token }) {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    // Default settings including keywords
    const defaultSettings = [
        { key: 'POLYMARKET_API_KEY', value: '', category: 'api', description: 'Polymarket API Key' },
        { key: 'TWITTER_API_KEY', value: '', category: 'api', description: 'X/Twitter API Key (Optional)' },
        { key: 'TELEGRAM_BOT_TOKEN', value: '', category: 'api', description: 'Telegram Bot Token' },
        { key: 'MAX_DAILY_LOSS', value: '100', category: 'trading', description: 'Max Daily Loss ($)' },
        { key: 'MAX_POSITION_SIZE', value: '10', category: 'trading', description: 'Max Position Size ($)' },
        { key: 'LATENCY_TARGET_MS', value: '300', category: 'system', description: 'Target Latency (ms)' },
        { key: 'RSS_FEEDS', value: 'https://news.google.com/rss, https://finance.yahoo.com/news/rssindex', category: 'listener', description: 'RSS Feeds (comma separated)' },
        { key: 'TWITTER_HANDLES', value: 'realDonaldTrump, elonmusk, JoeBiden', category: 'listener', description: 'Twitter Handles (comma separated)' },
        {
            key: 'listener_keywords',
            value: 'spacex,tesla,nvidia,apple,microsoft,google,meta,amazon,openai,anthropic,nasa,launch,rocket,mars,moon,bitcoin,ethereum,crypto,btc,eth,blockchain,nft,coinbase,binance,sec,trump,biden,elon,musk,desantis,harris,obama,putin,election,debate,rally,impeach,resign,congress,senate,fed,interest rate,inflation,recession,gdp,unemployment,stock market,dow,nasdaq,sp500,announce,tweet,confirm,deny,appoint,fire,acquire,merger,ipo,war,invasion,ceasefire,nuclear,sanctions,ai,chatgpt,cure,vaccine,pandemic',
            category: 'listener',
            description: 'High-value keywords for signal detection (comma separated)'
        },
    ];

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_URL}/settings/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dbSettings = res.data;
            const merged = defaultSettings.map(def => {
                const found = dbSettings.find(s => s.key === def.key);
                return found ? found : def;
            });
            setSettings(merged);
        } catch (err) {
            console.error(err);
            setSettings(defaultSettings);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key, value) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.post(`${API_URL}/settings/bulk`, settings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ message: 'All settings saved successfully!', type: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ message: 'Failed to save settings. Please try again.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const renderSection = (title, icon, category) => {
        const Icon = icon;
        const items = settings.filter(s => s.category === category);

        if (items.length === 0) return null;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-border rounded-2xl p-6 mb-6 shadow-xl"
            >
                <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                </div>
                <div className="space-y-4">
                    {items.map(setting => (
                        <div key={setting.key} className="group">
                            <label className="block text-sm font-medium text-textMuted mb-2 group-hover:text-white transition-colors">
                                {setting.description}
                            </label>
                            {category === 'listener' && (setting.key === 'RSS_FEEDS' || setting.key === 'TWITTER_HANDLES' || setting.key === 'listener_keywords') ? (
                                <textarea
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white placeholder-textMuted focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none font-mono text-sm"
                                    rows={setting.key === 'listener_keywords' ? 8 : 3}
                                    value={setting.value}
                                    onChange={(e) => handleChange(setting.key, e.target.value)}
                                    placeholder={setting.key === 'listener_keywords' ? 'bitcoin, ethereum, spacex, ...' : setting.description}
                                />
                            ) : (
                                <input
                                    type={setting.key.includes('KEY') || setting.key.includes('TOKEN') ? 'password' : 'text'}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white placeholder-textMuted focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                    value={setting.value}
                                    onChange={(e) => handleChange(setting.key, e.target.value)}
                                    placeholder={setting.description}
                                />
                            )}
                            {setting.key === 'listener_keywords' && (
                                <p className="mt-2 text-xs text-textMuted">
                                    💡 {setting.value.split(',').length} keywords configured. The listener will monitor for these terms in all sources.
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>
        );
    };

    // Telegram Configuration Section
    const renderTelegramConfig = () => {
        const telegramToken = settings.find(s => s.key === 'TELEGRAM_BOT_TOKEN')?.value || '';
        const telegramChatId = settings.find(s => s.key === 'TELEGRAM_CHAT_ID')?.value || '';

        // Helper to update specific setting
        const updateTelegramSetting = (key, value) => {
            // Check if setting exists
            const exists = settings.find(s => s.key === key);
            if (exists) {
                handleChange(key, value);
            } else {
                // Add new setting to state
                setSettings(prev => [...prev, {
                    key,
                    value,
                    category: 'system',
                    description: key === 'TELEGRAM_BOT_TOKEN' ? 'Telegram Bot Token' : 'Telegram Chat ID'
                }]);
            }
        };

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-2xl p-6 mb-6 shadow-xl"
            >
                <div className="flex items-center gap-3 mb-6 border-b border-blue-500/20 pb-4">
                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121L7.99 13.98l-2.97-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.954z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Telegram Notifications</h2>
                        <p className="text-sm text-textMuted">Configure alerts for critical markets and trade execution</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">Bot Token</label>
                        <input
                            type="password"
                            value={telegramToken}
                            onChange={(e) => updateTelegramSetting('TELEGRAM_BOT_TOKEN', e.target.value)}
                            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white placeholder-textMuted focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all font-mono text-sm"
                        />
                        <p className="text-xs text-textMuted mt-1">
                            Create a bot with <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@BotFather</a>
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">Chat ID</label>
                        <input
                            type="text"
                            value={telegramChatId}
                            onChange={(e) => updateTelegramSetting('TELEGRAM_CHAT_ID', e.target.value)}
                            placeholder="123456789"
                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white placeholder-textMuted focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all font-mono text-sm"
                        />
                        <p className="text-xs text-textMuted mt-1">
                            Get your ID from <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@userinfobot</a>
                        </p>
                    </div>
                </div>
            </motion.div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
                />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Toast Notifications */}
            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Settings</h1>
                    <p className="text-textMuted text-sm md:text-base">Configure your bot parameters and API keys</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-semibold shadow-lg hover:shadow-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            Save All
                        </>
                    )}
                </motion.button>
            </div>

            {/* Sections */}
            {renderTelegramConfig()}
            {renderSection('API Keys', Key, 'api')}
            {renderSection('Trading Limits', Activity, 'trading')}
            {renderSection('System', Shield, 'system')}
            {renderSection('Listener Configuration', Tag, 'listener')}
        </div>
    );
}

export default Settings;
