"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import Dashboard from "@/app/components/Dashboard";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
    }
  }, []);

  if (!isLoggedIn()) return null;

  return <Dashboard />;
}
