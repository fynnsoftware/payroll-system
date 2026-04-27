// src/app/api/payroll/import/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

// 🌟 1. [เพิ่มใหม่] ขยายเวลา Vercel Serverless Function ให้สูงสุดที่ทำได้ (ตามแพ็กเกจที่คุณใช้ เช่น 120 หรือ 300 วิ)
export const maxDuration = 120;

// ฟังก์ชันสำหรับแปลงเลขที่บัญชี
const maskBankAccount = (account: any) => {
  if (!account) return null;
  const str = String(account).replace(/\D/g, "");
  if (str.length === 10) return `XXX-XX${str.substring(5, 9)}-X`;
  return String(account);
};

export async function POST(request: NextRequest) {
  try {
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

    // ดึงรายชื่อพนักงานทั้งหมดที่มีในระบบขึ้นมาเตรียมไว้ใน RAM ก่อน
    const allEmployees = await prisma.employee.findMany({
      select: { id: true },
    });
    const validEmpIds = new Set(allEmployees.map((e) => e.id));

    // เริ่มต้น Transaction
    const newBatch = await prisma.$transaction(
      async (tx) => {
        // ==========================================
        // 🗑️ 1. เคลียร์ข้อมูลเก่าทิ้ง
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
        // ⚙️ 3. Data Mapping
        // ==========================================
        const recordsToInsert: any[] = [];
        const payrollDataToInsert: any[] = [];
        const itemsConfigMap = new Map<string, any[]>();

        // 🌟 [แก้ใหม่] เปลี่ยนจากการเก็บคำสั่ง (Promise) มาเป็นการเก็บ "ข้อมูลดิบ" เพื่อเตรียมเอาไปแบ่งทำเป็นรอบๆ
        const rawEmployeeUpdates: any[] = [];

        for (const r of records) {
          const maskedBankAcc = maskBankAccount(r.bankAccount);
          const empId = String(r.id);

          // 3.1 เตรียมข้อมูล Log
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

            // 3.3 เตรียมข้อมูล Payroll Items ย่อย
            const items = [];
            if (Number(r.salary) > 0)
              items.push({
                itemType: "EARNING",
                category: "SALARY",
                amount: Number(r.salary),
                description: "Base Salary",
              });
            if (Number(r.mobileAllowance) > 0)
              items.push({
                itemType: "EARNING",
                category: "ALLOWANCE",
                amount: Number(r.mobileAllowance),
                description: "Mobile Allowance",
              });
            if (Number(r.housingTravelingAllowance) > 0)
              items.push({
                itemType: "EARNING",
                category: "ALLOWANCE",
                amount: Number(r.housingTravelingAllowance),
                description: "Housing/Traveling Allowance",
              });
            if (Number(r.overtime) > 0)
              items.push({
                itemType: "EARNING",
                category: "OVERTIME",
                amount: Number(r.overtime),
                description: "Overtime (OT)",
              });
            if (Number(r.bonus) > 0)
              items.push({
                itemType: "EARNING",
                category: "BONUS",
                amount: Number(r.bonus),
                description: "Bonus",
              });
            if (Number(r.others) > 0)
              items.push({
                itemType: "EARNING",
                category: "OTHER",
                amount: Number(r.others),
                description: "Other Earnings",
              });
            if (Number(r.parkingAllowance) > 0)
              items.push({
                itemType: "EARNING",
                category: "Allowance",
                amount: Number(r.parkingAllowance),
                description: "Parking Allowance",
              });
            if (Number(r.perdiemOtherAdditional) > 0)
              items.push({
                itemType: "EARNING",
                category: "Allowance",
                amount: Number(r.perdiemOtherAdditional),
                description: "Perdiem/Other",
              });

            if (Number(r.tax) > 0)
              items.push({
                itemType: "DEDUCTION",
                category: "TAX",
                amount: Number(r.tax),
                description: "Withholding Tax",
              });
            if (Number(r.socialSecurityFund) > 0)
              items.push({
                itemType: "DEDUCTION",
                category: "SSO",
                amount: Number(r.socialSecurityFund),
                description: "Social Security Fund",
              });
            if (Number(r.providentFund) > 0)
              items.push({
                itemType: "DEDUCTION",
                category: "PVF",
                amount: Number(r.providentFund),
                description: "Provident Fund",
              });
            if (Number(r.studentLoanFund) > 0)
              items.push({
                itemType: "DEDUCTION",
                category: "LOAN",
                amount: Number(r.studentLoanFund),
                description: "Student Loan (กยศ.)",
              });
            if (Number(r.parking) > 0)
              items.push({
                itemType: "DEDUCTION",
                category: "DEDUCTION",
                amount: Number(r.parking),
                description: "Parking",
              });
            if (Number(r.otherDeduction) > 0)
              items.push({
                itemType: "DEDUCTION",
                category: "OTHER",
                amount: Number(r.otherDeduction),
                description: "Other deduction",
              });

            itemsConfigMap.set(empId, items);

            // 3.4 🌟 [แก้ใหม่] เก็บแค่ข้อมูลดิบไว้ก่อน ยังไม่สร้าง Promise สั่งงาน Database
            if (r.bank || maskedBankAcc) {
              rawEmployeeUpdates.push({
                empId: empId,
                bank: r.bank || undefined,
                bankAccount: maskedBankAcc || undefined,
              });
            }
          }
        }

        // ==========================================
        // 🚀 4. ยิงข้อมูลระดับ Bulk Insert และ Chunking!
        // ==========================================

        if (payrollDataToInsert.length > 0) {
          // 4.1 ยิงสร้าง Payroll
          await tx.payroll.createMany({ data: payrollDataToInsert });

          // 4.2 ดึง ID สลิป
          const createdPayrolls = await tx.payroll.findMany({
            where: {
              month: batch.month,
              year: batch.year,
              companyId: batch.companyId,
            },
            select: { id: true, employeeId: true },
          });

          // 4.3 ประกอบร่าง ID สลิป
          const payrollItemsToInsert: any[] = [];
          for (const p of createdPayrolls) {
            const items = itemsConfigMap.get(p.employeeId) || [];
            for (const item of items) {
              payrollItemsToInsert.push({ ...item, payrollId: p.id });
            }
          }

          // 4.4 🌟 [แก้ใหม่] ยิงสร้างรายการย่อย (แบ่ง Chunk เผื่อกรณีข้อมูลเยอะเกิน)
          const chunkSize = 1000;
          for (let i = 0; i < payrollItemsToInsert.length; i += chunkSize) {
            const itemsChunk = payrollItemsToInsert.slice(i, i + chunkSize);
            await tx.payrollItem.createMany({ data: itemsChunk });
          }
        }

        // 4.5 ยิงประวัติ
        if (recordsToInsert.length > 0) {
          const chunkSize = 500;
          for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
            const recordChunk = recordsToInsert.slice(i, i + chunkSize);
            await tx.payrollImportRecord.createMany({ data: recordChunk });
          }
        }

        // 4.6 🌟 [แก้ใหม่] อัปเดตข้อมูลธนาคารพนักงานแบบแบ่ง Chunk!
        if (rawEmployeeUpdates.length > 0) {
          const updateChunkSize = 50; // ทำทีละ 50 คน
          for (let i = 0; i < rawEmployeeUpdates.length; i += updateChunkSize) {
            const chunk = rawEmployeeUpdates.slice(i, i + updateChunkSize);

            // เอาทีละ 50 คนมาสั่งอัปเดตพร้อมกัน
            await Promise.all(
              chunk.map((updateData) =>
                tx.employee.update({
                  where: { id: updateData.empId },
                  data: {
                    bank: updateData.bank,
                    bankAccount: updateData.bankAccount,
                  },
                }),
              ),
            );
          }
        }

        // ==========================================
        // 📝 5. บันทึกประวัติ
        // ==========================================
        await tx.importLog.create({
          data: {
            filename: fileName,
            importedBy: uploaderName,
            totalRecords: records.length,
            successCount: recordsToInsert.length,
            errorCount: 0,
            status: "SUCCESS",
          },
        });

        return batch;
      },
      {
        maxWait: 15000,
        timeout: 120000, // 🌟 2. [เพิ่มใหม่] ขยายเวลา Transaction เป็น 120 วินาที (2 นาทีเต็มๆ)
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
