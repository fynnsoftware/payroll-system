// src/app/api/payroll/import-logs/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(
  request: NextRequest,
  // 🌟 1. แก้ Type ตรงนี้ให้ครอบด้วย Promise
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 🌟 2. ทำการ await params ก่อนดึง id ออกมาใช้
    const { id } = await params;

    const token = await getToken({ req: request });
    if (!token || token.role !== "ADMIN") {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    // 🌟 3. ใช้ตัวแปร id ที่เราแกะมาแล้วแทน params.id
    const records = await prisma.payrollImportRecord.findMany({
      where: { batchId: id },
      orderBy: { rowNumber: "asc" },
    });

    return NextResponse.json(records, { status: 200 });
  } catch (error) {
    console.error("GET Preview Records Error:", error);
    return NextResponse.json({ error: "ดึงข้อมูลล้มเหลว" }, { status: 500 });
  }
}
