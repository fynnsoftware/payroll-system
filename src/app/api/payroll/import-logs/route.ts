// src/app/api/payroll/import-logs/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });

    // 🌟 1. เช็กสิทธิ์ (อนุญาตให้ ADMIN และ HR ใช้งาน API นี้ได้)
    if (!token || !["ADMIN", "HR"].includes(token.role as string)) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const userRole = token.role as string;
    const userCompanyId = token.companyId ? Number(token.companyId) : null;

    let allowedCompanyIds: number[] | null = null;

    // 🌟 2. ลอจิกกรองสิทธิ์บริษัท (เหมือนใน /api/companies เป๊ะๆ)
    if (userRole === "HR" && userCompanyId) {
      const hrCompany = await prisma.company.findUnique({
        where: { id: userCompanyId },
        select: { id: true, parentId: true },
      });

      if (hrCompany) {
        if (!hrCompany.parentId) {
          // 👑 อยู่ Primary -> เห็น Primary + Sub ทั้งหมด
          const subCompanies = await prisma.company.findMany({
            where: { parentId: hrCompany.id },
            select: { id: true },
          });
          allowedCompanyIds = [hrCompany.id, ...subCompanies.map((c) => c.id)];
        } else {
          // 🏢 อยู่ Sub -> เห็นเฉพาะ Sub ตัวเองอย่างเดียว!
          allowedCompanyIds = [hrCompany.id];
        }
      }

      if (!allowedCompanyIds || allowedCompanyIds.length === 0) {
        allowedCompanyIds = [-1]; // กันพลาด
      }
    }

    // 🌟 3. นำ ID ที่ได้รับอนุญาตมาสร้างเงื่อนไข Where
    const whereCondition: any = {};
    if (allowedCompanyIds) {
      whereCondition.companyId = { in: allowedCompanyIds };
    }

    // 🌟 4. ดึงข้อมูลจาก PayrollImportBatch พร้อมแนบเงื่อนไขการกรอง
    const logs = await prisma.payrollImportBatch.findMany({
      where: whereCondition, // <--- ใช้ Filter ตรงนี้ครับ
      include: {
        company: true, // ดึงข้อมูลบริษัทมาด้วย
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error("GET Import Logs Error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถดึงข้อมูลประวัติการนำเข้าได้" },
      { status: 500 },
    );
  }
}
