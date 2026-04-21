// src/types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

// 1. บอก TypeScript ว่า User มีฟิลด์ role เพิ่มมา
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
  }
}

// 2. บอก TypeScript ว่า Token ก็มีฟิลด์ role กับ id เหมือนกัน
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
