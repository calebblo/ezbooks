const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
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
export const fetchReceipts = (params = {}) => {
  const search = new URLSearchParams();
  if (params.startDate) search.set("startDate", params.startDate);
  if (params.endDate) search.set("endDate", params.endDate);

  const query = search.toString();
  const path = query ? `/receipts?${query}` : "/receipts";
  return apiGet(path);
};

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

export const buildExportUrl = (params = {}) => {
  const url = new URL(buildUrl("/export"), window.location.origin);
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      // Normalize keys to backend params
      if (key === "start" || key === "startDate") {
        search.set("startDate", value);
      } else if (key === "end" || key === "endDate") {
        search.set("endDate", value);
      } else {
        search.set(key, value);
      }
    }
  });
  url.search = search.toString();
  return url.toString();
};

// Vendors
export const fetchVendors = () => apiGet("/vendors");
export const createVendor = (vendor) => apiPostJson("/vendors", vendor);

// Cards
export const fetchCards = () => apiGet("/cards");
export const createCard = (card) => apiPostJson("/cards", card);

// Jobs
export const fetchJobs = () => apiGet("/jobs");
export const createJob = (job) => apiPostJson("/jobs", job);

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

// Presigned image URL
export const fetchReceiptImage = (id) =>
  apiGet(`/receipts/${id}/image`);
