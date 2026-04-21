// src/app/api/setup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const hashedPassword = await bcrypt.hash("password123", 10);

    // 1. สร้าง Admin (รหัสผ่าน: password123)
    await prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        email: "admin@payroll.com",
        passwordHash: hashedPassword,
        role: "ADMIN",
      },
    });

    // 2. สร้างพนักงานทั่วไป (รหัสผ่าน: password123)
    await prisma.user.upsert({
      where: { username: "emp001" },
      update: {},
      create: {
        username: "emp001",
        email: "emp001@payroll.com",
        passwordHash: hashedPassword,
        role: "USER",
      },
    });

    return NextResponse.json({
      message: "สร้างบัญชี Admin และ พนักงาน ทดสอบสำเร็จ!",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "สร้างไม่สำเร็จ" }, { status: 500 });
  }
}
