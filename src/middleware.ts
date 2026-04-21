// src/middleware.ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // ==========================================
  // 🔒 โซน 1: ป้องกัน API (ป้องกันคนนอกยิง Postman)
  // ==========================================
  if (pathname.startsWith("/api/companies")) {
    // 🌟 แก้ไข: ให้ทั้ง ADMIN และ HR สามารถจัดการข้อมูลบริษัทได้
    if (!token || (token.role !== "ADMIN" && token.role !== "HR")) {
      return NextResponse.json(
        { error: "Unauthorized: Access Denied (เฉพาะ ADMIN และ HR เท่านั้น)" },
        { status: 401 },
      );
    }
  }

  // ==========================================
  // 👑 โซน 2: ฝั่งแอดมิน (/admin/...)
  // ==========================================
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    if (!token) return NextResponse.redirect(new URL("/admin/login", req.url));

    // 🌟 1. อนุญาตให้ทั้ง ADMIN และ HR เข้าใช้งานโซน Admin ได้
    if (token.role !== "ADMIN" && token.role !== "HR") {
      return NextResponse.redirect(new URL("/employee/payslips", req.url));
    }

    // 🌟 2. (โบนัสความปลอดภัย) ดักไม่ให้ HR พิมพ์ URL แอบเข้าหน้า Summary (เพราะหน้านี้สงวนให้ ADMIN)
    if (pathname.startsWith("/admin/summary") && token.role !== "ADMIN") {
      // ถ้าเป็น HR แอบเข้ามา จะเด้งกลับไปหน้า Company ให้เอง
      return NextResponse.redirect(new URL("/admin/company", req.url));
    }
  }

  // ==========================================
  // 👨‍💼 โซน 3: ฝั่งพนักงาน (/employee/...)
  // ==========================================
  if (pathname.startsWith("/employee")) {
    if (pathname === "/employee/login") return NextResponse.next();
    if (!token)
      return NextResponse.redirect(new URL("/employee/login", req.url));
  }

  return NextResponse.next();
}

// 🌟 อย่าลืมเพิ่ม /api/companies ลงใน matcher ด้วย ยามจะได้ทำงานตรงนี้!
export const config = {
  matcher: ["/admin/:path*", "/employee/:path*", "/api/companies/:path*"],
};
