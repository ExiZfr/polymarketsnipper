import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Shield, Key, Activity, Rss, Twitter } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Settings({ token }) {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Mock initial settings if DB is empty
    const defaultSettings = [
        { key: 'POLYMARKET_API_KEY', value: '', category: 'api', description: 'Polymarket API Key' },
        { key: 'TWITTER_API_KEY', value: '', category: 'api', description: 'X/Twitter API Key (Optional)' },
        { key: 'TELEGRAM_BOT_TOKEN', value: '', category: 'api', description: 'Telegram Bot Token' },
        { key: 'MAX_DAILY_LOSS', value: '100', category: 'trading', description: 'Max Daily Loss ($)' },
        { key: 'MAX_POSITION_SIZE', value: '10', category: 'trading', description: 'Max Position Size ($)' },
        { key: 'LATENCY_TARGET_MS', value: '300', category: 'system', description: 'Target Latency (ms)' },
        { key: 'RSS_FEEDS', value: 'https://news.google.com/rss, https://finance.yahoo.com/news/rssindex', category: 'listener', description: 'RSS Feeds (comma separated)' },
        { key: 'TWITTER_HANDLES', value: 'realDonaldTrump, elonmusk, JoeBiden', category: 'listener', description: 'Twitter Handles (comma separated)' },
    ];

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_URL}/settings/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Merge defaults with DB results
            const dbSettings = res.data;
            const merged = defaultSettings.map(def => {
                const found = dbSettings.find(s => s.key === def.key);
                return found ? found : def;
            });
            setSettings(merged);
        } catch (err) {
            console.error(err);
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
            // Show success toast (mock)
            alert('Settings saved successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to save settings.');
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
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {items.map((setting) => (
                        <div key={setting.key} className={setting.key.includes('RSS') || setting.key.includes('HANDLES') ? "md:col-span-2" : ""}>
                            <label className="block text-sm font-medium text-textMuted mb-2">
                                {setting.description}
                            </label>
                            {setting.key.includes('RSS') || setting.key.includes('HANDLES') ? (
                                <textarea
                                    value={setting.value}
                                    onChange={(e) => handleChange(setting.key, e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all min-h-[100px]"
                                    placeholder={`Enter ${setting.description}`}
                                />
                            ) : (
                                <input
                                    type={setting.key.includes('KEY') || setting.key.includes('TOKEN') ? 'password' : 'text'}
                                    value={setting.value}
                                    onChange={(e) => handleChange(setting.key, e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                    placeholder={`Enter ${setting.description}`}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>
        );
    };

    if (loading) return <div className="text-center p-10 text-textMuted">Loading settings...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                    <p className="text-textMuted">Manage your bot configuration and risk parameters.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary hover:bg-primaryHover text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-primary/25"
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {renderSection('Social Listener Configuration', Rss, 'listener')}
            {renderSection('API Configuration', Key, 'api')}
            {renderSection('Trading & Risk', Shield, 'trading')}
            {renderSection('System Parameters', Activity, 'system')}
        </div>
    );
}

export default Settings;
