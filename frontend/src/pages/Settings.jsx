import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Shield, Key, Activity, Rss, Twitter, Tag, CheckCircle2, X, MessageCircle, Send } from 'lucide-react';
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
    const [testingConnection, setTestingConnection] = useState(false);

    // Default settings including keywords
    const defaultSettings = [
        { key: 'POLYMARKET_API_KEY', value: '', category: 'api', description: 'Polymarket API Key' },
        { key: 'TWITTER_API_KEY', value: '', category: 'api', description: 'X/Twitter API Key (Optional)' },
        { key: 'TELEGRAM_BOT_TOKEN', value: '', category: 'telegram', description: 'Telegram Bot Token' },
        { key: 'TELEGRAM_CHAT_ID', value: '', category: 'telegram', description: 'Telegram Chat ID' },
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

    const handleTestConnection = async () => {
        setTestingConnection(true);
        try {
            // Save settings first
            await handleSave();

            // Wait a bit for settings to be saved
            await new Promise(resolve => setTimeout(resolve, 500));

            // Test connection
            const res = await axios.post(`${API_URL}/telegram/test`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setToast({
                message: res.data.message,
                type: res.data.success ? 'success' : 'error'
            });
        } catch (err) {
            console.error(err);
            setToast({ message: 'Failed to test connection. Check your network.', type: 'error' });
        } finally {
            setTestingConnection(false);
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

    const renderTelegramSection = () => {
        const items = settings.filter(s => s.category === 'telegram');

        if (items.length === 0) return null;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-border rounded-2xl p-6 mb-6 shadow-xl"
            >
                <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                        <MessageCircle className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Telegram Notifications</h2>
                </div>

                {/* Instructions */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                    <h3 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
                        <span>📱</span> Setup Instructions
                    </h3>
                    <ol className="text-sm text-textMuted space-y-2 list-decimal list-inside">
                        <li>Open Telegram and search for <code className="bg-black/30 px-2 py-0.5 rounded text-blue-300">@BotFather</code></li>
                        <li>Send <code className="bg-black/30 px-2 py-0.5 rounded text-blue-300">/newbot</code> and follow the instructions</li>
                        <li>Copy the bot token and paste it below</li>
                        <li>Start a chat with your new bot and send any message</li>
                        <li>Search for <code className="bg-black/30 px-2 py-0.5 rounded text-blue-300">@userinfobot</code> and get your Chat ID</li>
                        <li>Paste your Chat ID below and test the connection</li>
                    </ol>
                </div>

                {/* Input fields */}
                <div className="space-y-4 mb-6">
                    {items.map(setting => (
                        <div key={setting.key}>
                            <label className="block text-sm font-medium text-textMuted mb-2 group-hover:text-white transition-colors">
                                {setting.description}
                            </label>
                            <input
                                type={setting.key === 'TELEGRAM_BOT_TOKEN' ? 'password' : 'text'}
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white placeholder-textMuted focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all font-mono text-sm"
                                value={setting.value}
                                onChange={(e) => handleChange(setting.key, e.target.value)}
                                placeholder={setting.key === 'TELEGRAM_BOT_TOKEN' ? '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11' : '123456789'}
                            />
                        </div>
                    ))}
                </div>

                {/* Test Connection Button */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="flex items-center gap-2 px-4 py-3 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center"
                >
                    {testingConnection ? (
                        <>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"
                            />
                            Testing Connection...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            Test Connection
                        </>
                    )}
                </motion.button>

                {/* Notification Types */}
                <div className="mt-6 pt-6 border-t border-border/50">
                    <h3 className="font-semibold text-white mb-4">Active Notifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <NotificationToggle icon="🚨" label="Critical Markets (90%+ urgency)" enabled />
                        <NotificationToggle icon="💰" label="Trade Executions" enabled />
                        <NotificationToggle icon="📰" label="News/Signal Alerts" enabled />
                        <NotificationToggle icon="⭐" label="Favorite Market Triggers" enabled />
                    </div>
                    <p className="mt-4 text-xs text-textMuted">
                        💡 All notification types are currently enabled by default. Future updates will allow you to customize which notifications you receive.
                    </p>
                </div>
            </motion.div>
        );
    };

    function NotificationToggle({ icon, label, enabled }) {
        return (
            <div className="flex items-center gap-3 bg-background rounded-lg p-3 border border-border">
                <span className="text-2xl">{icon}</span>
                <span className="flex-1 text-sm text-white">{label}</span>
                <CheckCircle2 className={`w-5 h-5 ${enabled ? 'text-green-400' : 'text-gray-600'}`} />
            </div>
        );
    }
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
        {renderTelegramSection()}
        {renderSection('API Keys', Key, 'api')}
        {renderSection('Trading Limits', Activity, 'trading')}
        {renderSection('System', Shield, 'system')}
        {renderSection('Listener Configuration', Tag, 'listener')}
    </div>
);
}

export default Settings;
