"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import Dashboard from "../components/Dashboard";

export default function DashboardPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      if (!isLoggedIn()) {
        router.replace("/login");
      } else {
        setIsChecking(false);
      }
    };

    // Small delay to prevent flash
    const timer = setTimeout(checkAuth, 100);
    
    return () => clearTimeout(timer);
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-900 to-black flex items-center justify-center">
        <div className="text-center">
          {/* Loading Spinner */}
          <div className="relative">
            <svg 
              className="animate-spin h-16 w-16 text-cyan-400 mx-auto mb-4" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
          </div>
          
          {/* Loading Text */}
          <h1 className="text-2xl font-bold text-cyan-300 mb-2">
            AI Inventory Manager
          </h1>
          <p className="text-slate-400 text-lg">
            Loading...
          </p>
          
          {/* Animated Dots */}
          <div className="flex justify-center space-x-1 mt-4">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}