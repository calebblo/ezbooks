import React from 'react';

export default function PricingModal({ isOpen, onClose, currentTier }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl max-w-4xl w-full p-8 shadow-2xl shadow-indigo-500/20 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    ✕
                </button>

                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-white mb-2">
                        Upgrade Your Experience
                    </h2>
                    <p className="text-gray-400">
                        Choose the plan that fits your business needs.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Free Tier */}
                    <div className={`rounded-xl p-6 border ${currentTier === "FREE" ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 bg-white/5"} flex flex-col`}>
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-white">Free</h3>
                            <div className="text-2xl font-bold text-white mt-2">$0<span className="text-sm text-gray-400 font-normal">/mo</span></div>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2 text-sm text-gray-300">
                                <span className="text-emerald-400">✓</span> 20 Uploads/mo
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-300">
                                <span className="text-emerald-400">✓</span> Basic Stats
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-300">
                                <span className="text-emerald-400">✓</span> 7-Day History
                            </li>
                        </ul>
                        <button
                            disabled={currentTier === "FREE"}
                            className="w-full py-2 rounded-lg border border-white/10 text-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {currentTier === "FREE" ? "Current Plan" : "Downgrade"}
                        </button>
                    </div>

                    {/* Pro Tier */}
                    <div className={`rounded-xl p-6 border ${currentTier === "PRO" ? "border-indigo-500 bg-indigo-500/10" : "border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-purple-500/10"} flex flex-col relative transform scale-105 shadow-xl`}>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                            MOST POPULAR
                        </div>
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-white">Pro</h3>
                            <div className="text-2xl font-bold text-white mt-2">$9.99<span className="text-sm text-gray-400 font-normal">/mo</span></div>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2 text-sm text-white">
                                <span className="text-emerald-400">✓</span> Unlimited Uploads
                            </li>
                            <li className="flex items-center gap-2 text-sm text-white">
                                <span className="text-emerald-400">✓</span> Advanced Analytics
                            </li>
                            <li className="flex items-center gap-2 text-sm text-white">
                                <span className="text-emerald-400">✓</span> Priority Support
                            </li>
                            <li className="flex items-center gap-2 text-sm text-white">
                                <span className="text-emerald-400">✓</span> Export to CSV/PDF
                            </li>
                        </ul>
                        <button
                            disabled={currentTier === "PRO"}
                            onClick={() => alert("Payment flow would start here!")}
                            className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold hover:brightness-110 transition shadow-lg shadow-indigo-500/25"
                        >
                            {currentTier === "PRO" ? "Current Plan" : "Upgrade Now"}
                        </button>
                    </div>

                    {/* Enterprise Tier */}
                    <div className={`rounded-xl p-6 border ${currentTier === "ENTERPRISE" ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 bg-white/5"} flex flex-col`}>
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-white">Enterprise</h3>
                            <div className="text-2xl font-bold text-white mt-2">Custom</div>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2 text-sm text-gray-300">
                                <span className="text-emerald-400">✓</span> Everything in Pro
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-300">
                                <span className="text-emerald-400">✓</span> Custom Integrations
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-300">
                                <span className="text-emerald-400">✓</span> Dedicated Account Manager
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-300">
                                <span className="text-emerald-400">✓</span> SLA Guarantees
                            </li>
                        </ul>
                        <button
                            onClick={() => window.open("mailto:sales@ezbooks.com")}
                            className="w-full py-2 rounded-lg border border-white/10 text-white text-sm font-medium hover:bg-white/5 transition"
                        >
                            Contact Sales
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
