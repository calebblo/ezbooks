import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  fetchReceipts,
  uploadReceipt,
  buildExportUrl,
  deleteReceipts,
  deleteAllReceipts,
  fetchReceiptImage,
} from "../api/client.js"; // !!!!!! Backend API client

const getDefaultExportDates = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of month
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const getYearBoundsFromReceipts = (receipts = []) => {
  const parseYear = (value) => {
    if (!value) return null;
    const raw = String(value).trim();
    const formats = [
      "%Y-%m-%d",
      "%Y/%m/%d",
      "%Y.%m.%d",
      "%b %d, %Y",
      "%B %d, %Y",
      "%m/%d/%Y",
      "%d %b %Y",
      "%d %B %Y",
    ];

    // Simple manual parse for known formats
    for (const fmt of formats) {
      const parts = raw.match(
        fmt === "%Y-%m-%d"
          ? /^(\d{4})-(\d{2})-(\d{2})$/
          : fmt === "%Y\/%m\/%d"
            ? /^(\d{4})\/(\d{2})\/(\d{2})$/
            : fmt === "%Y\.\%m\.\%d"
              ? /^(\d{4})\.(\d{2})\.(\d{2})$/
              : fmt === "%m/%d/%Y"
                ? /^(\d{2})\/(\d{2})\/(\d{4})$/
                : fmt === "%b %d, %Y"
                  ? /^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/
                  : fmt === "%B %d, %Y"
                    ? /^([A-Za-z]+) (\d{1,2}), (\d{4})$/
                    : fmt === "%d %b %Y"
                      ? /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/
                      : /^(\d{1,2}) ([A-Za-z]+) (\d{4})$/
      );
      if (parts) {
        const year =
          fmt === "%m/%d/%Y"
            ? Number(parts[3])
            : fmt === "%b %d, %Y" || fmt === "%B %d, %Y"
              ? Number(parts[3])
              : fmt === "%d %b %Y" || fmt === "%d %B %Y"
                ? Number(parts[3])
                : Number(parts[1]);
        return Number.isNaN(year) ? null : year;
      }
    }

    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.getFullYear();
  };

  const years = receipts
    .map((r) => parseYear(r?.date))
    .filter((y) => y !== null);

  if (!years.length) {
    const current = new Date().getFullYear();
    return { minYear: current, maxYear: current };
  }

  return {
    minYear: Math.min(...years),
    maxYear: Math.max(...years),
  };
};

export default function Dashboard() {
  const [receipts, setReceipts] = useState([]); // [{id,date,vendor,amount,tax,category,card,job,status}]
  const [isDragging, setIsDragging] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [dateRange, setDateRange] = useState(getDefaultExportDates);
  const [exportDates, setExportDates] = useState(getDefaultExportDates);
  const [yearBounds, setYearBounds] = useState(() =>
    getYearBoundsFromReceipts([])
  );
  const [boundsLoaded, setBoundsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // !!!!!! loading state
  const [isUploading, setIsUploading] = useState(false); // !!!!!! upload state
  const [error, setError] = useState(null); // !!!!!! error surface
  const [selectedIds, setSelectedIds] = useState([]); // !!!!!! selection state
  const [confirmDelete, setConfirmDelete] = useState(null); // {type: "selected"|"all"}
  const [viewImage, setViewImage] = useState(null); // {url, vendor, date, error?: bool}
  const [uploadReport, setUploadReport] = useState(null); // {successCount, failed: [{name, message}]}

  const loadReceipts = useCallback(async (range) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchReceipts(range || {});
      setReceipts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load receipts", err);
      setError("Failed to load receipts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReceipts(dateRange);
  }, [loadReceipts, dateRange]);

  useEffect(() => {
    setExportDates(dateRange);
  }, [dateRange]);

  useEffect(() => {
    const newBounds = getYearBoundsFromReceipts(receipts);
    setYearBounds((prev) => ({
      minYear: Math.min(prev.minYear, newBounds.minYear),
      maxYear: Math.max(prev.maxYear, newBounds.maxYear),
    }));
  }, [receipts]);

  useEffect(() => {
    let active = true;
    const loadAllBounds = async () => {
      try {
        const data = await fetchReceipts();
        if (!active) return;
        setYearBounds(getYearBoundsFromReceipts(Array.isArray(data) ? data : []));
        setBoundsLoaded(true);
      } catch (err) {
        console.error("Failed to load year bounds", err);
      }
    };
    loadAllBounds();
    return () => {
      active = false;
    };
  }, []);

  const handleFiles = useCallback(
    async (files) => {
      if (!files.length) return;

      setIsUploading(true);
      setError(null);
      const failed = [];
      let successCount = 0;

      for (const file of files) {
        try {
          await uploadReceipt(file);
          successCount += 1;
        } catch (err) {
          console.error("Upload failed for file", file?.name, err);
          failed.push({
            name: file?.name || "Unknown file",
            message: err?.message || "Upload failed",
          });
        }
      }

      try {
        if (successCount > 0) {
          await loadReceipts(dateRange);
        }
        if (failed.length) {
          setUploadReport({ successCount, failed });
        } else if (successCount > 0) {
          // Hard refresh to ensure all views reflect new uploads
          window.location.reload();
        }
      } catch (err) {
        console.error("Post-upload handling failed", err);
        setError("Upload completed with issues. Please refresh and try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [dateRange, loadReceipts]
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
    await loadReceipts(dateRange);
    setSelectedIds([]);
  };

  const updateDateRange = (key, value) => {
    setDateRange((prev) => {
      const next = { ...prev, [key]: value };
      if (
        next.startDate &&
        next.endDate &&
        next.startDate > next.endDate
      ) {
        if (key === "startDate") {
          next.endDate = next.startDate;
        } else {
          next.startDate = next.endDate;
        }
      }
      return next;
    });
  };

  const onExport = async (type) => {
    // type: "csv" | "pdf"
    console.log("Exporting", type, "for range", exportDates);
    const url = buildExportUrl(exportDates);
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
      await loadReceipts(dateRange);
    } catch (err) {
      console.error("Delete failed", err);
      setError("Delete failed. Please try again.");
    } finally {
      setConfirmDelete(null);
    }
  };

  // Simple derived stats (swap for real stats API if you have one)
  const totalReceipts = receipts.length;
  const pendingCount = receipts.filter((r) => {
    const status = (r.status || "").toUpperCase();
    return status.includes("PEND") || status === "UPLOADED";
  }).length;
  const rangeTotalAmount = receipts.reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0
  );

  const formatAmount = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? `$${num.toFixed(2)}` : "—";
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString().slice(0, 10);
  };

  const openImageModal = async (receipt) => {
    const receiptId = receipt.receiptId || receipt.id;
    const baseState = {
      url: null,
      vendor: receipt.vendorId || "Receipt",
      date: formatDate(receipt.date),
      error: false,
      loading: true,
      receiptId,
    };
    setViewImage(baseState);
    try {
      const resp = await fetchReceiptImage(receiptId);
      if (resp?.url) {
        setViewImage({ ...baseState, url: resp.url, loading: false });
      } else {
        setViewImage({ ...baseState, loading: false, error: true });
      }
    } catch (err) {
      console.error("Failed to fetch image", err);
      setViewImage({ ...baseState, loading: false, error: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col">
      {/* Top brand bar */}
      <header className="w-full border-b border-slate-800/70 bg-gradient-to-r from-indigo-700/40 via-purple-700/30 to-indigo-700/40 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold">
              Ez
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">
                EzBooks
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
                Quick Stats (Range)
              </h2>
              <div className="space-y-3 text-sm">
                <StatRow label="Pending" value={pendingCount} />
                <StatRow
                  label="Range Total"
                  value={
                    rangeTotalAmount
                      ? `$${rangeTotalAmount.toFixed(2)}`
                      : "$0.00"
                  }
                />
                <StatRow label="Receipts" value={totalReceipts} />
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
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <span className="text-base">🧾</span> Receipts
                  </h2>
                  <div className="flex items-center gap-2">
                    <DatePickerButton
                      label="Start Date"
                      value={dateRange.startDate}
                      yearBounds={yearBounds}
                      onChange={(val) => updateDateRange("startDate", val)}
                    />
                    <DatePickerButton
                      label="End Date"
                      value={dateRange.endDate}
                      yearBounds={yearBounds}
                      onChange={(val) => updateDateRange("endDate", val)}
                    />
                  </div>
                </div>
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/70 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                  >
                    <span className="text-xs">⟳</span>
                    Refresh
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead className="bg-slate-900/80 text-slate-400 text-left">
                    <tr>
                      <th className="px-4 py-2 w-8">
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
                          className="px-4 py-6 text-center text-xs text-slate-500"
                        >
                          Loading receipts…
                        </td>
                      </tr>
                    ) : receipts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-6 text-center text-xs text-slate-500"
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
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/40"
                            : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40";

                        return (
                          <tr
                            key={r.receiptId || r.id}
                            className="border-t border-slate-800/70 hover:bg-slate-800/50 transition"
                          >
                            <td className="px-4 py-2">
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
                            <Td>{r.vendorId || "—"}</Td>
                            <Td>{formatAmount(r.amount)}</Td>
                            <Td>{formatAmount(r.taxAmount)}</Td>
                            <Td>{r.category || "—"}</Td>
                            <Td>{r.cardId || "—"}</Td>
                            <Td>{r.jobId || "—"}</Td>
                            <Td>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
                              >
                                {statusLabel}
                              </span>
                            </Td>
                            <Td className="text-right">
                              <button
                                onClick={() => openImageModal(r)}
                                className="rounded-full border border-slate-700/70 px-2 py-1 text-[11px] hover:bg-slate-700/70 transition"
                              >
                                View
                              </button>
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
                  value={exportDates.startDate}
                  onChange={(e) =>
                    setExportDates((prev) => ({
                      ...prev,
                      startDate: e.target.value,
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
                  value={exportDates.endDate}
                  onChange={(e) =>
                    setExportDates((prev) => ({
                      ...prev,
                      endDate: e.target.value,
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

      {/* UPLOAD REPORT MODAL */}
      {uploadReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800/80 shadow-2xl p-6 relative">
            <button
              onClick={() => {
                setUploadReport(null);
                setError(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-2 text-white">Upload Summary</h2>
            <p className="text-sm text-slate-300 mb-4">
              {uploadReport.successCount} uploaded successfully, {uploadReport.failed.length} failed.
            </p>
            {uploadReport.failed.length > 0 && (
              <div className="space-y-2 mb-4">
                <div className="text-xs uppercase text-slate-400">Failed files</div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {uploadReport.failed.map((f, idx) => (
                    <div
                      key={`${f.name}-${idx}`}
                      className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100"
                    >
                      <div className="font-semibold">{f.name}</div>
                      <div className="text-rose-200/90">{f.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setUploadReport(null);
                  setError(null);
                  refreshReceipts();
                }}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition"
              >
                OK
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-700/80 transition"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW IMAGE MODAL */}
      {viewImage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden">
            <button
              onClick={() => setViewImage(null)}
              className="absolute top-3 right-3 text-slate-300 hover:text-white"
            >
              ✕
            </button>
            <div className="p-4 flex items-center justify-between text-slate-200 text-sm border-b border-slate-800">
              <div className="font-semibold">{viewImage.vendor}</div>
              <div className="text-slate-400">{viewImage.date}</div>
            </div>
            <div className="bg-black/40 flex items-center justify-center p-4 min-h-[200px]">
              {viewImage.error ? (
                <div className="text-sm text-rose-200 text-center space-y-2">
                  <div>Could not load image.</div>
                  {viewImage.url && (
                    <a
                      href={viewImage.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-indigo-300"
                    >
                      Open image in new tab
                    </a>
                  )}
                </div>
              ) : viewImage.loading ? (
                <div className="text-slate-200 text-sm">Loading image…</div>
              ) : (
                <img
                  src={viewImage.url}
                  alt={viewImage.vendor}
                  className="max-h-[80vh] max-w-full object-contain"
                  onError={() =>
                    setViewImage((prev) => ({ ...prev, error: true }))
                  }
                />
              )}
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

function DatePickerButton({ label, value, onChange, yearBounds }) {
  const [open, setOpen] = useState(false);
  const [activeYear, setActiveYear] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  });
  const [activeMonth, setActiveMonth] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return Number.isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
  });
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const selectedDate = value ? new Date(value) : null;
  const nowYear = new Date().getFullYear();

  useEffect(() => {
    const updatePos = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const popHeight = popoverRef.current?.offsetHeight || 0;
      const above = rect.top + window.scrollY - popHeight - 8;
      const below = rect.bottom + window.scrollY + 8;
      const top = popHeight ? Math.max(8, above) : below;
      setPopoverPos({
        top,
        left: rect.left + window.scrollX,
      });
    };
    if (open) {
      updatePos();
      window.addEventListener("resize", updatePos);
      window.addEventListener("scroll", updatePos, true);
    }
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const popHeight = popoverRef.current?.offsetHeight || 0;
      const above = rect.top + window.scrollY - popHeight - 8;
      const below = rect.bottom + window.scrollY + 8;
      setPopoverPos({
        top: popHeight ? Math.max(8, above) : below,
        left: rect.left + window.scrollX,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const d = value ? new Date(value) : new Date();
    if (!Number.isNaN(d.getTime())) {
      setActiveYear(d.getFullYear());
      setActiveMonth(d.getMonth());
    }
  }, [open, value]);

  const yearOptions = () => {
    const min = yearBounds?.minYear ?? nowYear;
    const max = yearBounds?.maxYear ?? nowYear;
    const startYear = Math.min(min, activeYear);
    const endYear = Math.max(max, activeYear);
    const years = [];
    for (let y = endYear; y >= startYear; y -= 1) {
      years.push(y);
    }
    return years;
  };

  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
  const firstDay = new Date(activeYear, activeMonth, 1).getDay();
  const calendarCells = Array.from({ length: firstDay + daysInMonth }, (_, idx) =>
    idx < firstDay ? null : idx - firstDay + 1
  );

  const formatDateParts = (year, monthIndex, day) =>
    `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const isSelectedDay = (day) => {
    if (!selectedDate || !day) return false;
    return (
      selectedDate.getFullYear() === activeYear &&
      selectedDate.getMonth() === activeMonth &&
      selectedDate.getDate() === day
    );
  };

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return (
      today.getFullYear() === activeYear &&
      today.getMonth() === activeMonth &&
      today.getDate() === day
    );
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
          open
            ? "border-indigo-500/70 bg-indigo-500/10 text-indigo-100"
            : "border-slate-700/70 bg-slate-800/60 text-slate-200 hover:bg-slate-700/80"
        }`}
      >
        <div className="text-left">
          <div className="text-[11px] uppercase tracking-wide text-slate-300">{label}</div>
          <div className="font-semibold text-[12px]">
            {value || "Pick date"}
          </div>
        </div>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-40"
            onMouseDown={(e) => {
              if (
                popoverRef.current &&
                !popoverRef.current.contains(e.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target)
              ) {
                setOpen(false);
              }
            }}
          >
            <div
              ref={popoverRef}
              className="absolute w-72 max-h-[26rem] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl"
              style={{ top: popoverPos.top, left: popoverPos.left }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="p-3 space-y-3">
                <div>
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Year</div>
                  <div className="max-h-28 overflow-y-auto rounded-xl border border-slate-800 bg-slate-800/60">
                    {yearOptions().map((year) => (
                      <button
                        key={year}
                        onClick={() => setActiveYear(year)}
                        className={`w-full text-left px-3 py-2 text-sm transition ${
                          year === activeYear
                            ? "bg-indigo-600/70 text-white"
                            : "text-slate-200 hover:bg-slate-700/60"
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Month</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {monthNames.map((month, idx) => (
                      <button
                        key={month}
                        onClick={() => setActiveMonth(idx)}
                        className={`rounded-lg px-2.5 py-1.5 text-sm transition ${
                          idx === activeMonth
                            ? "bg-indigo-600/70 text-white"
                            : "bg-slate-800/70 text-slate-200 hover:bg-slate-700/80"
                        }`}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase text-slate-400 mb-2">
                    <span>Day</span>
                    <span className="text-slate-500">
                      {monthNames[activeMonth]} {activeYear}
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-[11px] text-slate-500 mb-1">
                    {dayLabels.map((d) => (
                      <div key={d} className="text-center">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarCells.map((day, idx) =>
                      day ? (
                        <button
                          key={day}
                          onClick={() => {
                            onChange(formatDateParts(activeYear, activeMonth, day));
                            setOpen(false);
                          }}
                          className={`h-8 rounded-lg text-sm transition ${
                            isSelectedDay(day)
                              ? "bg-indigo-600 text-white"
                              : isToday(day)
                                ? "border border-indigo-500/60 text-indigo-100"
                                : "bg-slate-800/70 text-slate-100 hover:bg-slate-700/80"
                          }`}
                        >
                          {day}
                        </button>
                      ) : (
                        <div key={`blank-${idx}`} className="h-8" />
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
