import React from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Radio } from 'lucide-react';

function Markets() {
    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Polymarket Radar</h1>
                    <p className="text-textMuted">Real-time monitoring of Trump & Musk markets.</p>
                </div>
                <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-2 rounded-full border border-green-500/20">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-bold">Scanning Active</span>
                </div>
            </div>

            {/* Filters Bar */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-border rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-center"
            >
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted" />
                    <input
                        type="text"
                        placeholder="Search markets..."
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-surfaceHighlight rounded-xl text-textMuted hover:text-white transition-colors">
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                </button>
            </motion.div>

            {/* Empty State / Placeholder */}
            <div className="bg-surface border border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 bg-surfaceHighlight rounded-full flex items-center justify-center mb-6">
                    <Radio className="w-10 h-10 text-textMuted" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Markets Detected Yet</h3>
                <p className="text-textMuted max-w-md mx-auto">
                    The radar is active and scanning for new markets related to Elon Musk or Donald Trump.
                    New detections will appear here automatically.
                </p>
            </div>
        </div>
    );
}

export default Markets;
