import React, { useState, useEffect, useCallback } from "react";

const getDefaultExportDates = () => {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

export default function Dashboard() {
  const [receipts, setReceipts] = useState([]); // [{id,date,vendor,amount,tax,category,card,job,status}]
  const [isDragging, setIsDragging] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportDates, setExportDates] = useState(getDefaultExportDates);

  // ---- TODO: replace with real backend fetch ----
  useEffect(() => {
    // example dummy data – delete when you hook up your API
    // fetch("/api/receipts").then(res => res.json()).then(setReceipts);
    setReceipts([]);
  }, []);
  // ------------------------------------------------

  const handleFiles = useCallback(async (files) => {
    if (!files.length) return;

    // TODO: call your upload endpoint here
    // const formData = new FormData();
    // files.forEach(f => formData.append("receipts", f));
    // await fetch("/api/receipts/upload", { method: "POST", body: formData });
    console.log("Uploading files:", files);

    // After upload, refresh list from backend
    // const updated = await fetch("/api/receipts").then(r => r.json());
    // setReceipts(updated);
  }, []);

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
    // TODO: hit your backend refresh route
    // const updated = await fetch("/api/receipts").then(r => r.json());
    // setReceipts(updated);
    console.log("Refreshing receipts…");
  };

  const onExport = async (type) => {
    // type: "csv" | "pdf"
    console.log("Exporting", type, "for range", exportDates);

    // Example:
    // const params = new URLSearchParams(exportDates);
    // window.location.href = `/api/receipts/export/${type}?${params.toString()}`;
  };

  // Simple derived stats (swap for real stats API if you have one)
  const totalReceipts = receipts.length;
  const pendingCount = receipts.filter((r) => r.status === "Pending").length;
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
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col">
      {/* Top brand bar */}
      <header className="w-full border-b border-slate-800/70 bg-gradient-to-r from-indigo-700/40 via-purple-700/30 to-indigo-700/40 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold">
              E2
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">
                E2Books
              </div>
              <div className="text-xs text-slate-300/70">
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
            <section className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-4">
              <h2 className="text-sm font-semibold tracking-wide flex items-center gap-2 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(248,113,113,0.7)]" />
                Quick Stats
              </h2>
              <div className="space-y-3 text-sm">
                <StatRow label="Pending" value={pendingCount} />
                <StatRow
                  label="This Month"
                  value={
                    thisMonthTotal
                      ? `$${thisMonthTotal.toFixed(2)}`
                      : "$0.00"
                  }
                />
                <StatRow label="Total Receipts" value={totalReceipts} />
              </div>
            </section>

            {/* Quick Actions */}
            <section className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-4 space-y-3">
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <span className="text-xs">⚡</span> Quick Actions
              </h2>

              <button
                onClick={() => setIsExportOpen(true)}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-3 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-900/40 hover:brightness-110 transition"
              >
                Export to Accountant
              </button>

              <button className="w-full rounded-xl bg-slate-800/80 px-3 py-2.5 text-sm font-medium text-slate-100/90 hover:bg-slate-700/80 transition">
                Manage Vendors
              </button>
              <button className="w-full rounded-xl bg-slate-800/80 px-3 py-2.5 text-sm font-medium text-slate-100/90 hover:bg-slate-700/80 transition">
                Manage Jobs
              </button>
            </section>

            {/* Favorites */}
            <section className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-4">
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <span className="text-yellow-400 text-base">★</span> Favorites
              </h2>
              <p className="text-xs text-slate-400">
                Pin your most-used vendors, cards, or jobs here for quick
                access.
              </p>
            </section>
          </aside>

          {/* MAIN AREA */}
          <section className="flex-1 flex flex-col gap-5">
            {/* Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative rounded-3xl border-2 border-dashed ${
                isDragging
                  ? "border-indigo-400 bg-indigo-500/5"
                  : "border-indigo-500/50 bg-slate-900/70"
              } px-6 py-10 flex flex-col items-center justify-center transition`}
            >
              <div className="absolute inset-0 rounded-3xl pointer-events-none border border-indigo-500/20" />
              <div className="flex flex-col items-center gap-4 text-center relative z-10">
                <div className="text-5xl">📷</div>
                <div>
                  <h2 className="text-xl font-semibold mb-1">
                    Drop Receipts Here
                  </h2>
                  <p className="text-sm text-slate-300/80">
                    or click to browse files
                  </p>
                </div>

                <label className="mt-2 inline-flex cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-900/40 hover:brightness-110 transition">
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
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <span className="text-base">🧾</span> Receipts
                </h2>
                <button
                  onClick={refreshReceipts}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/70 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                >
                  <span className="text-xs">⟳</span>
                  Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead className="bg-slate-900/80 text-slate-400 text-left">
                    <tr>
                      <th className="px-4 py-2 w-8">
                        <input
                          type="checkbox"
                          className="h-3 w-3 accent-indigo-500"
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
                    {receipts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-6 text-center text-xs text-slate-500"
                        >
                          No receipts yet. Upload some to get started!
                        </td>
                      </tr>
                    ) : (
                      receipts.map((r) => (
                        <tr
                          key={r.id}
                          className="border-t border-slate-800/70 hover:bg-slate-800/50 transition"
                        >
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              className="h-3 w-3 accent-indigo-500"
                            />
                          </td>
                          <Td>{r.date}</Td>
                          <Td>{r.vendor}</Td>
                          <Td>{r.amount && `$${r.amount.toFixed(2)}`}</Td>
                          <Td>{r.tax}</Td>
                          <Td>{r.category}</Td>
                          <Td>{r.card}</Td>
                          <Td>{r.job}</Td>
                          <Td>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                r.status === "Pending"
                                  ? "bg-amber-500/10 text-amber-300 border border-amber-500/40"
                                  : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                              }`}
                            >
                              {r.status || "Processed"}
                            </span>
                          </Td>
                          <Td className="text-right">
                            <button className="rounded-full border border-slate-700/70 px-2 py-1 text-[11px] hover:bg-slate-700/70 transition">
                              View
                            </button>
                          </Td>
                        </tr>
                      ))
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
    <th className={`px-4 py-2 font-medium text-[11px] uppercase ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={`px-4 py-2 text-slate-200 text-xs align-middle ${className}`}>
      {children}
    </td>
  );
}
