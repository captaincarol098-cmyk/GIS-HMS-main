"use client";

import React from "react";
import "@/styles/admin.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-container min-h-full space-y-6">
      {children}
    </div>
  );
}
