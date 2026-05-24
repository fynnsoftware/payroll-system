// src/app/api/employee/payslips/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(request: NextRequest) {
  try {
    // 🌟 1. ดึง Token เพื่อดูสิทธิ์ (Role)
    const token = await getToken({ req: request });

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: กรุณาล็อกอินเข้าสู่ระบบ" },
        { status: 401 },
      );
    }

    const userRole = token.role as string;
    const myEmployeeId = token.employeeId as string;

    // 🌟 2. ตรวจสอบ query string (เผื่อกรณี ADMIN ส่ง id พนักงานมาดู)
    const { searchParams } = new URL(request.url);
    const targetEmployeeId = searchParams.get("employeeId");

    let finalIdToQuery = myEmployeeId;
    if ((userRole === "ADMIN" || userRole === "HR") && targetEmployeeId) {
      finalIdToQuery = targetEmployeeId;
    }

    if (
      !finalIdToQuery ||
      finalIdToQuery === "undefined" ||
      finalIdToQuery === "null"
    ) {
      return NextResponse.json(
        { profile: null, payslips: [] },
        { status: 200 },
      );
    }

    // 🌟 3. ดึงข้อมูล Profile พนักงานแยกต่างหาก
    const employeeProfile = await prisma.employee.findFirst({
      where: {
        // 💡 ใช้ฟิลด์ 'id' และตั้งโหมด 'insensitive' เพื่อแก้ปัญหาพิมพ์เล็ก-ใหญ่ ของ Supabase/PostgreSQL
        id: {
          equals: finalIdToQuery,
          mode: "insensitive",
        },
      },
      include: {
        company: true,
      },
    });

    // 🌟 4. ดึงข้อมูลสลิปเงินเดือน
    const payslips = await prisma.payroll.findMany({
      where: {
        employeeId: finalIdToQuery,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        items: true,
        company: true,
        employee: true,
      },
    });

    // 🌟 5. ส่งกลับไปทั้ง 2 ก้อน
    return NextResponse.json(
      {
        profile: employeeProfile,
        payslips: payslips,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Fetch Payslips Error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถดึงข้อมูลได้" },
      { status: 500 },
    );
  }
}
