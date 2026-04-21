// src/app/api/payroll/import/route.ts
import { NextResponse, NextRequest } from "next/server"; // 🌟 เปลี่ยนมาใช้ NextRequest
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt"; // 🌟 นำเข้า getToken

// ฟังก์ชันสำหรับแปลงเลขที่บัญชี
const maskBankAccount = (account: any) => {
  if (!account) return null;
  const str = String(account).replace(/\D/g, "");
  if (str.length === 10) return `XXX-XX${str.substring(5, 9)}-X`;
  return String(account);
};

export async function POST(request: NextRequest) {
  // 🌟 รับค่าเป็น NextRequest
  try {
    // 🌟 1. ดึงข้อมูลคนอัปโหลดจาก Token
    const token = await getToken({ req: request });
    const uploaderName =
      token?.name || (token as any)?.username || "SYSTEM ADMIN";

    const body = await request.json();
    const {
      companyId,
      period,
      paymentDate,
      records,
      fileName = "Web_Upload_Excel",
    } = body;

    const [yearStr, monthStr] = period.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const parsedCompanyId = parseInt(companyId);

    // ดึงรายชื่อพนักงานทั้งหมดที่มีในระบบขึ้นมาเตรียมไว้ใน RAM ก่อน (เร็วมาก)
    const allEmployees = await prisma.employee.findMany({
      select: { id: true },
    });
    const validEmpIds = new Set(allEmployees.map((e) => e.id));

    // เริ่มต้น Transaction
    const newBatch = await prisma.$transaction(
      async (tx) => {
        // ==========================================
        // 🗑️ 1. เคลียร์ข้อมูลเก่าทิ้ง (รวมถึง PayrollItem ที่ผูกอยู่ด้วยโหมด Cascade)
        // ==========================================
        await tx.payroll.deleteMany({
          where: { month: month, year: year, companyId: parsedCompanyId },
        });

        const existingBatches = await tx.payrollImportBatch.findMany({
          where: { companyId: parsedCompanyId, year: year, month: month },
        });

        for (const oldBatch of existingBatches) {
          await tx.payrollImportRecord.deleteMany({
            where: { batchId: oldBatch.id },
          });
          await tx.payrollImportBatch.delete({ where: { id: oldBatch.id } });
        }

        // ==========================================
        // 📦 2. สร้างข้อมูล Batch หลัก
        // ==========================================
        const batch = await tx.payrollImportBatch.create({
          data: {
            fileName,
            month,
            year,
            companyId: parsedCompanyId,
            paymentDate,
            totalRecords: records.length,
            readyRecords: records.length,
            failedRecords: 0,
            status: "COMPLETED",
            uploadedById: "SYSTEM",
          },
        });

        // ==========================================
        // ⚙️ 3. Data Mapping (ประมวลผลข้อมูลใน CPU ล้วนๆ ไม่แตะ Database เลยทำให้โคตรเร็ว)
        // ==========================================
        const recordsToInsert: any[] = [];
        const payrollDataToInsert: any[] = [];
        const itemsConfigMap = new Map<string, any[]>();
        const employeeUpdates: any[] = [];

        for (const r of records) {
          const maskedBankAcc = maskBankAccount(r.bankAccount);
          const empId = String(r.id);

          // 3.1 เตรียมข้อมูล Log สำหรับแสดงผลในแต่ละรอบบิล
          recordsToInsert.push({
            batchId: batch.id,
            rowNumber: r.rowNumber || 0,
            employeeId: empId,
            name: r.name,
            position: r.position,
            department: r.department,
            function: r.function,
            startDate: r.startDate ? String(r.startDate) : null,
            bank: r.bank,
            bankAccount: maskedBankAcc,
            salary: r.salary || 0,
            mobileAllowance: r.mobileAllowance || 0,
            housingTravelingAllowance: r.housingTravelingAllowance || 0,
            overtime: r.overtime || 0,
            bonus: r.bonus || 0,
            others: r.others || 0,
            parkingAllowance: r.parkingAllowance || 0,
            perdiemOtherAdditional: r.perdiemOtherAdditional || 0,
            totalEarnings: r.totalEarnings || 0,
            tax: r.tax || 0,
            socialSecurityFund: r.socialSecurityFund || 0,
            providentFund: r.providentFund || 0,
            studentLoanFund: r.studentLoanFund || 0,
            parking: r.parking || 0,
            otherDeduction: r.otherDeduction || 0,
            totalDeduction: r.totalDeduction || 0,
            totalAmount: r.totalAmount || 0,
            payrollAmount: r.payrollAmount || 0,
            status: "PUBLISHED",
          });

          // 3.2 เตรียมข้อมูล Payroll หลัก
          if (validEmpIds.has(empId)) {
            const calculatedGrossWage =
              (Number(r.totalEarnings) || 0) -
              (Number(r.parkingAllowance) || 0) -
              (Number(r.perdiemOtherAdditional) || 0);

            payrollDataToInsert.push({
              month: batch.month,
              year: batch.year,
              totalEarnings: r.totalEarnings || 0,
              totalDeductions: r.totalDeduction || 0,
              netSalary: r.payrollAmount || 0,
              salary: r.salary || 0,
              tax: r.tax || 0,
              sso: r.socialSecurityFund || 0,
              pvf: r.providentFund || 0,
              grossWage: calculatedGrossWage,
              employeeId: empId,
              companyId: batch.companyId,
            });

            // 3.3 เตรียมข้อมูล Payroll Items ย่อย (Earning / Deduction)
            const items = [
              ...(Number(r.salary) > 0
                ? [
                    {
                      itemType: "EARNING",
                      category: "SALARY",
                      amount: Number(r.salary),
                      description: "Base Salary",
                    },
                  ]
                : []),
              ...(Number(r.mobileAllowance) > 0
                ? [
                    {
                      itemType: "EARNING",
                      category: "ALLOWANCE",
                      amount: Number(r.mobileAllowance),
                      description: "Mobile Allowance",
                    },
                  ]
                : []),
              ...(Number(r.housingTravelingAllowance) > 0
                ? [
                    {
                      itemType: "EARNING",
                      category: "ALLOWANCE",
                      amount: Number(r.housingTravelingAllowance),
                      description: "Housing/Traveling Allowance",
                    },
                  ]
                : []),
              ...(Number(r.overtime) > 0
                ? [
                    {
                      itemType: "EARNING",
                      category: "OVERTIME",
                      amount: Number(r.overtime),
                      description: "Overtime (OT)",
                    },
                  ]
                : []),
              ...(Number(r.bonus) > 0
                ? [
                    {
                      itemType: "EARNING",
                      category: "BONUS",
                      amount: Number(r.bonus),
                      description: "Bonus",
                    },
                  ]
                : []),
              ...(Number(r.others) > 0
                ? [
                    {
                      itemType: "EARNING",
                      category: "OTHER",
                      amount: Number(r.others),
                      description: "Other Earnings",
                    },
                  ]
                : []),
              ...(Number(r.parkingAllowance) > 0
                ? [
                    {
                      itemType: "EARNING",
                      category: "Allowance",
                      amount: Number(r.parkingAllowance),
                      description: "Parking Allowance",
                    },
                  ]
                : []),
              ...(Number(r.perdiemOtherAdditional) > 0
                ? [
                    {
                      itemType: "EARNING",
                      category: "Allowance",
                      amount: Number(r.perdiemOtherAdditional),
                      description: "Perdiem/Other",
                    },
                  ]
                : []),
              ...(Number(r.tax) > 0
                ? [
                    {
                      itemType: "DEDUCTION",
                      category: "TAX",
                      amount: Number(r.tax),
                      description: "Withholding Tax",
                    },
                  ]
                : []),
              ...(Number(r.socialSecurityFund) > 0
                ? [
                    {
                      itemType: "DEDUCTION",
                      category: "SSO",
                      amount: Number(r.socialSecurityFund),
                      description: "Social Security Fund",
                    },
                  ]
                : []),
              ...(Number(r.providentFund) > 0
                ? [
                    {
                      itemType: "DEDUCTION",
                      category: "PVF",
                      amount: Number(r.providentFund),
                      description: "Provident Fund",
                    },
                  ]
                : []),
              ...(Number(r.studentLoanFund) > 0
                ? [
                    {
                      itemType: "DEDUCTION",
                      category: "LOAN",
                      amount: Number(r.studentLoanFund),
                      description: "Student Loan (กยศ.)",
                    },
                  ]
                : []),
              ...(Number(r.parking) > 0
                ? [
                    {
                      itemType: "DEDUCTION",
                      category: "DEDUCTION",
                      amount: Number(r.parking),
                      description: "Parking",
                    },
                  ]
                : []),
              ...(Number(r.otherDeduction) > 0
                ? [
                    {
                      itemType: "DEDUCTION",
                      category: "OTHER",
                      amount: Number(r.otherDeduction),
                      description: "Other deduction",
                    },
                  ]
                : []),
            ];
            itemsConfigMap.set(empId, items);

            // 3.4 ดันคำสั่งอัปเดตพนักงานไว้ในคิว
            if (r.bank || maskedBankAcc) {
              employeeUpdates.push(
                tx.employee.update({
                  where: { id: empId },
                  data: {
                    bank: r.bank || undefined,
                    bankAccount: maskedBankAcc || undefined,
                  },
                }),
              );
            }
          }
        }

        // ==========================================
        // 🚀 4. ยิงข้อมูลระดับ Bulk Insert
        // ==========================================

        if (payrollDataToInsert.length > 0) {
          // 4.1 ยิงสร้าง Payroll
          await tx.payroll.createMany({ data: payrollDataToInsert });

          // 4.2 ดึง ID สลิปที่เพิ่งสร้างมา
          const createdPayrolls = await tx.payroll.findMany({
            where: {
              month: batch.month,
              year: batch.year,
              companyId: batch.companyId,
            },
            select: { id: true, employeeId: true },
          });

          // 4.3 ประกอบร่าง ID สลิป เข้ากับ รายการเงินได้/เงินหัก
          const payrollItemsToInsert: any[] = [];
          for (const p of createdPayrolls) {
            const items = itemsConfigMap.get(p.employeeId) || [];
            for (const item of items) {
              payrollItemsToInsert.push({ ...item, payrollId: p.id });
            }
          }

          // 4.4 ยิงสร้างรายการย่อยทั้งหมด
          if (payrollItemsToInsert.length > 0) {
            await tx.payrollItem.createMany({ data: payrollItemsToInsert });
          }
        }

        // 4.5 ยิงประวัติ PayrollImportRecord
        if (recordsToInsert.length > 0) {
          await tx.payrollImportRecord.createMany({ data: recordsToInsert });
        }

        // 4.6 อัปเดตข้อมูลธนาคารพนักงาน
        if (employeeUpdates.length > 0) {
          await Promise.all(employeeUpdates);
        }

        // ==========================================
        // 📝 5. บันทึกประวัติลงตาราง ImportLog หน้าแอดมิน!
        // ==========================================
        await tx.importLog.create({
          data: {
            filename: fileName,
            importedBy: uploaderName,
            totalRecords: records.length,
            successCount: recordsToInsert.length,
            errorCount: 0, // ส่งมาเฉพาะ Ready Records ดังนั้น Error เป็น 0
            status: "SUCCESS",
          },
        });

        return batch;
      },
      {
        maxWait: 10000,
        timeout: 60000,
      },
    );

    return NextResponse.json(
      {
        message: "นำเข้าข้อมูลและ Publish ลงระบบสำเร็จ!",
        batchId: newBatch.id,
        totalImported: records.length,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Import/Publish Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการนำเข้าข้อมูล", details: error.message },
      { status: 500 },
    );
  }
}
