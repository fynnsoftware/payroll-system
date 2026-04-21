// src/app/api/companies/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js"; // 🌟 นำเข้า Supabase

// สร้างตัวแทน (Client) สำหรับคุยกับ Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// 🟡 PUT: อัปเดตข้อมูล (Edit)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }, // 🌟 1. แก้ Type ให้เป็น Promise
) {
  try {
    const resolvedParams = await params; // 🌟 2. ต้อง await แกะกล่องมันออกมาก่อน
    const id = parseInt(resolvedParams.id); // 🌟 3. ถึงจะเอา .id ไปใช้ได้

    const formData = await request.formData();

    const companyCode = formData.get("companyCode") as string;
    const companyName = formData.get("companyName") as string;
    const parentIdRaw = formData.get("parentId") as string; // เปลี่ยนชื่อตัวแปรนิดหน่อยเพื่อไม่ให้สับสน
    const file = formData.get("logoFile") as File | null;

    // ==========================================
    // 🛡️ โซนจัดการ parentId (แก้ปัญหาการย้ายบริษัท)
    // ==========================================
    let parsedParentId = null;

    // เช็กว่ามีค่าส่งมา และไม่ใช่คำว่า null หรือ undefined หรือค่าว่าง
    if (
      parentIdRaw &&
      parentIdRaw !== "null" &&
      parentIdRaw !== "undefined" &&
      parentIdRaw.trim() !== ""
    ) {
      parsedParentId = Number(parentIdRaw);

      // ดักจับ: ห้ามเอาบริษัทตัวเองไปเป็นแม่ของตัวเองเด็ดขาด! (ป้องกัน Infinite Loop)
      if (parsedParentId === id) {
        return NextResponse.json(
          { error: "ไม่สามารถเลือกตัวเองเป็นบริษัทแม่ได้ครับ" },
          { status: 400 },
        );
      }
    }
    // ==========================================

    let newLogoUrl = undefined; // ถ้าไม่มีรูปใหม่ จะได้ไม่ต้องไปแตะช่อง logoUrl เดิม

    // 📁 ถ้ามีการแนบไฟล์โลโก้ "รูปใหม่" มาด้วย
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // สร้างชื่อไฟล์
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
      const safeOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const newFilename = `${timestamp}_${safeOriginalName}`;

      // 🚀 ยิงไฟล์ขึ้น Supabase Storage (ถัง company-logos)
      const { data, error } = await supabase.storage
        .from("company-logos")
        .upload(newFilename, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error("Supabase Upload Error:", error);
        return NextResponse.json(
          { error: "อัปโหลดรูปล้มเหลว" },
          { status: 500 },
        );
      }

      // 🔗 ขอ URL แบบ Public
      const { data: publicUrlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(newFilename);

      newLogoUrl = publicUrlData.publicUrl;
    }

    // อัปเดตลง Database
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: {
        companyCode,
        companyName,
        ...(newLogoUrl && { logoUrl: newLogoUrl }), // 🌟 อัปเดตโลโก้เฉพาะตอนที่มีคนอัปโหลดรูปใหม่
        parentId: parsedParentId, // 🌟 ใช้ค่าที่ผ่านการกรองความปลอดภัยมาแล้ว
      },
    });

    return NextResponse.json(
      { message: "อัปเดตสำเร็จ!", data: updatedCompany },
      { status: 200 },
    );
  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json(
      { error: "อัปเดตไม่สำเร็จ (รหัสอาจซ้ำ)" },
      { status: 500 },
    );
  }
}

// 🔴 DELETE: ลบข้อมูล (Delete) - โค้ดเดิม
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }, // 🌟 1. แก้ Type
) {
  try {
    const resolvedParams = await params; // 🌟 2. await แกะกล่อง
    const id = parseInt(resolvedParams.id);

    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ message: "ลบข้อมูลสำเร็จ!" }, { status: 200 });
  } catch (error: any) {
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "ไม่สามารถลบได้ เนื่องจากมีบริษัทลูกสังกัดอยู่" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "ลบข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
