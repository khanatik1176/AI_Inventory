"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  const validatePassword = (password: string) => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

    return {
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
      isValid: hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar
    };
  };

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

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      if (!passwordValidation.hasMinLength) {
        setError("Password must be at least 8 characters long");
      } else if (!passwordValidation.hasUpperCase) {
        setError("Password must contain at least one uppercase letter");
      } else if (!passwordValidation.hasLowerCase) {
        setError("Password must contain at least one lowercase letter");
      } else if (!passwordValidation.hasNumber) {
        setError("Password must contain at least one number");
      } else if (!passwordValidation.hasSpecialChar) {
        setError("Password must contain at least one special character");
      }
      return false;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    
    return true;
  };

  const signup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      await api.post("/api/auth/register/", {
        email,
        password,
      });
      
      // Show success toast
      addToast("success", "Account created successfully! Please sign in.");
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 1000);
      
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || "Signup failed. Please try again.";
      setError(errorMessage);
      addToast("error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      signup();
    }
  };

  const passwordValidation = validatePassword(password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-900 to-black flex items-center justify-center p-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-sm p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-cyan-300 drop-shadow-md mb-2">
            Create Account
          </h1>
          <p className="text-slate-400">
            Join AI Inventory Manager
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

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-slate-200 placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none transition"
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>

          <button
            onClick={signup}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg text-white font-semibold transition shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-slate-400">
            Already have an account?{" "}
            <Link 
              href="/login" 
              className="text-cyan-300 hover:text-cyan-200 transition font-medium"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Enhanced Password Requirements */}
        <div className="mt-4 p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-slate-400 mb-2">Password requirements:</p>
          <ul className="text-xs text-slate-500 space-y-1">
            <li className={`flex items-center gap-2 ${passwordValidation.hasMinLength ? "text-green-400" : ""}`}>
              <span className={`w-1 h-1 rounded-full ${passwordValidation.hasMinLength ? "bg-green-400" : "bg-slate-500"}`}></span>
              At least 8 characters long
            </li>
            <li className={`flex items-center gap-2 ${passwordValidation.hasUpperCase ? "text-green-400" : ""}`}>
              <span className={`w-1 h-1 rounded-full ${passwordValidation.hasUpperCase ? "bg-green-400" : "bg-slate-500"}`}></span>
              One uppercase letter (A-Z)
            </li>
            <li className={`flex items-center gap-2 ${passwordValidation.hasLowerCase ? "text-green-400" : ""}`}>
              <span className={`w-1 h-1 rounded-full ${passwordValidation.hasLowerCase ? "bg-green-400" : "bg-slate-500"}`}></span>
              One lowercase letter (a-z)
            </li>
            <li className={`flex items-center gap-2 ${passwordValidation.hasNumber ? "text-green-400" : ""}`}>
              <span className={`w-1 h-1 rounded-full ${passwordValidation.hasNumber ? "bg-green-400" : "bg-slate-500"}`}></span>
              One number (0-9)
            </li>
            <li className={`flex items-center gap-2 ${passwordValidation.hasSpecialChar ? "text-green-400" : ""}`}>
              <span className={`w-1 h-1 rounded-full ${passwordValidation.hasSpecialChar ? "bg-green-400" : "bg-slate-500"}`}></span>
              One special character (!@#$%^&*)
            </li>
            <li className={`flex items-center gap-2 ${password && confirmPassword && password === confirmPassword ? "text-green-400" : ""}`}>
              <span className={`w-1 h-1 rounded-full ${password && confirmPassword && password === confirmPassword ? "bg-green-400" : "bg-slate-500"}`}></span>
              Passwords must match
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}