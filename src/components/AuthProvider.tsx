// src/components/AuthProvider.tsx
'use client'; // 🌟 สำคัญมาก ต้องมีคำนี้

import { SessionProvider } from "next-auth/react";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}