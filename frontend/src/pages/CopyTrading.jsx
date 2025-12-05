import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Copy, Plus, TrendingUp, TrendingDown, Wallet as WalletIcon, X, Search, Filter } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function CopyTrading() {
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newWallet, setNewWallet] = useState({ address: '', nickname: '' });
    const [filter, setFilter] = useState('all'); // all, favorites, copying
    const [searchQuery, setSearchQuery] = useState('');
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchWallets();
        const interval = setInterval(fetchWallets, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchWallets = async () => {
        try {
            const res = await axios.get(`${API_URL}/copy-trading/wallets`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWallets(res.data);
        } catch (error) {
            console.error('Failed to fetch wallets:', error);
        } finally {
            setLoading(false);
        }
    };

    const addWallet = async () => {
        if (!newWallet.address.match(/^0x[a-fA-F0-9]{40}$/)) {
            alert('Invalid wallet address');
            return;
        }
        try {
            await axios.post(`${API_URL}/copy-trading/wallets`, newWallet, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowAddDialog(false);
            setNewWallet({ address: '', nickname: '' });
            fetchWallets();
        } catch (error) {
            alert(error.response?.data?.detail || 'Failed to add wallet');
        }
    };

    const updateWallet = async (id, updates) => {
        try {
            await axios.put(`${API_URL}/copy-trading/wallets/${id}`, updates, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchWallets();
        } catch (error) {
            console.error('Failed to update wallet:', error);
        }
    };

    const deleteWallet = async (id) => {
        if (!confirm('Remove this wallet?')) return;
        try {
            await axios.delete(`${API_URL}/copy-trading/wallets/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchWallets();
        } catch (error) {
            console.error('Failed to delete wallet:', error);
        }
    };

    const filteredWallets = wallets.filter(w => {
        if (filter === 'favorites' && !w.is_favorite) return false;
        if (filter === 'copying' && !w.is_copying) return false;
        if (searchQuery && !w.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !w.address.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="min-h-screen p-8 bg-dark">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent mb-2">
                        Copy Trading
                    </h1>
                    <p className="text-text-secondary">Track and copy top Polymarket traders</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAddDialog(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold shadow-lg hover:shadow-purple-500/50 transition-shadow"
                >
                    <Plus size={20} />
                    Add Wallet
                </motion.button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                    <input
                        type="text"
                        placeholder="Search wallets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-surface border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <div className="flex gap-2 bg-surface border border-border rounded-xl p-1">
                    {['all', 'favorites', 'copying'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === f
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                    : 'text-text-secondary hover:text-text'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Wallets Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full"
                    />
                </div>
            ) : filteredWallets.length === 0 ? (
                <div className="text-center py-20 text-text-secondary">
                    <WalletIcon size={64} className="mx-auto mb-4 opacity-50" />
                    <p className="text-xl">No wallets found</p>
                    <p className="mt-2">Add a wallet to start copy trading</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWallets.map((wallet) => (
                        <WalletCard
                            key={wallet.id}
                            wallet={wallet}
                            onUpdate={updateWallet}
                            onDelete={deleteWallet}
                        />
                    ))}
                </div>
            )}

            {/* Add Wallet Dialog */}
            <AnimatePresence>
                {showAddDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowAddDialog(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-surface border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-text">Add Wallet</h2>
                                <button
                                    onClick={() => setShowAddDialog(false)}
                                    className="text-text-secondary hover:text-text"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">
                                        Wallet Address
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="0x..."
                                        value={newWallet.address}
                                        onChange={(e) => setNewWallet({ ...newWallet, address: e.target.value })}
                                        className="w-full px-4 py-3 bg-dark border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">
                                        Nickname (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Top Trader"
                                        value={newWallet.nickname}
                                        onChange={(e) => setNewWallet({ ...newWallet, nickname: e.target.value })}
                                        className="w-full px-4 py-3 bg-dark border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={addWallet}
                                className="w-full mt-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold shadow-lg hover:shadow-purple-500/50 transition-shadow"
                            >
                                Add Wallet
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Wallet Card Component
function WalletCard({ wallet, onUpdate, onDelete }) {
    const [flipped, setFlipped] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            whileHover={{ y: -4 }}
            className="relative h-64"
            style={{ perspective: '1000px' }}
        >
            <motion.div
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.6 }}
                className="relative w-full h-full"
                style={{ transformStyle: 'preserve-3d' }}
                onClick={() => setFlipped(!flipped)}
            >
                {/* Front */}
                <div
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-surface to-surface/50 backdrop-blur-xl border border-border shadow-xl p-6 cursor-pointer"
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-text truncate">
                                {wallet.nickname || `${wallet.address.substring(0, 6)}...${wallet.address.slice(-4)}`}
                            </h3>
                            <p className="text-sm text-text-secondary truncate">{wallet.address}</p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdate(wallet.id, { is_favorite: !wallet.is_favorite });
                            }}
                            className="ml-2"
                        >
                            <Star
                                size={20}
                                className={wallet.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-text-secondary'}
                            />
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Total Profit</span>
                            <span className={`text-xl font-bold ${wallet.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {wallet.total_profit >= 0 ? <TrendingUp size={16} className="inline mr-1" /> : <TrendingDown size={16} className="inline mr-1" />}
                                ${Math.abs(wallet.total_profit).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Win Rate</span>
                            <span className="text-lg font-semibold text-text">{wallet.win_rate}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Total Trades</span>
                            <span className="text-lg font-semibold text-text">{wallet.total_trades}</span>
                        </div>
                    </div>

                    {/* Copy Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onUpdate(wallet.id, { is_copying: !wallet.is_copying });
                        }}
                        className={`absolute bottom-6 left-6 right-6 py-3 rounded-xl font-semibold transition-all ${wallet.is_copying
                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/50'
                                : 'bg-dark border-2 border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white'
                            }`}
                    >
                        {wallet.is_copying ? (
                            <>
                                <Copy size={16} className="inline mr-2" />
                                Copying Active
                            </>
                        ) : (
                            'Start Copying'
                        )}
                    </button>
                </div>

                {/* Back */}
                <div
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-border shadow-xl p-6 cursor-pointer"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                    <h3 className="text-lg font-bold text-text mb-4">Recent Activity</h3>
                    <div className="space-y-2 text-sm text-text-secondary mb-4">
                        <p>• Last synced: {wallet.last_synced ? new Date(wallet.last_synced).toLocaleString() : 'Never'}</p>
                        <p>• Added: {new Date(wallet.created_at).toLocaleDateString()}</p>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(wallet.id);
                        }}
                        className="absolute bottom-6 left-6 right-6 py-3 bg-red-500/20 border border-red-500 text-red-500 rounded-xl font-semibold hover:bg-red-500 hover:text-white transition-all"
                    >
                        Remove Wallet
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
