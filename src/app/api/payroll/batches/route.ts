// src/app/api/payroll/batches/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  try {
    // ดึงข้อมูล Batch ตามปีที่เลือก (หรือดึงทั้งหมดถ้าไม่ได้ส่งปีมา)
    const batches = await prisma.payrollImportBatch.findMany({
      where: year ? { year: parseInt(year) } : undefined,
      orderBy: { month: "desc" }, // เรียงเดือนล่าสุดขึ้นก่อน
      include: {
        records: true, // ดึงรายละเอียดของพนักงานแต่ละคนมาด้วย
      },
    });

    return NextResponse.json(batches, { status: 200 });
  } catch (error: any) {
    console.error("Fetch Batches Error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถดึงข้อมูลสรุปได้" },
      { status: 500 },
    );
  }
}
