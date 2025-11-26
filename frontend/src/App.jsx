import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import VendorsPage from "./pages/VendorsPage";
import JobsPage from "./pages/JobsPage";
import UsageBanner from "./components/TrialBanner";
import PricingModal from "./components/SubscriptionModal";
import { API_BASE_URL } from "./api/client";
import { supabase } from "./pages/LoginPage";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const refreshUser = async () => {
    try {
      // Wait for Supabase session to be ready
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Now fetch user from backend with the session token
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        setUser(null);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setUser(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch user", err);
      setUser(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    refreshUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        refreshUser();
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#050816] flex items-center justify-center text-white">Loading...</div>;
  }

  const isLimitReached = user && user.limit && user.usage >= user.limit;

  // Protected route wrapper
  const ProtectedRoute = ({ children }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

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
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage onUploadSuccess={refreshUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendors"
          element={
            <ProtectedRoute>
              <VendorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs"
          element={
            <ProtectedRoute>
              <JobsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;