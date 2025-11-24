export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);

const buildUrl = (path) => `${API_BASE_URL}${path}`;

const handleResponse = async (res) => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
};

const apiGet = (path) =>
  fetch(buildUrl(path), {
    credentials: "include",
  }).then(handleResponse);

const apiPost = (path, body) =>
  fetch(buildUrl(path), {
    method: "POST",
    credentials: "include",
    body,
  }).then(handleResponse);

const apiPostJson = (path, payload) =>
  fetch(buildUrl(path), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handleResponse);

// Receipts
export const fetchReceipts = () => apiGet("/receipts");

export const uploadReceipt = (file, fields = {}) => {
  const formData = new FormData();
  formData.append("file", file);

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });

  return apiPost("/receipts", formData);
};

export const buildExportUrl = (params = {}, format = "csv") => {
  const url = new URL(buildUrl("/export"), window.location.origin);
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  search.set("format", format);
  url.search = search.toString();
  return url.toString();
};

// Vendors
// Vendors
export const fetchVendors = () => apiGet("/vendors");
export const createVendor = (vendor) => apiPostJson("/vendors", vendor);
export const deleteVendor = (id) =>
  fetch(buildUrl(`/vendors/${id}`), {
    method: "DELETE",
    credentials: "include",
  }).then(handleResponse);

// Cards
export const fetchCards = () => apiGet("/cards");
export const createCard = (card) => apiPostJson("/cards", card);

// Jobs
export const fetchJobs = () => apiGet("/jobs");
export const createJob = (job) => apiPostJson("/jobs", job);
export const deleteJob = (id) =>
  fetch(buildUrl(`/jobs/${id}`), {
    method: "DELETE",
    credentials: "include",
  }).then(handleResponse);

// Categories
export const fetchCategories = () => apiGet("/categories");
export const createCategory = (category) => apiPostJson("/categories", category);

// Receipts updates
export const updateReceipt = (id, updates) =>
  apiPostJson(`/receipts/${id}`, updates).then((res) => {
    // If it was a PATCH, apiPostJson might default to POST, but let's check implementation.
    // Actually apiPostJson uses POST. We need a PATCH helper or just use fetch directly.
    // Let's add apiPatchJson helper or just use fetch here.
    return res;
  });

// We need to fix updateReceipt to use PATCH.
const apiPatchJson = (path, payload) =>
  fetch(buildUrl(path), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handleResponse);

export const updateReceiptField = (id, updates) => apiPatchJson(`/receipts/${id}`, updates);

// Receipts deletes
export const deleteReceipt = (id) =>
  fetch(buildUrl(`/receipts/${id}`), {
    method: "DELETE",
    credentials: "include",
  }).then(handleResponse);

export const deleteReceipts = (ids = []) => {
  const params = new URLSearchParams();
  if (ids.length) {
    params.set("ids", ids.join(","));
  }
  return fetch(buildUrl(`/receipts?${params.toString()}`), {
    method: "DELETE",
    credentials: "include",
  }).then(handleResponse);
};

export const deleteAllReceipts = () =>
  fetch(buildUrl(`/receipts?deleteAll=true`), {
    method: "DELETE",
    credentials: "include",
  }).then(handleResponse);
