-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "companyCode" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "parentId" INTEGER,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "position" TEXT,
    "department" TEXT,
    "startDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "currentCompanyId" INTEGER NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" SERIAL NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalEarnings" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalDeductions" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "netSalary" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "grossWage" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "salary" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "tax" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "sso" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "pvf" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "employeeId" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" SERIAL NOT NULL,
    "itemType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "payrollId" INTEGER NOT NULL,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "paymentDate" TEXT,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "readyRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollImportRecord" (
    "id" SERIAL NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "employeeId" TEXT,
    "name" TEXT,
    "position" TEXT,
    "department" TEXT,
    "function" TEXT,
    "startDate" TEXT,
    "bank" TEXT,
    "bankAccount" TEXT,
    "salary" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "mobileAllowance" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "housingTravelingAllowance" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "overtime" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "bonus" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "others" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "parkingAllowance" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "perdiemOtherAdditional" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalEarnings" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "tax" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "socialSecurityFund" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "providentFund" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "studentLoanFund" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "parking" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "otherDeduction" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalDeduction" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "payrollAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_companyCode_key" ON "Company"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_currentCompanyId_fkey" FOREIGN KEY ("currentCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollImportRecord" ADD CONSTRAINT "PayrollImportRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PayrollImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
