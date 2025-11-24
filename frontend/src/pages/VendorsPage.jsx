import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchVendors, createVendor, deleteVendor } from "../api/client";

export default function VendorsPage() {
    const [vendors, setVendors] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newVendorName, setNewVendorName] = useState("");

    const loadVendors = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchVendors();
            setVendors(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load vendors", err);
            setError("Failed to load vendors");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadVendors();
    }, []);

    const handleAddVendor = async (e) => {
        e.preventDefault();
        if (!newVendorName.trim()) return;

        try {
            await createVendor({ name: newVendorName });
            setNewVendorName("");
            await loadVendors();
        } catch (err) {
            console.error("Failed to create vendor", err);
            setError("Failed to create vendor");
        }
    };

    const handleDeleteVendor = async (id) => {
        if (!window.confirm("Are you sure you want to delete this vendor?")) return;
        try {
            await deleteVendor(id);
            await loadVendors();
        } catch (err) {
            console.error("Failed to delete vendor", err);
            setError("Failed to delete vendor");
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col">
            {/* Header */}
            <header className="w-full border-b border-slate-800/70 bg-gradient-to-r from-indigo-700/40 via-purple-700/30 to-indigo-700/40 backdrop-blur-lg">
                <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Link to="/dashboard" className="text-slate-300 hover:text-white transition">
                            ← Back to Dashboard
                        </Link>
                    </div>
                    <div className="text-lg font-semibold tracking-tight">Manage Vendors</div>
                </div>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
                {error && (
                    <div className="mb-6 rounded-xl border border-rose-500/50 bg-rose-500/10 text-rose-100 px-4 py-3 text-sm">
                        {error}
                    </div>
                )}

                {/* Add Vendor Form */}
                <section className="mb-8 rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6">
                    <h2 className="text-lg font-semibold mb-4">Add New Vendor</h2>
                    <form onSubmit={handleAddVendor} className="flex gap-3">
                        <input
                            type="text"
                            value={newVendorName}
                            onChange={(e) => setNewVendorName(e.target.value)}
                            placeholder="Vendor Name"
                            className="flex-1 rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            type="submit"
                            disabled={!newVendorName.trim()}
                            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold hover:bg-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add Vendor
                        </button>
                    </form>
                </section>

                {/* Vendors List */}
                <section className="rounded-2xl bg-slate-900/80 border border-slate-800/80 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-800/80">
                        <h2 className="text-lg font-semibold">Existing Vendors</h2>
                    </div>

                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500">Loading vendors...</div>
                    ) : vendors.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No vendors found.</div>
                    ) : (
                        <div className="divide-y divide-slate-800/70">
                            {vendors.map((vendor) => (
                                <div key={vendor.vendorId} className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/30 transition">
                                    <div>
                                        <div className="font-medium text-slate-200">{vendor.name}</div>
                                        {vendor.defaultCategory && (
                                            <div className="text-xs text-slate-500">Default Category: {vendor.defaultCategory}</div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteVendor(vendor.vendorId)}
                                        className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
