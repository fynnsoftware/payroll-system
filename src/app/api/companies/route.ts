// src/app/api/companies/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { getToken } from "next-auth/jwt";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ==========================================
// 🟢 GET: ดึงข้อมูลบริษัท (จำกัดสิทธิ์ตามเครือบริษัท)
// ==========================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const primaryOnly = searchParams.get("primaryOnly");

    const token = await getToken({ req: request });
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRole = token.role as string;
    const userCompanyId = token.companyId ? Number(token.companyId) : null;

    let allowedCompanyIds: number[] | null = null;

    // 🌟 ลอจิกจำกัดสิทธิ์ (แก้ไขตามกฎเหล็ก)
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

    const whereCondition: any = {};
    if (primaryOnly === "true") whereCondition.parentId = null;
    if (allowedCompanyIds) whereCondition.id = { in: allowedCompanyIds };

    const companies = await prisma.company.findMany({
      where: whereCondition,
      include: { parent: true, subCompanies: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json(companies, { status: 200 });
  } catch (error) {
    console.error("GET Companies Error:", error);
    return NextResponse.json(
      { error: "ดึงข้อมูลบริษัทไม่สำเร็จ" },
      { status: 500 },
    );
  }
}

// ==========================================
// 🔵 POST: สร้างบริษัทใหม่
// ==========================================
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const companyCode = formData.get("companyCode") as string;
    const companyName = formData.get("companyName") as string;
    const parentId = formData.get("parentId") as string;
    const file = formData.get("logoFile") as File | null;

    if (!companyCode || !companyName) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
        { status: 400 },
      );
    }

    let logoUrl = null;

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
      const safeOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const newFilename = `${timestamp}_${safeOriginalName}`;

      const { data, error } = await supabase.storage
        .from("company-logos")
        .upload(newFilename, buffer, { contentType: file.type, upsert: false });
      if (error)
        return NextResponse.json(
          { error: "อัปโหลดรูปล้มเหลว" },
          { status: 500 },
        );

      const { data: publicUrlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(newFilename);
      logoUrl = publicUrlData.publicUrl;
    }

    const newCompany = await prisma.company.create({
      data: {
        companyCode,
        companyName,
        logoUrl,
        parentId: parentId ? Number(parentId) : null,
      },
    });

    return NextResponse.json(
      { message: "สร้างบริษัทสำเร็จ!", data: newCompany },
      { status: 201 },
    );
  } catch (error: any) {
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "รหัสบริษัทนี้มีอยู่ในระบบแล้ว" },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "บันทึกข้อมูลไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
