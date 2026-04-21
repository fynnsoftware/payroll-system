// src/app/api/employees/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// ==========================================
// 🟡 PUT: สำหรับ Edit ข้อมูล และเปลี่ยนสถานะ (Active/Terminate)
// ==========================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();

    const {
      fullName,
      email,
      position,
      department,
      startDate,
      companyId,
      role,
      password,
      isActive,
    } = body;

    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: "ไม่พบพนักงานในระบบ" },
        { status: 404 },
      );
    }

    // 🌟 เตรียมค่าสถานะใหม่ที่จะใช้อัปเดต
    const newIsActiveStatus =
      isActive !== undefined ? isActive : existingEmployee.isActive;

    const result = await prisma.$transaction(async (tx) => {
      // 1. อัปเดตข้อมูลฝั่ง Employee
      const updatedEmployee = await tx.employee.update({
        where: { id },
        data: {
          fullName,
          email: email || null,
          position: position || null,
          department: department || null,
          startDate:
            startDate && startDate !== "-" ? new Date(startDate) : null,
          currentCompanyId: companyId
            ? Number(companyId)
            : existingEmployee.currentCompanyId,
          isActive: newIsActiveStatus, // 🌟 เซ็ตสถานะ Employee
        },
      });

      // 2. อัปเดตข้อมูลฝั่ง User ให้สถานะตรงกัน!
      if (existingEmployee.userId) {
        const userUpdateData: any = {
          role: role
            ? role.toUpperCase()
            : existingEmployee.user?.role || "USER",
          isActive: newIsActiveStatus, // 🌟 ซิงค์สถานะ isActive ให้ตาราง User ด้วย!
        };

        if (password && password.trim() !== "") {
          userUpdateData.passwordHash = await bcrypt.hash(password, 10);
        }

        await tx.user.update({
          where: { id: existingEmployee.userId },
          data: userUpdateData,
        });
      }

      return updatedEmployee;
    });

    return NextResponse.json(
      { message: "อัปเดตข้อมูลสำเร็จ!", data: result },
      { status: 200 },
    );
  } catch (error) {
    console.error("PUT Employee Error:", error);
    return NextResponse.json(
      { error: "อัปเดตข้อมูลไม่สำเร็จ" },
      { status: 500 },
    );
  }
}

// ==========================================
// 🔴 DELETE: สำหรับลบพนักงานทิ้งถาวร
// ==========================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // หาพนักงานคนนี้ก่อนเพื่อเอา userId ไปลบในตาราง User ด้วย
    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: "ไม่พบพนักงานในระบบ" },
        { status: 404 },
      );
    }

    // 🌟 ใช้ Transaction ลบ Employee และ User คู่กัน
    await prisma.$transaction(async (tx) => {
      // 1. ลบ Employee ออกก่อน
      await tx.employee.delete({
        where: { id },
      });

      // 2. ตามไปลบบัญชี User ทิ้งด้วย (ถ้ามี)
      if (existingEmployee.userId) {
        await tx.user.delete({
          where: { id: existingEmployee.userId },
        });
      }
    });

    return NextResponse.json(
      { message: "ลบข้อมูลพนักงานสำเร็จ!" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("DELETE Employee Error:", error);

    // ดัก Error กรณีที่พนักงานคนนี้มีข้อมูลอื่นผูกอยู่ (เช่น Payroll)
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "ไม่สามารถลบได้ เนื่องจากมีข้อมูลอื่นผูกอยู่ แนะนำให้ใช้การปิดสถานะแทนครับ",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "ลบข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
