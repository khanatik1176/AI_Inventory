"use client";

export function isLoggedIn() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("access_token");
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
}
