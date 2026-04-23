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

    // ลูปอ่านตั้งแต่บรรทัดที่ 2 เป็นต้นไป (บรรทัดแรกคือ Header)
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i]
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map((c) => c.replace(/^"|"$/g, "").trim());

      if (cols.length >= 11 && cols[2]) {
        // 🌟 ถัาวันที่ว่างเปล่า หรือผิดฟอร์แมต ให้ใช้วันที่ปัจจุบันแทน ป้องกัน DB Error
        let dateStr = cols[9] ? cols[9].replace(/\//g, " ") : "";
        let parsedDate = dateStr ? new Date(dateStr) : new Date();
        if (isNaN(parsedDate.getTime())) {
          parsedDate = new Date();
        }

        mockEmployees.push({
          companyReg: cols[1],
          id: cols[2],
          name: cols[3],
          department: cols[4],
          position: cols[5],
          email: cols[6],
          username: cols[7],
          passwordRaw: cols[8],
          startDate: parsedDate,
          status: cols[10]?.toLowerCase(),
        });
      }
    }

    let successCount = 0;
    let skippedList: string[] = []; // 🌟 เปลี่ยนเป็นเก็บรายชื่อ EMP ID แทนการนับเฉยๆ
    let failedList: { id: string; reason: string }[] = [];

    for (const emp of mockEmployees) {
      try {
        const existingEmp = await prisma.employee.findUnique({
          where: { id: emp.id },
        });

        // ถ้ามีพนักงานคนนี้อยู่แล้ว ให้จด EMP ID ไว้ใน skippedList แล้วข้ามไปคนต่อไป
        if (existingEmp) {
          skippedList.push(emp.id);
          continue;
        }

        const isTerminated = emp.status === "t";

        // ถ้าช่องไหนใน Excel ว่าง จะกลายเป็น undefined ทันที (Prisma จะปล่อยผ่านไม่เอาลง DB)
        const validEmail =
          emp.email && emp.email.trim() !== "" ? emp.email.trim() : undefined;
        const validUsername =
          emp.username && emp.username.trim() !== ""
            ? emp.username.trim()
            : undefined;
        const validPassword =
          emp.passwordRaw && emp.passwordRaw.trim() !== ""
            ? emp.passwordRaw.trim()
            : undefined;

        // 🌟 ตรวจสอบว่า "ต้องสร้างบัญชีผู้ใช้ (User)" หรือไม่?
        // เงื่อนไขคือ: ต้องไม่เป็น 't' และต้องมี Username กับ Password ระบุมาครบ
        const shouldCreateUser =
          !isTerminated && validUsername && validPassword;

        // เช็กข้อมูลซ้ำ เฉพาะคนที่เรากำลังจะสร้าง User ให้
        if (shouldCreateUser) {
          const existingUser = await prisma.user.findUnique({
            where: { username: validUsername },
          });
          if (existingUser) {
            failedList.push({
              id: emp.id,
              reason: `Username ${validUsername} ถูกใช้งานแล้ว`,
            });
            continue;
          }

          if (validEmail) {
            const emailExists = await prisma.user.findUnique({
              where: { email: validEmail },
            });
            if (emailExists) {
              failedList.push({
                id: emp.id,
                reason: `อีเมล ${validEmail} ถูกใช้งานแล้ว`,
              });
              continue;
            }
          }
        }

        await prisma.$transaction(async (tx) => {
          let compId = 2; // Default บริษัทตั้งต้น
          const company = await tx.company.findFirst({
            where: { companyCode: emp.companyReg },
          });
          if (company) compId = company.id;

          let newUser = null;

          // 🌟 1. สร้างบัญชีสำหรับล็อกอิน (ถ้าเงื่อนไข shouldCreateUser ผ่าน)
          if (shouldCreateUser) {
            // @ts-ignore (หลบ Type Error เพราะเช็กแล้วว่า validPassword ไม่เป็น undefined แน่นอน)
            const passwordHash = await bcrypt.hash(validPassword, 10);
            newUser = await tx.user.create({
              data: {
                username: validUsername,
                email: validEmail,
                passwordHash: passwordHash,
                role: "USER",
                isActive: true,
              },
            });
          }

          // 🌟 2. สร้างประวัติพนักงาน (ถูกสร้างเสมอ ไม่ว่าจะมีอีเมลหรือ Password ไหมก็ตาม)
          await tx.employee.create({
            data: {
              id: emp.id,
              fullName: emp.name,
              position: emp.position,
              department: emp.department,
              // ถ้ายกเลิกจ้างแล้ว ไม่ต้องเก็บอีเมลลงประวัติพนักงาน
              email: isTerminated ? undefined : validEmail,
              startDate: emp.startDate,
              isActive: !isTerminated,
              currentCompanyId: compId,
              // ผูกกับบัญชีล็อกอิน (ถ้าไม่ได้ถูกสร้าง newUser ก็จะเป็น undefined ไม่ผูกบัญชี)
              userId: newUser ? newUser.id : undefined,
            },
          });
        });

        successCount++;
      } catch (err: any) {
        console.error(`Error inserting ${emp.id}:`, err.message);
        failedList.push({ id: emp.id, reason: err.message });
      }
    }

    // 🌟 ส่งผลลัพธ์พร้อมโชว์ List ออกมาทางหน้าจอ
    return NextResponse.json(
      {
        message: "ประมวลผลข้อมูลเสร็จสิ้น!",
        total_in_csv: mockEmployees.length,
        added: successCount,
        skipped_count: skippedList.length,
        skipped_details: skippedList, // 👉 โชว์เลยว่าข้าม EMP ID อะไรไปบ้าง
        failed_count: failedList.length,
        failed_details: failedList,
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
