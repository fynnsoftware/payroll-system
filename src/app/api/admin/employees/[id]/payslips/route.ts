// src/app/api/admin/employees/[id]/payslips/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

// 🌟 1. ประกาศ Type ให้ตรงกับที่ Next.js 15 ต้องการเป๊ะๆ
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }, // 👈 บังคับ Type เป็น Promise ตรงนี้
) {
  try {
    const token = await getToken({ req: request });
    if (!token || (token.role !== "ADMIN" && token.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🌟 2. ใช้ await แกะกล่อง Promise ออกมาก่อน
    const resolvedParams = await params;
    const employeeId = resolvedParams.id;

    if (!employeeId || employeeId === "undefined" || employeeId === "null") {
      return NextResponse.json([], { status: 200 });
    }

    const payslips = await prisma.payroll.findMany({
      where: { employeeId: employeeId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json(payslips, { status: 200 });
  } catch (error) {
    console.error("Fetch Payslips Error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถดึงข้อมูลสลิปเงินเดือนได้" },
      { status: 500 },
    );
  }
}
