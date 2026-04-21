// src/app/api/employees/route.ts
import { NextResponse, NextRequest } from "next/server"; // 🌟 นำเข้า NextRequest
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { getToken } from "next-auth/jwt"; // 🌟 นำเข้า getToken

// ==========================================
// 🟢 GET: ดึงข้อมูลพนักงานทั้งหมด (จำกัดสิทธิ์ HR)
// ==========================================
export async function GET(request: NextRequest) {
  try {
    // 🌟 1. อ่าน Token ของคนที่กำลังเรียก API
    const token = await getToken({ req: request });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let allowedCompanyIds: number[] | null = null;
    const userRole = token.role as string;

    // 🌟 2. ถ้าเป็น HR ให้ดึงเฉพาะพนักงานตามสิทธิ์บริษัท
    if (userRole === "HR" && token.employeeId) {
      const hrEmp = await prisma.employee.findUnique({
        where: { id: token.employeeId as string },
        select: { currentCompanyId: true },
      });

      if (hrEmp) {
        const hrCompany = await prisma.company.findUnique({
          where: { id: hrEmp.currentCompanyId },
          select: { id: true, parentId: true }, // ดึง parentId มาเช็กด้วย
        });

        if (hrCompany) {
          // 💡 ลอจิกจำกัดสิทธิ์แบบใหม่ที่ถูกต้อง
          if (!hrCompany.parentId) {
            // 👑 กรณีที่ 1: HR อยู่บริษัทแม่ (Primary) -> เห็นตัวเอง + บริษัทลูก
            const subCompanies = await prisma.company.findMany({
              where: { parentId: hrCompany.id },
              select: { id: true },
            });
            allowedCompanyIds = [
              hrCompany.id,
              ...subCompanies.map((c) => c.id),
            ];
          } else {
            // 🏢 กรณีที่ 2: HR อยู่บริษัทลูก (Sub) -> เห็นแค่บริษัทตัวเอง!
            allowedCompanyIds = [hrCompany.id];
          }
        }
      }

      // กันพลาด ถ้าหาไม่เจอให้แสดงผลเป็น -1 (ไม่เจอใครเลย)
      if (!allowedCompanyIds || allowedCompanyIds.length === 0) {
        allowedCompanyIds = [-1];
      }
    }

    // 🌟 3. ประกอบร่างเงื่อนไขการดึงข้อมูลพนักงาน
    const whereCondition = allowedCompanyIds
      ? { currentCompanyId: { in: allowedCompanyIds } }
      : {};

    const employees = await prisma.employee.findMany({
      where: whereCondition,
      include: { company: true, user: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ data: employees }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "ดึงข้อมูลพนักงานไม่สำเร็จ" },
      { status: 500 },
    );
  }
}

// ==========================================
// 🔵 POST: สร้างพนักงานใหม่ (ใช้โค้ดเดิมของคุณได้เลย)
// ==========================================
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const {
      id,
      fullName,
      email,
      position,
      department,
      startDate,
      companyId,
      role,
      username,
      password,
    } = body;

    const newRole = role ? role.toUpperCase() : "USER";
    if (token.role === "HR" && newRole === "ADMIN") {
      return NextResponse.json(
        {
          error:
            "Access Denied: สิทธิ์ HR ไม่สามารถสร้างบัญชีระดับ ADMIN ได้ครับ",
        },
        { status: 403 },
      );
    }

    if (!id || !fullName || !companyId || !username || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลสำคัญและรหัสผ่านให้ครบถ้วน" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: username,
          passwordHash: hashedPassword,
          role: role ? role.toUpperCase() : "USER",
        },
      });

      const newEmployee = await tx.employee.create({
        data: {
          id: id,
          fullName: fullName,
          email: email || null,
          position: position || null,
          department: department || null,
          startDate:
            startDate && startDate !== "-" ? new Date(startDate) : null,
          currentCompanyId: Number(companyId),
          isActive: true,
          userId: newUser.id,
        },
        include: { company: true, user: true },
      });

      return newEmployee;
    });

    if (email && email.trim() !== "") {
      try {
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });

        const emailBody = `Dear ${fullName},\n\nYou are invited to access the Payroll System. Please click the link below to log in and view your payslips:\n\n[ https://payroll.company.com/login ]\n\nUsername: ${username}\n\nIf this is your first time accessing the system, please log in using your credentials.\n\nShould you have any questions or require assistance, please contact the HR or IT Support team.\n\nBest regards,\nPayroll Administrator`;

        const info = await transporter.sendMail({
          from: '"Payroll Admin (Auto Invite)" <admin@local.com>',
          to: email,
          subject: "Invitation to Access the Payroll System",
          text: emailBody,
        });

        console.log("----------------------------------------");
        console.log(
          `📧 ส่งอีเมล Invite อัตโนมัติให้คุณ ${fullName} เรียบร้อย!`,
        );
        console.log(
          "👀 คลิกที่ลิ้งก์นี้เพื่อดูอีเมล: %s",
          nodemailer.getTestMessageUrl(info),
        );
        console.log("----------------------------------------");
      } catch (emailError) {
        console.error("⚠️ ไม่สามารถส่งอีเมลอัตโนมัติได้:", emailError);
      }
    }

    return NextResponse.json(
      { message: "สร้างพนักงานและบัญชีผู้ใช้สำเร็จ!", data: result },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST Employee Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "รหัสพนักงาน หรือ Username นี้มีในระบบแล้ว" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "บันทึกข้อมูลไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
