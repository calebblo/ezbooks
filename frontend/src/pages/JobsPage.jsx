import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchJobs, createJob, deleteJob } from "../api/client";

export default function JobsPage() {
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newJobName, setNewJobName] = useState("");

    const loadJobs = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchJobs();
            setJobs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load jobs", err);
            setError("Failed to load jobs");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadJobs();
    }, []);

    const handleAddJob = async (e) => {
        e.preventDefault();
        if (!newJobName.trim()) return;

        try {
            await createJob({ name: newJobName });
            setNewJobName("");
            await loadJobs();
        } catch (err) {
            console.error("Failed to create job", err);
            setError("Failed to create job");
        }
    };

    const handleDeleteJob = async (id) => {
        if (!window.confirm("Are you sure you want to delete this job?")) return;
        try {
            await deleteJob(id);
            await loadJobs();
        } catch (err) {
            console.error("Failed to delete job", err);
            setError("Failed to delete job");
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
                    <div className="text-lg font-semibold tracking-tight">Manage Jobs</div>
                </div>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
                {error && (
                    <div className="mb-6 rounded-xl border border-rose-500/50 bg-rose-500/10 text-rose-100 px-4 py-3 text-sm">
                        {error}
                    </div>
                )}

                {/* Add Job Form */}
                <section className="mb-8 rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6">
                    <h2 className="text-lg font-semibold mb-4">Add New Job</h2>
                    <form onSubmit={handleAddJob} className="flex gap-3">
                        <input
                            type="text"
                            value={newJobName}
                            onChange={(e) => setNewJobName(e.target.value)}
                            placeholder="Job Name"
                            className="flex-1 rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            type="submit"
                            disabled={!newJobName.trim()}
                            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold hover:bg-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add Job
                        </button>
                    </form>
                </section>

                {/* Jobs List */}
                <section className="rounded-2xl bg-slate-900/80 border border-slate-800/80 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-800/80">
                        <h2 className="text-lg font-semibold">Existing Jobs</h2>
                    </div>

                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500">Loading jobs...</div>
                    ) : jobs.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No jobs found.</div>
                    ) : (
                        <div className="divide-y divide-slate-800/70">
                            {jobs.map((job) => (
                                <div key={job.jobId} className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/30 transition">
                                    <div>
                                        <div className="font-medium text-slate-200">{job.name}</div>
                                        {job.clientName && (
                                            <div className="text-xs text-slate-500">Client: {job.clientName}</div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteJob(job.jobId)}
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
