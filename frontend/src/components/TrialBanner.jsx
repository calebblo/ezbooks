import React, { useState } from 'react';

export default function UsageBanner({ usage, limit, tier, onUpgrade }) {
    const [isVisible, setIsVisible] = useState(true);

    // Only show for FREE tier
    if (!isVisible || tier !== "FREE") return null;

    const remaining = limit - usage;
    const isLow = remaining <= 5;

    return (
        <div className={`fixed bottom-6 right-6 z-[100] max-w-sm w-full backdrop-blur-xl border rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4 transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in ${isLow
                ? "bg-amber-500/10 border-amber-500/20 shadow-amber-500/10"
                : "bg-[#0f172a]/90 border-indigo-500/20 shadow-indigo-500/20"
            }`}>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    <span className={`font-bold text-sm ${isLow ? "text-amber-200" : "text-white"}`}>
                        Free Plan
                    </span>
                </div>
                <div className="text-xs text-gray-400">
                    <span className={`${isLow ? "text-amber-100 font-bold" : "text-indigo-200"}`}>
                        {usage} / {limit}
                    </span> uploads used this month
                </div>
                <div className="w-full bg-gray-700/50 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${isLow ? "bg-amber-500" : "bg-indigo-500"}`}
                        style={{ width: `${Math.min((usage / limit) * 100, 100)}%` }}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
                <button
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition shadow-lg ${isLow
                            ? "bg-amber-500 text-black hover:bg-amber-400"
                            : "bg-indigo-600 text-white hover:bg-indigo-500"
                        }`}
                    onClick={onUpgrade}
                >
                    Upgrade
                </button>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-[10px] text-gray-500 hover:text-white underline decoration-gray-700 underline-offset-2 text-center"
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}
