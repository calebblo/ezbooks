import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./LoginPage";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState(null);
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if we have a valid session (user clicked reset link)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setIsError(true);
                setMessage("Invalid or expired reset link. Please request a new one.");
                setIsLoading(false);
            } else {
                setIsLoading(false);
            }
        });
    }, []);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setMessage(null);
        setIsError(false);

        // Validation
        if (password.length < 6) {
            setIsError(true);
            setMessage("Password must be at least 6 characters");
            return;
        }

        if (password !== confirmPassword) {
            setIsError(true);
            setMessage("Passwords do not match");
            return;
        }

        // Update password
        const { error } = await supabase.auth.updateUser({
            password: password,
        });

        if (error) {
            setIsError(true);
            setMessage(error.message);
        } else {
            setMessage("Password updated successfully! Redirecting to login...");
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        }
    };

    if (isLoading) {
        return (
            <div className="w-screen h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center font-[Inter]">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center font-[Inter]">
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-xl p-10 w-[400px] text-center relative">
                <h1 className="text-white text-3xl font-semibold mb-6">
                    Reset Your Password
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

                <form onSubmit={handleResetPassword} className="space-y-4">
                    <input
                        type="password"
                        placeholder="New Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                        required
                        minLength={6}
                    />
                    <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                        required
                        minLength={6}
                    />
                    <button
                        type="submit"
                        className="w-full py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition"
                    >
                        Update Password
                    </button>
                </form>

                <p className="text-gray-400 text-sm mt-6">
                    Remember your password?{" "}
                    <span
                        onClick={() => navigate("/login")}
                        className="text-blue-400 cursor-pointer hover:underline"
                    >
                        Back to Login
                    </span>
                </p>
            </div>
        </div>
    );
}
