"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validateForm = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }
    
    if (!password.trim()) {
      setError("Password is required");
      return false;
    }
    
    return true;
  };

  const login = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/api/auth/login/", {
        email,
        password,
      });
      localStorage.setItem("access_token", res.data.access);
      router.push("/");
    } catch (e: any) {
      setError(e.response?.data?.error || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      login();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-900 to-black flex items-center justify-center p-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-sm p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-cyan-300 drop-shadow-md mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-400">
            Sign in to AI Inventory Manager
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-slate-200 placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none transition"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-slate-200 placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none transition"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>

          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg text-white font-semibold transition shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link 
              href="/signup" 
              className="text-cyan-300 hover:text-cyan-200 transition font-medium"
            >
              Create one here
            </Link>
          </p>
        </div>

        {/* Welcome Back Message */}
        <div className="mt-4 p-3 bg-white/5 rounded-lg text-center">
          <p className="text-xs text-slate-400">
            Secure login to manage your inventory
          </p>
        </div>
      </div>
    </div>
  );
}