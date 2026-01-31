"use client";

import React, { useEffect, useState } from 'react';
import { useToast, Toast, ToastType } from '@/contexts/ToastContext';

const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
  switch (type) {
    case 'success':
      return (
        <div className="relative">
          <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-green-500 rounded-full p-1.5">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      );
    case 'error':
      return (
        <div className="relative">
          <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-red-500 rounded-full p-1.5">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
      );
    case 'warning':
      return (
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-yellow-500 rounded-full p-1.5">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" />
            </svg>
          </div>
        </div>
      );
    case 'info':
      return (
        <div className="relative">
          <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-cyan-500 rounded-full p-1.5">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01" />
            </svg>
          </div>
        </div>
      );
    default:
      return null;
  }
};

const getToastStyles = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-gradient-to-r from-green-900/90 via-green-800/90 to-emerald-900/90',
        border: 'border-green-400/30',
        glow: 'shadow-green-500/25',
        accent: 'bg-gradient-to-r from-green-400 to-emerald-400'
      };
    case 'error':
      return {
        bg: 'bg-gradient-to-r from-red-900/90 via-red-800/90 to-rose-900/90',
        border: 'border-red-400/30',
        glow: 'shadow-red-500/25',
        accent: 'bg-gradient-to-r from-red-400 to-rose-400'
      };
    case 'warning':
      return {
        bg: 'bg-gradient-to-r from-yellow-900/90 via-orange-800/90 to-yellow-900/90',
        border: 'border-yellow-400/30',
        glow: 'shadow-yellow-500/25',
        accent: 'bg-gradient-to-r from-yellow-400 to-orange-400'
      };
    case 'info':
      return {
        bg: 'bg-gradient-to-r from-cyan-900/90 via-blue-800/90 to-cyan-900/90',
        border: 'border-cyan-400/30',
        glow: 'shadow-cyan-500/25',
        accent: 'bg-gradient-to-r from-cyan-400 to-blue-400'
      };
    default:
      return {
        bg: 'bg-gradient-to-r from-gray-900/90 via-gray-800/90 to-gray-900/90',
        border: 'border-gray-400/30',
        glow: 'shadow-gray-500/25',
        accent: 'bg-gradient-to-r from-gray-400 to-gray-500'
      };
  }
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const styles = getToastStyles(toast.type);
  const duration = toast.duration || 3000;

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);

    // Start progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const decrement = 100 / (duration / 50);
        return Math.max(0, prev - decrement);
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [duration]);

  return (
    <div className={`
      ${styles.bg} ${styles.border} ${styles.glow}
      relative overflow-hidden rounded-2xl border backdrop-blur-xl
      shadow-2xl transform transition-all duration-500 ease-out mb-3
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      hover:scale-105 hover:shadow-xl group
    `}>
      {/* Glowing accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${styles.accent}`}></div>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
        <div 
          className={`h-full ${styles.accent} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)] animate-pulse"></div>
      </div>

      {/* Content */}
      <div className="relative px-6 py-4 flex items-center gap-4">
        <ToastIcon type={toast.type} />
        
        <div className="flex-1">
          <span className="text-white font-medium text-sm leading-relaxed tracking-wide">
            {toast.message}
          </span>
        </div>

        <button
          onClick={() => onRemove(toast.id)}
          className="
            ml-2 p-1.5 rounded-full bg-white/5 hover:bg-white/10 
            border border-white/10 hover:border-white/20
            transition-all duration-200 ease-out
            group-hover:bg-white/15
            backdrop-blur-sm
          "
        >
          <svg className="h-3.5 w-3.5 text-white/70 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-2 left-4 w-1 h-1 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-4 right-6 w-0.5 h-0.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-3 left-8 w-0.5 h-0.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }}></div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-50 max-w-sm w-full space-y-2">
      {/* Container background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 rounded-3xl blur-xl"></div>
      
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
};