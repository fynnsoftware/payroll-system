// src/app/api/setup-mock/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "employees.csv");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        {
          error: "ไม่พบไฟล์ กรุณานำไฟล์ไปวางที่ public/employees.csv ก่อนครับ",
        },
        { status: 404 },
      );
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const lines = fileContent
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "");
    const mockEmployees = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i]
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map((c) => c.replace(/^"|"$/g, "").trim());

      if (cols.length >= 9 && cols[2]) {
        mockEmployees.push({
          companyReg: cols[1],
          id: cols[2],
          name: cols[3],
          department: cols[4],
          position: cols[5],
          email: cols[6], // ดึงข้อมูลอีเมลดิบมา
          username: cols[7],
          passwordRaw: cols[8],
        });
      }
    }

    let successCount = 0;
    let skippedCount = 0;
    let failedList: { id: string; reason: string }[] = []; // 🌟 เก็บรายชื่อคนที่ Error

    // 🌟 3. บันทึกลงฐานข้อมูล (หุ้มด้วย try-catch รายบุคคล)
    for (const emp of mockEmployees) {
      try {
        const existingEmp = await prisma.employee.findUnique({
          where: { id: emp.id },
        });
        const existingUser = await prisma.user.findUnique({
          where: { username: emp.username },
        });

        // ถ้ามีในระบบแล้วให้ข้าม
        if (existingEmp || existingUser) {
          skippedCount++;
          continue;
        }

        // 🌟 จัดการอีเมล: ถ้าว่าง ให้เป็น undefined (Prisma จะข้ามการ insert ฟิลด์นี้ไปเลย)
        const validEmail =
          emp.email && emp.email.trim() !== "" ? emp.email.trim() : undefined;

        // ถ้ามีอีเมลระบุมา ต้องเช็กด้วยว่าในระบบมีคนใช้อีเมลนี้หรือยัง
        if (validEmail) {
          const emailExists = await prisma.user.findUnique({
            where: { email: validEmail },
          });
          if (emailExists) {
            failedList.push({
              id: emp.id,
              reason: `อีเมล ${validEmail} ถูกใช้งานแล้ว`,
            });
            continue; // ข้ามคนนี้ไปทำคนถัดไป
          }
        }

        const passwordHash = await bcrypt.hash(emp.passwordRaw, 10);

        await prisma.$transaction(async (tx) => {
          let compId = 2;
          const company = await tx.company.findFirst({
            where: { companyCode: emp.companyReg },
          });
          if (company) compId = company.id;

          const newUser = await tx.user.create({
            data: {
              username: emp.username,
              email: validEmail, // ถ้าไม่มีอีเมล มันจะส่ง undefined เข้าไป ไม่เกิด Unique Error
              passwordHash: passwordHash,
              role: "USER",
              isActive: true,
            },
          });

          await tx.employee.create({
            data: {
              id: emp.id,
              fullName: emp.name,
              position: emp.position,
              department: emp.department,
              email: validEmail, // ถ้าไม่มีอีเมล ส่ง undefined
              currentCompanyId: compId,
              isActive: true,
              userId: newUser.id,
            },
          });
        });

        successCount++;
      } catch (err: any) {
        // 🌟 ถ้าระบบพังที่คนไหน จะจด ID คนนั้นเอาไว้ แล้วทำงานต่อโดยไม่หยุด
        console.error(`Error inserting ${emp.id}:`, err.message);
        failedList.push({ id: emp.id, reason: err.message });
      }
    }

    // สรุปผลรายงานออกมาทั้งหมด
    return NextResponse.json(
      {
        message: "ประมวลผลข้อมูลเสร็จสิ้น!",
        total_in_csv: mockEmployees.length,
        added: successCount,
        skipped: skippedCount,
        failed_count: failedList.length,
        failed_details: failedList, // 🌟 แสดงให้ดูว่า ID ไหนพัง เพราะอะไร
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Setup Mock Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสร้างข้อมูล", details: error.message },
      { status: 500 },
    );
  }
}
