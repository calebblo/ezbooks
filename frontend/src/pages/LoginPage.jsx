import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { FcGoogle } from "react-icons/fc";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";


export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const startInSignUp = searchParams?.get("signup") === "true";
  const [isSignUp, setIsSignUp] = useState(startInSignUp);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);
  const navigate = useNavigate();

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setMessage(null);
    setIsError(false);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setIsError(true);
        setMessage(error.message);
      } else {
        setMessage("Account created! Check your email to verify.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setIsError(true);
        setMessage(error.message);
      } else {
        setMessage("Login successful! Redirecting...");
        // Use window.location to force a full page reload
        // This ensures App.jsx fetches the user before rendering
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      }
    }
  };



  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) console.error(error.message);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setMessage(null);
    setIsError(false);

    if (!email) {
      setIsError(true);
      setMessage("Please enter your email address");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setIsError(true);
      setMessage(error.message);
    } else {
      setMessage("Password reset email sent! Check your inbox.");
    }
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center font-[Inter]">
      <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-xl p-10 w-[400px] text-center relative">
        <h1 className="text-white text-3xl font-semibold mb-6">
          {isForgotPassword ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
        </h1>

        {message && (
          <div
            className={`transition-all mb-4 p-3 rounded-lg text-sm ${isError
              ? "bg-red-500/20 text-red-300 border border-red-500/30"
              : "bg-green-500/20 text-green-300 border border-green-500/30"
              }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={isForgotPassword ? handleForgotPassword : handleEmailAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            required
          />
          {!isForgotPassword && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
              required
            />
          )}
          <button
            type="submit"
            className="w-full py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition"
          >
            {isForgotPassword ? "Send Reset Link" : isSignUp ? "Sign Up" : "Login"}
          </button>
        </form>

        {!isForgotPassword && (
          <>
            <div className="my-4 text-gray-400">or</div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/90 text-black rounded-lg hover:bg-white transition"
            >
              <FcGoogle size={20} /> Continue with Google
            </button>
          </>
        )}

        {!isForgotPassword ? (
          <p className="text-gray-400 text-sm mt-6">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <span
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
              className="text-blue-400 cursor-pointer hover:underline"
            >
              {isSignUp ? "Login" : "Create one"}
            </span>
          </p>
        ) : (
          <p className="text-gray-400 text-sm mt-6">
            Remember your password?{" "}
            <span
              onClick={() => {
                setIsForgotPassword(false);
                setMessage(null);
              }}
              className="text-blue-400 cursor-pointer hover:underline"
            >
              Back to Login
            </span>
          </p>
        )}

        {!isForgotPassword && !isSignUp && (
          <p className="text-gray-400 text-xs mt-3">
            <span
              onClick={() => {
                setIsForgotPassword(true);
                setMessage(null);
              }}
              className="text-blue-400 cursor-pointer hover:underline"
            >
              Forgot password?
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
