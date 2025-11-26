import { supabase } from "../pages/LoginPage";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);

const buildUrl = (path) => `${API_BASE_URL}${path}`;

/**
 * Get Supabase session token for authenticated requests
 * With timeout to prevent hanging if Supabase is not configured
 */
async function getAuthHeaders() {
  try {
    // Add timeout to prevent hanging if Supabase is not configured
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve(null), 3000) // 3 second timeout
    );

    const sessionPromise = supabase.auth.getSession();

    const result = await Promise.race([sessionPromise, timeoutPromise]);

    if (!result) {
      console.warn("Supabase session timeout - continuing without auth token");
      return {};
    }

    const { data: { session } } = result;

    if (session?.access_token) {
      return {
        "Authorization": `Bearer ${session.access_token}`
      };
    }

    return {};
  } catch (error) {
    console.warn("Failed to get Supabase session:", error.message);
    return {};
  }
}

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

const apiGet = async (path) => {
  const authHeaders = await getAuthHeaders();
  return fetch(buildUrl(path), {
    credentials: "include",
    headers: authHeaders,
  }).then(handleResponse);
};

const apiPost = async (path, body) => {
  const authHeaders = await getAuthHeaders();
  return fetch(buildUrl(path), {
    method: "POST",
    credentials: "include",
    headers: authHeaders,
    body,
  }).then(handleResponse);
};

const apiPostJson = async (path, payload) => {
  const authHeaders = await getAuthHeaders();
  return fetch(buildUrl(path), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify(payload),
  }).then(handleResponse);
};

// Receipts
export const fetchReceipts = () => apiGet("/receipts/");

export const uploadReceipt = (file, fields = {}) => {
  const formData = new FormData();
  formData.append("file", file);

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });

  return apiPost("/receipts/", formData);
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
export const fetchVendors = () => apiGet("/vendors/");
export const createVendor = (vendor) => apiPostJson("/vendors/", vendor);
export const deleteVendor = async (id) => {
  const authHeaders = await getAuthHeaders();
  return fetch(buildUrl(`/vendors/${id}`), {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders,
  }).then(handleResponse);
};

// Cards
export const fetchCards = () => apiGet("/cards/");
export const createCard = (card) => apiPostJson("/cards/", card);

// Jobs
export const fetchJobs = () => apiGet("/jobs/");
export const createJob = (job) => apiPostJson("/jobs/", job);
export const deleteJob = async (id) => {
  const authHeaders = await getAuthHeaders();
  return fetch(buildUrl(`/jobs/${id}`), {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders,
  }).then(handleResponse);
};

// Categories
export const fetchCategories = () => apiGet("/categories/");
export const createCategory = (category) => apiPostJson("/categories/", category);

// Receipts updates
const apiPatchJson = async (path, payload) => {
  const authHeaders = await getAuthHeaders();
  return fetch(buildUrl(path), {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify(payload),
  }).then(handleResponse);
};

export const updateReceiptField = (id, updates) => apiPatchJson(`/receipts/${id}`, updates);

// Receipts deletes
export const deleteReceipt = async (id) => {
  const authHeaders = await getAuthHeaders();
  return fetch(buildUrl(`/receipts/${id}`), {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders,
  }).then(handleResponse);
};

export const deleteReceipts = async (ids = []) => {
  const authHeaders = await getAuthHeaders();
  const params = new URLSearchParams();
  if (ids.length) {
    params.set("ids", ids.join(","));
  }
  return fetch(buildUrl(`/receipts?${params.toString()}`), {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders,
  }).then(handleResponse);
};

export const deleteAllReceipts = async () => {
  const authHeaders = await getAuthHeaders();
  return fetch(buildUrl(`/receipts?deleteAll=true`), {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders,
  }).then(handleResponse);
};
