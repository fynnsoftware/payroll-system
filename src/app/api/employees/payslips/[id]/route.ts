// src/app/api/employees/payslips/[id]/route.ts
import { NextResponse, NextRequest } from "next/server"; // 🌟 เปลี่ยนมาใช้ NextRequest
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt"; // 🌟 ใช้ getToken จะดึง Role ได้ชัวร์กว่า

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }, // 🌟 รองรับ Next.js 15 Promise params
) {
  try {
    // 🌟 1. เช็ก Token และสิทธิ์ของผู้ใช้งาน
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: กรุณาล็อกอิน" },
        { status: 401 },
      );
    }

    const { id: payslipId } = await context.params;
    const employeeId = token.employeeId as string;
    const userRole = token.role as string;

    // 🌟 2. ดึงสลิปใบปัจจุบัน
    const payslip = await prisma.payroll.findUnique({
      where: { id: Number(payslipId) },
      include: { items: true, company: true, employee: true },
    });

    if (!payslip) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสลิป" }, { status: 404 });
    }

    // ==========================================
    // 🌟 3. ระบบรักษาความปลอดภัย (VIP Pass)
    // ==========================================
    const isOwner = payslip.employeeId === employeeId;
    const isAdmin = userRole === "ADMIN";
    let hasAccess = isOwner || isAdmin;

    // ถ้าเป็น HR ต้องเช็กเพิ่มว่าสลิปใบนี้ เป็นของพนักงานในเครือบริษัทตัวเองหรือไม่
    if (!hasAccess && userRole === "HR" && employeeId) {
      const hrEmp = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { currentCompanyId: true },
      });

      if (hrEmp) {
        const hrCompany = await prisma.company.findUnique({
          where: { id: hrEmp.currentCompanyId },
        });

        if (hrCompany) {
          const rootId = hrCompany.parentId || hrCompany.id;
          const groupCompanies = await prisma.company.findMany({
            where: { OR: [{ id: rootId }, { parentId: rootId }] },
            select: { id: true },
          });
          const allowedCompanyIds = groupCompanies.map((c) => c.id);

          // ถ้าสลิปใบนี้มาจากบริษัทในเครือเดียวกัน ให้สิทธิ์เข้าถึง!
          if (allowedCompanyIds.includes(payslip.companyId)) {
            hasAccess = true;
          }
        }
      }
    }

    // ถ้าไม่ใช่เจ้าของ ไม่ใช่แอดมิน และไม่ใช่ HR ในบริษัทนั้น -> เตะออก!
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: ไม่มีสิทธิ์เข้าถึงสลิปใบนี้" },
        { status: 403 },
      );
    }
    // ==========================================

    // 🌟 4. คำนวณ YTD (กวาดข้อมูลของปีนี้ ตั้งแต่เดือน 1 ถึงเดือนของสลิปใบนี้ มารวมกัน)
    const ytdAggregations = await prisma.payroll.aggregate({
      _sum: {
        netSalary: true,
        totalEarnings: true,
        grossWage: true,
        tax: true,
        sso: true,
        pvf: true,
      },
      where: {
        employeeId: payslip.employeeId,
        companyId: payslip.companyId,
        year: payslip.year,
        // เอาเฉพาะเดือนที่น้อยกว่าหรือเท่ากับเดือนปัจจุบัน
        month: { lte: payslip.month },
      },
    });

    // 🌟 5. แพ็กข้อมูล YTD รวมเข้าไปใน Response
    const responseData = {
      ...payslip,
      ytd: {
        netSalary: ytdAggregations._sum.netSalary || 0,
        totalEarnings: ytdAggregations._sum.totalEarnings || 0,
        grossWage: ytdAggregations._sum.grossWage || 0,
        tax: ytdAggregations._sum.tax || 0,
        sso: ytdAggregations._sum.sso || 0,
        pvf: ytdAggregations._sum.pvf || 0,
      },
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: any) {
    console.error("Fetch Payslip Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 },
    );
  }
}
