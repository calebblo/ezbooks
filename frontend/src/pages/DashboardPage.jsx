import React, { useState, useEffect, useCallback, useId } from "react";
import {
  fetchReceipts,
  uploadReceipt,
  buildExportUrl,
  deleteReceipts,
  deleteAllReceipts,
  fetchCategories,
  createCategory,
  fetchJobs,
  createJob,
  updateReceiptField,
} from "../api/client.js"; // !!!!!! Backend API client

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const getDefaultExportDates = () => {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

export default function Dashboard({ onUploadSuccess }) {
  const [receipts, setReceipts] = useState([]); // [{id,date,vendor,amount,tax,category,card,job,status}]
  const [categories, setCategories] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportDates, setExportDates] = useState(getDefaultExportDates);
  const [isLoading, setIsLoading] = useState(false); // !!!!!! loading state
  const [isUploading, setIsUploading] = useState(false); // !!!!!! upload state
  const [error, setError] = useState(null); // !!!!!! error surface
  const [selectedIds, setSelectedIds] = useState([]); // !!!!!! selection state
  const [confirmDelete, setConfirmDelete] = useState(null); // {type: "selected"|"all"}

  const loadReceipts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [receiptsData, categoriesData, jobsData] = await Promise.all([
        fetchReceipts(),
        fetchCategories(),
        fetchJobs(),
      ]);
      setReceipts(Array.isArray(receiptsData) ? receiptsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setJobs(Array.isArray(jobsData) ? jobsData : []);
    } catch (err) {
      console.error("Failed to load data", err);
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleFiles = useCallback(
    async (files) => {
      if (!files.length) return;

      setIsUploading(true);
      setError(null);
      try {
        for (const file of files) {
          await uploadReceipt(file);
        }
        await loadReceipts();
        if (onUploadSuccess) onUploadSuccess();
      } catch (err) {
        console.error("Upload failed", err);
        setError("Upload failed. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [loadReceipts]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    handleFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const refreshReceipts = async () => {
    await loadReceipts();
    setSelectedIds([]);
  };

  const onExport = async (type) => {
    // type: "csv" | "pdf"
    console.log("Exporting", type, "for range", exportDates);
    const url = buildExportUrl(exportDates, type);
    window.location.href = url;
  };

  const toggleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (checked) {
        set.add(id);
      } else {
        set.delete(id);
      }
      return Array.from(set);
    });
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(receipts.map((r) => r.receiptId || r.id).filter(Boolean));
    } else {
      setSelectedIds([]);
    }
  };

  const onDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    setError(null);
    try {
      if (confirmDelete.type === "all") {
        await deleteAllReceipts();
        setSelectedIds([]);
      } else if (confirmDelete.type === "selected") {
        await deleteReceipts(selectedIds);
        setSelectedIds([]);
      }
      await loadReceipts();
    } catch (err) {
      console.error("Delete failed", err);
      setError("Delete failed. Please try again.");
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleUpdate = async (id, field, value) => {
    // Optimistic update
    setReceipts((prev) =>
      prev.map((r) =>
        (r.receiptId || r.id) === id ? { ...r, [field]: value } : r
      )
    );

    try {
      await updateReceiptField(id, { [field]: value });
    } catch (err) {
      console.error("Update failed", err);
      setError("Failed to update receipt");
      // Revert on failure (could be improved)
      await loadReceipts();
    }
  };

  const handleCreateCategory = async (name) => {
    try {
      const newCat = await createCategory({ name });
      setCategories((prev) => [...prev, newCat]);
      return newCat.name;
    } catch (err) {
      console.error("Failed to create category", err);
      setError("Failed to create category");
      return null;
    }
  };

  const handleCreateJob = async (name) => {
    try {
      const newJob = await createJob({ name });
      setJobs((prev) => [...prev, newJob]);
      return newJob.name;
    } catch (err) {
      console.error("Failed to create job", err);
      setError("Failed to create job");
      return null;
    }
  };

  // Simple derived stats (swap for real stats API if you have one)
  const totalReceipts = receipts.length;
  const pendingCount = receipts.filter((r) => {
    const status = (r.status || "").toUpperCase();
    return status.includes("PEND") || status === "UPLOADED";
  }).length;
  const thisMonthTotal = receipts
    .filter((r) => {
      if (!r.date) return false;
      const d = new Date(r.date);
      const now = new Date();
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const lastMonthTotal = receipts
    .filter((r) => {
      if (!r.date) return false;
      const d = new Date(r.date);
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        d.getMonth() === lastMonth.getMonth() &&
        d.getFullYear() === lastMonth.getFullYear()
      );
    })
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const topVendor = React.useMemo(() => {
    const vendorSpend = {};
    receipts.forEach((r) => {
      const v = r.vendorId || "Unknown";
      vendorSpend[v] = (vendorSpend[v] || 0) + (Number(r.amount) || 0);
    });
    let maxSpend = 0;
    let bestVendor = "—";
    Object.entries(vendorSpend).forEach(([vendor, spend]) => {
      if (spend > maxSpend) {
        maxSpend = spend;
        bestVendor = vendor;
      }
    });
    return bestVendor;
  }, [receipts]);

  const chartData = React.useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString("default", { month: "short" });
      const year = d.getFullYear();
      const month = d.getMonth();

      const total = receipts
        .filter((r) => {
          if (!r.date) return false;
          const rd = new Date(r.date);
          return rd.getMonth() === month && rd.getFullYear() === year;
        })
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

      data.push({ name: monthLabel, amount: total });
    }
    return data;
  }, [receipts]);

  const formatAmount = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? `$${num.toFixed(2)}` : "—";
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString().slice(0, 10);
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white flex flex-col">
      {/* Top brand bar */}
      <header className="w-full border-b border-white/10 bg-[#050816]/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white">
              Ez
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight text-white">
                EzBooks
              </div>
              <div className="text-xs text-gray-400">
                Smart Receipt Management for Small Business
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex gap-6">
          {/* LEFT SIDEBAR */}
          <aside className="w-72 shrink-0 space-y-4">
            {/* Quick Stats */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wide flex items-center gap-2 px-1 text-gray-200">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(248,113,113,0.7)]" />
                Quick Stats
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex flex-col justify-between hover:bg-white/[0.07] transition">
                  <div className="text-xs text-gray-400 mb-1">Pending</div>
                  <div className="text-lg font-semibold text-white">{pendingCount}</div>
                  <div className="text-[10px] text-amber-400/80 mt-1">Action needed</div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex flex-col justify-between hover:bg-white/[0.07] transition">
                  <div className="text-xs text-gray-400 mb-1">This Month</div>
                  <div className="text-lg font-semibold text-white">{formatAmount(thisMonthTotal)}</div>
                  <div className="text-[10px] text-emerald-400/80 mt-1">Total spend</div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex flex-col justify-between hover:bg-white/[0.07] transition">
                  <div className="text-xs text-gray-400 mb-1">Last Month</div>
                  <div className="text-lg font-semibold text-white">{formatAmount(lastMonthTotal)}</div>
                  <div className="text-[10px] text-gray-500 mt-1">Comparison</div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex flex-col justify-between hover:bg-white/[0.07] transition">
                  <div className="text-xs text-gray-400 mb-1">Top Vendor</div>
                  <div className="text-sm font-semibold text-white truncate" title={topVendor}>{topVendor}</div>
                  <div className="text-[10px] text-indigo-400/80 mt-1">Highest spend</div>
                </div>
              </div>
            </section>

            {/* Spending Trends Chart */}
            <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <h2 className="text-sm font-semibold tracking-wide flex items-center gap-2 mb-3 text-gray-200">
                <span className="text-xs">📊</span> Spending Trends
              </h2>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#9ca3af"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#1e293b",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#f8fafc",
                      }}
                      itemStyle={{ color: "#818cf8" }}
                      formatter={(value) => [`$${value.toFixed(2)}`, "Spend"]}
                    />
                    <Bar
                      dataKey="amount"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-200">
                <span className="text-xs">⚡</span> Quick Actions
              </h2>

              <button
                onClick={() => setIsExportOpen(true)}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-3 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-900/40 hover:brightness-110 transition text-white"
              >
                Export to Accountant
              </button>

              <button
                onClick={() => window.location.href = "/vendors"}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/10 transition"
              >
                Manage Vendors
              </button>
              <button
                onClick={() => window.location.href = "/jobs"}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/10 transition"
              >
                Manage Jobs
              </button>
            </section>

            {/* Favorites */}
            <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-200">
                <span className="text-yellow-400 text-base">★</span> Favorites
              </h2>
              <p className="text-xs text-gray-400">
                Pin your most-used vendors, cards, or jobs here for quick
                access.
              </p>
            </section>
          </aside>

          {/* MAIN AREA */}
          <section className="flex-1 flex flex-col gap-5">
            {error && (
              <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 text-rose-100 px-4 py-3 text-sm">
                {error}
              </div>
            )}
            {isUploading && (
              <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 text-indigo-100 px-4 py-3 text-sm">
                Uploading receipts…
              </div>
            )}

            {/* Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative rounded-3xl border-2 border-dashed ${isDragging
                ? "border-indigo-400 bg-indigo-500/10"
                : "border-white/10 bg-white/5"
                } px-6 py-10 flex flex-col items-center justify-center transition hover:bg-white/[0.07]`}
            >
              <div className="absolute inset-0 rounded-3xl pointer-events-none border border-white/5" />
              <div className="flex flex-col items-center gap-4 text-center relative z-10">
                <div className="text-5xl">📷</div>
                <div>
                  <h2 className="text-xl font-semibold mb-1 text-white">
                    Drop Receipts Here
                  </h2>
                  <p className="text-sm text-gray-400">
                    or click to browse files
                  </p>
                </div>

                <label className="mt-2 inline-flex cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-900/40 hover:brightness-110 transition text-white">
                  Choose Files
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) =>
                      handleFiles(Array.from(e.target.files || []))
                    }
                  />
                </label>
              </div>
            </div>

            {/* Receipts Table Card */}
            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <h2 className="text-sm font-semibold flex items-center gap-2 text-white">
                  <span className="text-base">🧾</span> Receipts
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setConfirmDelete({ type: "selected" })
                    }
                    disabled={selectedIds.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-100 hover:bg-rose-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🗑 Delete Selected
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: "all" })}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-100 hover:bg-rose-500/20 transition"
                  >
                    🗑 Delete All
                  </button>
                  <button
                    onClick={refreshReceipts}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/10 transition"
                  >
                    <span className="text-xs">⟳</span>
                    Refresh
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead className="bg-white/5 text-gray-400 text-left uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          className="h-3 w-3 accent-indigo-500"
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          checked={
                            receipts.length > 0 &&
                            selectedIds.length === receipts.length
                          }
                        />
                      </th>
                      <Th>Date</Th>
                      <Th>Vendor</Th>
                      <Th>Amount</Th>
                      <Th>Tax</Th>
                      <Th>Category</Th>
                      <Th>Card</Th>
                      <Th>Job</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-6 py-8 text-center text-xs text-gray-500"
                        >
                          Loading receipts…
                        </td>
                      </tr>
                    ) : receipts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-6 py-8 text-center text-xs text-gray-500"
                        >
                          No receipts yet. Upload some to get started!
                        </td>
                      </tr>
                    ) : (
                      receipts.map((r) => {
                        const statusLabel = r.status || "Processed";
                        const statusClass =
                          statusLabel.toUpperCase().includes("PEND") ||
                            statusLabel === "UPLOADED"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";

                        return (
                          <tr
                            key={r.receiptId || r.id}
                            className="border-t border-white/5 hover:bg-white/[0.02] transition even:bg-white/[0.01]"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                className="h-3 w-3 accent-indigo-500"
                                checked={selectedIds.includes(r.receiptId || r.id)}
                                onChange={(e) =>
                                  toggleSelect(r.receiptId || r.id, e.target.checked)
                                }
                              />
                            </td>
                            <Td>{formatDate(r.date)}</Td>
                            <Td className="font-medium text-gray-200">{r.vendorId || "—"}</Td>
                            <Td className="font-medium">{formatAmount(r.amount)}</Td>
                            <Td className="text-gray-400">{formatAmount(r.taxAmount)}</Td>
                            <Td>
                              <EditableSelect
                                value={r.category}
                                options={categories.map((c) => c.name)}
                                onSelect={(val) =>
                                  handleUpdate(r.receiptId || r.id, "category", val)
                                }
                                onCreate={handleCreateCategory}
                                placeholder="Category"
                              />
                            </Td>
                            <Td>{r.cardId || "—"}</Td>
                            <Td>
                              <EditableSelect
                                value={r.jobId}
                                options={jobs.map((j) => j.name)}
                                onSelect={(val) =>
                                  handleUpdate(r.receiptId || r.id, "jobId", val)
                                }
                                onCreate={handleCreateJob}
                                placeholder="Job"
                              />
                            </Td>
                            <Td>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusClass}`}
                              >
                                {statusLabel}
                              </span>
                            </Td>
                            <Td className="text-right">
                              <a
                                href={r.imageUrl || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-medium text-gray-300 hover:bg-white/10 hover:text-white transition"
                              >
                                View
                              </a>
                            </Td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* EXPORT MODAL */}
      {isExportOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsExportOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl">📁</span>
              <h2 className="text-xl font-semibold">Export Receipts</h2>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium mb-1 text-slate-300">
                  Start Date
                </label>
                <input
                  type="date"
                  value={exportDates.start}
                  onChange={(e) =>
                    setExportDates((prev) => ({
                      ...prev,
                      start: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-slate-300">
                  End Date
                </label>
                <input
                  type="date"
                  value={exportDates.end}
                  onChange={(e) =>
                    setExportDates((prev) => ({
                      ...prev,
                      end: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onExport("csv")}
                className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-900/50 hover:brightness-110 transition"
              >
                📊 Export CSV
              </button>
              <button
                onClick={() => onExport("pdf")}
                className="flex-1 rounded-2xl bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 text-sm font-semibold hover:bg-slate-700/80 transition"
              >
                📄 Export PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800/80 shadow-2xl p-6 relative">
            <button
              onClick={() => setConfirmDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-2 text-white">Confirm Delete</h2>
            <p className="text-sm text-slate-300 mb-6">
              {confirmDelete.type === "all"
                ? "Are you sure you want to delete all entries?"
                : `Are you sure you want to delete ${selectedIds.length} selected item(s)?`}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onDeleteConfirmed}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 transition"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-700/80 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Small helper components for cleaner JSX */

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={`px-4 py-3 font-medium ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={`px-4 py-3 text-gray-300 text-xs align-middle ${className}`}>
      {children}
    </td>
  );
}

function EditableSelect({ value, options = [], onSelect, onCreate, placeholder }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || "");
  const id = useId(); // Unique ID for datalist

  useEffect(() => {
    setTempValue(value || "");
  }, [value]);

  const startEditing = () => {
    setIsEditing(true);
  };

  const commit = async () => {
    setIsEditing(false);
    if (tempValue === value) return; // No change

    // Check if new value
    const isNew = onCreate && tempValue && !options.includes(tempValue);

    if (isNew) {
      // Create new category
      await onCreate(tempValue);
    }

    onSelect(tempValue);
  };

  if (isEditing) {
    return (
      <div className="relative">
        <input
          list={id}
          className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur(); // Triggers commit
            }
            if (e.key === "Escape") {
              setTempValue(value || "");
              setIsEditing(false);
            }
          }}
          autoFocus
          placeholder={placeholder}
        />
        <datalist id={id}>
          {options.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      </div>
    );
  }

  return (
    <div
      onClick={startEditing}
      className="cursor-pointer hover:text-indigo-400 transition flex items-center gap-1 group min-h-[20px]"
    >
      <span>{value || <span className="text-slate-600 italic">{placeholder}</span>}</span>
      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-500">
        ✎
      </span>
    </div>
  );
}

// Helper hook for unique IDs if not available in React version, 
// but React 18 has useId. If not, simple random string.

