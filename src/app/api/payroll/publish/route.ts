// src/app/api/payroll/publish/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { batchId } = await request.json();

    if (!batchId) {
      return NextResponse.json(
        { error: "ไม่พบรหัสอ้างอิง Batch" },
        { status: 400 },
      );
    }

    // 1. ตรวจสอบ Batch ว่ามีอยู่จริงและสถานะพร้อม Publish
    const batch = await prisma.payrollImportBatch.findUnique({
      where: { id: batchId },
      include: {
        records: {
          where: { status: "READY" }, // ดึงเฉพาะคนที่พร้อมใช้งาน
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูล Batch นี้ในระบบ" },
        { status: 404 },
      );
    }

    if (batch.status === "COMPLETED") {
      return NextResponse.json(
        { error: "ข้อมูลรอบบิลนี้ถูก Publish ไปแล้วครับ" },
        { status: 400 },
      );
    }

    // 2. ใช้ Transaction เพื่อความปลอดภัย (กวาดลง Prod ทีเดียว)
    await prisma.$transaction(async (tx) => {
      // 🌟 เคลียร์ Payroll ของจริง (Production) ของเดือน/ปี และบริษัทนี้ทิ้งก่อน (ถ้ามี)
      // ป้องกันกรณี HR กดยกเลิก Publish แล้ว Publish ใหม่ จะได้ไม่เกิดสลิปเงินเดือนซ้ำซ้อน
      await tx.payroll.deleteMany({
        where: {
          month: batch.month,
          year: batch.year,
          companyId: batch.companyId,
        },
      });

      // ดึงรายชื่อรหัสพนักงานที่มีอยู่จริงในระบบ มาเช็กก่อน (กัน Error กรณีใส่รหัสมั่วใน Excel)
      const allEmployees = await tx.employee.findMany({ select: { id: true } });
      const validEmpIds = new Set(allEmployees.map((e) => e.id));

      // 🌟 วนลูปสร้าง Payslip ให้พนักงานทีละคน
      for (const record of batch.records) {
        if (!validEmpIds.has(record.employeeId!)) continue; // ถ้าไม่มีรหัสพนักงานคนนี้ในระบบ ให้ข้ามไป

        // ใช้การสร้างแบบ Nested Create (สร้างหัว Payroll และหาง PayrollItem ไปพร้อมกันในคำสั่งเดียว)
        await tx.payroll.create({
          data: {
            month: batch.month,
            year: batch.year,
            totalEarnings: record.totalEarnings,
            totalDeductions: record.totalDeduction,
            netSalary: record.payrollAmount,
            salary: record.salary,
            tax: record.tax,
            sso: record.socialSecurityFund,
            pvf: record.providentFund,
            employeeId: record.employeeId!,
            companyId: batch.companyId,

            // แตกรายละเอียดรายได้และรายหัก ลงตาราง PayrollItem
            items: {
              create: [
                // --- หมวดรายรับ (Earnings) - กรองเฉพาะค่าที่มากกว่า 0 ---
                ...(Number(record.salary) > 0
                  ? [
                      {
                        itemType: "EARNING",
                        category: "SALARY",
                        amount: record.salary,
                        description: "Base Salary",
                      },
                    ]
                  : []),
                ...(Number(record.mobileAllowance) > 0
                  ? [
                      {
                        itemType: "EARNING",
                        category: "ALLOWANCE",
                        amount: record.mobileAllowance,
                        description: "Mobile Allowance",
                      },
                    ]
                  : []),
                ...(Number(record.housingTravelingAllowance) > 0
                  ? [
                      {
                        itemType: "EARNING",
                        category: "ALLOWANCE",
                        amount: record.housingTravelingAllowance,
                        description: "Housing/Traveling Allowance",
                      },
                    ]
                  : []),
                ...(Number(record.overtime) > 0
                  ? [
                      {
                        itemType: "EARNING",
                        category: "OVERTIME",
                        amount: record.overtime,
                        description: "Overtime (OT)",
                      },
                    ]
                  : []),
                ...(Number(record.bonus) > 0
                  ? [
                      {
                        itemType: "EARNING",
                        category: "BONUS",
                        amount: record.bonus,
                        description: "Bonus",
                      },
                    ]
                  : []),
                ...(Number(record.others) > 0
                  ? [
                      {
                        itemType: "EARNING",
                        category: "OTHER",
                        amount: record.others,
                        description: "Other Earnings",
                      },
                    ]
                  : []),
                ...(Number(record.parkingAllowance) > 0
                  ? [
                      {
                        itemType: "EARNING",
                        category: "ALLOWANCE",
                        amount: record.parkingAllowance,
                        description: "Parking Allowance",
                      },
                    ]
                  : []),
                ...(Number(record.perdiemOtherAdditional) > 0
                  ? [
                      {
                        itemType: "EARNING",
                        category: "ALLOWANCE",
                        amount: record.perdiemOtherAdditional,
                        description: "Perdiem/Additional",
                      },
                    ]
                  : []),

                // --- หมวดรายจ่าย (Deductions) - กรองเฉพาะค่าที่มากกว่า 0 ---
                ...(Number(record.tax) > 0
                  ? [
                      {
                        itemType: "DEDUCTION",
                        category: "TAX",
                        amount: record.tax,
                        description: "Withholding Tax",
                      },
                    ]
                  : []),
                ...(Number(record.socialSecurityFund) > 0
                  ? [
                      {
                        itemType: "DEDUCTION",
                        category: "SSO",
                        amount: record.socialSecurityFund,
                        description: "Social Security Fund",
                      },
                    ]
                  : []),
                ...(Number(record.providentFund) > 0
                  ? [
                      {
                        itemType: "DEDUCTION",
                        category: "PVF",
                        amount: record.providentFund,
                        description: "Provident Fund",
                      },
                    ]
                  : []),
                ...(Number(record.studentLoanFund) > 0
                  ? [
                      {
                        itemType: "DEDUCTION",
                        category: "LOAN",
                        amount: record.studentLoanFund,
                        description: "Student Loan (กยศ.)",
                      },
                    ]
                  : []),
                ...(Number(record.parking) > 0
                  ? [
                      {
                        itemType: "DEDUCTION",
                        category: "OTHER",
                        amount: record.parking,
                        description: "Parking Deduction",
                      },
                    ]
                  : []),
                ...(Number(record.otherDeduction) > 0
                  ? [
                      {
                        itemType: "DEDUCTION",
                        category: "OTHER",
                        amount: record.otherDeduction,
                        description: "Other Deductions",
                      },
                    ]
                  : []),
              ],
            },
          },
        });
      }

      // 3. อัปเดตสถานะ Batch กลับเป็น COMPLETED (แปลว่า Publish ลง Prod แล้ว)
      await tx.payrollImportBatch.update({
        where: { id: batchId },
        data: { status: "COMPLETED" },
      });

      // (Optional) เปลี่ยนสถานะหางบิลใน Staging เป็น PUBLISHED เพื่อความชัดเจน
      await tx.payrollImportRecord.updateMany({
        where: { batchId: batchId, status: "READY" },
        data: { status: "PUBLISHED" },
      });
    });

    return NextResponse.json(
      { message: "Publish ข้อมูลเข้าสู่ระบบเงินเดือนพนักงานสำเร็จแล้ว!" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Publish Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการ Publish", details: error.message },
      { status: 500 },
    );
  }
}
