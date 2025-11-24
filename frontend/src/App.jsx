import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import VendorsPage from "./pages/VendorsPage";
import JobsPage from "./pages/JobsPage";
import UsageBanner from "./components/TrialBanner";
import PricingModal from "./components/SubscriptionModal";
import { API_BASE_URL } from "./api/client";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  // We need to wrap the content in a component to use useLocation, 
  // or move BrowserRouter up. Since main.jsx has BrowserRouter, we can use useLocation here.
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const refreshUser = () => {
    fetch(`${API_BASE_URL}/auth/me`)
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch user", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    refreshUser();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#050816] flex items-center justify-center text-white">Loading...</div>;
  }

  const isLimitReached = user && user.limit && user.usage >= user.limit;

  return (
    <>
      {user && !isHomePage && (
        <>
          <UsageBanner
            usage={user.usage}
            limit={user.limit}
            tier={user.tier}
            onUpgrade={() => setIsPricingOpen(true)}
          />
          <PricingModal
            isOpen={isPricingOpen || isLimitReached}
            onClose={() => setIsPricingOpen(false)}
            currentTier={user.tier}
          />
        </>
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage onUploadSuccess={refreshUser} />} />
        <Route path="/vendors" element={<VendorsPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;