// src/app/admin/(dashboard)/summary/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BiCalendar, BiFile, BiTable, BiMoney, BiLineChartDown, 
  BiUser, BiReceipt, BiCheckCircle, BiUpload, BiBuildings, 
  BiX, BiSearch, BiFilter 
} from 'react-icons/bi';
import * as XLSX from 'xlsx';

export default function SalarySummary() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('summary');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const [batches, setBatches] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  const [empModal, setEmpModal] = useState<{isOpen: boolean, empId: string, empName: string, payslips: any[], isLoading: boolean}>({
    isOpen: false, empId: '', empName: '', payslips: [], isLoading: false
  });

  useEffect(() => {
    fetchBatches(selectedYear);
    fetchCompanies();
  }, [selectedYear]);

  const fetchBatches = async (year: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/payroll/batches?year=${year}`);
      if (res.ok) setBatches(await res.json());
    } catch (error) {
      console.error("Error fetching batches:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies');
      if (res.ok) setCompanies(await res.json());
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const handleViewPayslips = async (empId: string, empName: string) => {
    setEmpModal({ isOpen: true, empId, empName, payslips: [], isLoading: true });
    try {
      const res = await fetch(`/api/admin/employees/${empId}/payslips`);
      if (res.ok) {
        const data = await res.json();
        setEmpModal(prev => ({ ...prev, payslips: data, isLoading: false }));
      } else {
        alert('ดึงข้อมูลสลิปไม่สำเร็จ');
        setEmpModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
      setEmpModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const filteredBatches = useMemo(() => {
    if (selectedCompany === 'all') return batches;
    const targetId = Number(selectedCompany);
    const allowedCompanyIds = [
      targetId,
      ...companies.filter(c => c.parentId === targetId).map(c => c.id)
    ];
    return batches.filter(b => allowedCompanyIds.includes(b.companyId));
  }, [batches, selectedCompany, companies]);

  const searchedBatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredBatches;
    return filteredBatches.map(batch => ({
      ...batch,
      records: batch.records.filter((r: any) => 
        (r.employeeId && r.employeeId.toLowerCase().includes(q)) ||
        (r.name && r.name.toLowerCase().includes(q))
      )
    }));
  }, [filteredBatches, searchQuery]);

  const summaryData = useMemo(() => {
    let gross = 0; let deduct = 0; let net = 0; let empIds = new Set();
    searchedBatches.forEach(batch => {
      batch.records.forEach((record: any) => {
        empIds.add(record.employeeId);
        gross += Number(record.totalEarnings || 0);
        deduct += Number(record.totalDeduction || 0);
        net += Number(record.payrollAmount || 0);
      });
    });
    return { gross, deduct, net, emp: empIds.size };
  }, [searchedBatches]);

  const { crossTabRows, companyTotal } = useMemo(() => {
    const monthsList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const employeeSummary: Record<string, any> = {};
    const cTotal: any = { months: {}, ytd: { income: 0, deduct: 0, tax: 0, sso: 0, pvf: 0 } };

    monthsList.forEach(m => cTotal.months[m] = { income: 0, deduct: 0, tax: 0, sso: 0, pvf: 0 });

    searchedBatches.forEach(batch => {
      const m = batch.month; 
      batch.records.forEach((r: any) => {
        const empId = r.employeeId || 'UNKNOWN';
        if (!employeeSummary[empId]) {
          employeeSummary[empId] = {
            id: empId, name: r.name, months: {},
            ytd: { income: 0, deduct: 0, tax: 0, sso: 0, pvf: 0 }
          };
          monthsList.forEach(mon => employeeSummary[empId].months[mon] = { income: 0, deduct: 0, tax: 0, sso: 0, pvf: 0 });
        }

        const income = Number(r.totalEarnings || 0);
        const deduct = Number(r.totalDeduction || 0);
        const tax = Number(r.tax || 0);
        const sso = Number(r.socialSecurityFund || 0);
        const pvf = Number(r.providentFund || 0);

        if (employeeSummary[empId].months[m]) {
          employeeSummary[empId].months[m].income += income;
          employeeSummary[empId].months[m].deduct += deduct;
          employeeSummary[empId].months[m].tax += tax;
          employeeSummary[empId].months[m].sso += sso;
          employeeSummary[empId].months[m].pvf += pvf;
        }
        employeeSummary[empId].ytd.income += income;
        employeeSummary[empId].ytd.deduct += deduct;
        employeeSummary[empId].ytd.tax += tax;
        employeeSummary[empId].ytd.sso += sso;
        employeeSummary[empId].ytd.pvf += pvf;

        if (cTotal.months[m]) {
          cTotal.months[m].income += income;
          cTotal.months[m].deduct += deduct;
          cTotal.months[m].tax += tax;
          cTotal.months[m].sso += sso;
          cTotal.months[m].pvf += pvf;
        }
        cTotal.ytd.income += income;
        cTotal.ytd.deduct += deduct;
        cTotal.ytd.tax += tax;
        cTotal.ytd.sso += sso;
        cTotal.ytd.pvf += pvf;
      });
    });

    return {
      crossTabRows: Object.values(employeeSummary).sort((a: any, b: any) => a.id.localeCompare(b.id)),
      companyTotal: cTotal
    };
  }, [searchedBatches]);

  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const fmt = (num: number) => num && num > 0 ? num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';

  // 🌟 [Aggregated Records] แก้ปัญหา Duplicate ใน Tab 2, 3, 4 โดยการยุบรวมเป็นรายคน
  const allRecords = useMemo(() => {
    const empMap = new Map<string, any>();
    
    searchedBatches.forEach(batch => {
      batch.records.forEach((r: any) => {
        const empId = r.employeeId;
        if (!empId) return;

        if (!empMap.has(empId)) {
          // ถ้าเป็นข้อมูลพนักงานใหม่ ให้เก็บชุดตั้งต้นไว้
          empMap.set(empId, { 
            ...r,
            salary: Number(r.salary || 0),
            overtime: Number(r.overtime || 0),
            bonus: Number(r.bonus || 0),
            mobileAllowance: Number(r.mobileAllowance || 0),
            housingTravelingAllowance: Number(r.housingTravelingAllowance || 0),
            totalEarnings: Number(r.totalEarnings || 0),
            tax: Number(r.tax || 0),
            socialSecurityFund: Number(r.socialSecurityFund || 0),
            providentFund: Number(r.providentFund || 0),
            studentLoanFund: Number(r.studentLoanFund || 0),
            totalDeduction: Number(r.totalDeduction || 0),
          });
        } else {
          // ถ้ามีพนักงานคนนี้อยู่แล้ว (จากรอบเดือนอื่น) ให้บวกยอดเงินเพิ่มเข้าไป (YTD)
          const emp = empMap.get(empId);
          emp.salary += Number(r.salary || 0);
          emp.overtime += Number(r.overtime || 0);
          emp.bonus += Number(r.bonus || 0);
          emp.mobileAllowance += Number(r.mobileAllowance || 0);
          emp.housingTravelingAllowance += Number(r.housingTravelingAllowance || 0);
          emp.totalEarnings += Number(r.totalEarnings || 0);
          emp.tax += Number(r.tax || 0);
          emp.socialSecurityFund += Number(r.socialSecurityFund || 0);
          emp.providentFund += Number(r.providentFund || 0);
          emp.studentLoanFund += Number(r.studentLoanFund || 0);
          emp.totalDeduction += Number(r.totalDeduction || 0);
        }
      });
    });

    return Array.from(empMap.values()).sort((a, b) => a.employeeId.localeCompare(b.employeeId));
  }, [searchedBatches]);

  const handleExport = () => {
    if (crossTabRows.length === 0) return alert("ไม่มีข้อมูลให้ Export ครับ");
    setIsExporting(true);

    try {
      const exportData = crossTabRows.map((emp: any) => {
        const row: any = { 'Employee ID': emp.id, 'Name': emp.name };
        [1,2,3,4,5,6,7,8,9,10,11,12].forEach(m => {
          const mName = monthNames[m-1].substring(0, 3);
          row[`${mName} Income`] = emp.months[m].income || 0;
          row[`${mName} Total Deduct`] = emp.months[m].deduct || 0;
          row[`${mName} Tax`] = emp.months[m].tax || 0;
          row[`${mName} SSO`] = emp.months[m].sso || 0;
          row[`${mName} PVF`] = emp.months[m].pvf || 0;
        });
        row['YTD Total Income'] = emp.ytd.income || 0;
        row['YTD Total Deduct'] = emp.ytd.deduct || 0;
        row['YTD Tax'] = emp.ytd.tax || 0;
        row['YTD SSO'] = emp.ytd.sso || 0;
        row['YTD PVF'] = emp.ytd.pvf || 0;
        return row;
      });

      const totalRow: any = { 'Employee ID': 'COMPANY TOTAL', 'Name': '' };
      [1,2,3,4,5,6,7,8,9,10,11,12].forEach(m => {
        const mName = monthNames[m-1].substring(0, 3);
        totalRow[`${mName} Income`] = companyTotal.months[m].income || 0;
        totalRow[`${mName} Total Deduct`] = companyTotal.months[m].deduct || 0;
        totalRow[`${mName} Tax`] = companyTotal.months[m].tax || 0;
        totalRow[`${mName} SSO`] = companyTotal.months[m].sso || 0;
        totalRow[`${mName} PVF`] = companyTotal.months[m].pvf || 0;
      });
      totalRow['YTD Total Income'] = companyTotal.ytd.income || 0;
      totalRow['YTD Total Deduct'] = companyTotal.ytd.deduct || 0;
      totalRow['YTD Tax'] = companyTotal.ytd.tax || 0;
      totalRow['YTD SSO'] = companyTotal.ytd.sso || 0;
      totalRow['YTD PVF'] = companyTotal.ytd.pvf || 0;
      exportData.push(totalRow);

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Salary_Summary");
      
      const companyLabel = selectedCompany === 'all' ? 'All_Companies' : `Company_${selectedCompany}`;
      XLSX.writeFile(wb, `Salary_Summary_${selectedYear}_${companyLabel}.xlsx`);

      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 3000);
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการ Export ไฟล์ครับ");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl relative">
      <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        
        {/* HEADER & FILTER BAR */}
        <div className="mb-6 rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:px-6 md:py-5 border-b border-slate-100">
            <h4 className="flex items-center text-xl md:text-2xl font-bold text-blue-600">
              <BiFile className="mr-2 text-3xl" /> 
              Salary Summary <span className="hidden md:inline-block ml-2 text-slate-400 font-medium text-lg">(Cross-Tab)</span>
            </h4>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button onClick={() => router.push('/admin/import')} className="flex-1 md:flex-none flex items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 text-sm font-bold shadow-sm transition hover:bg-blue-100 hover:-translate-y-0.5 whitespace-nowrap">
                <BiUpload className="mr-2 text-lg" /> Import Data
              </button>
              <button onClick={handleExport} disabled={isExporting || crossTabRows.length === 0} className={`flex-1 md:flex-none flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-all duration-300 whitespace-nowrap ${exportComplete ? 'bg-emerald-500 text-white' : 'border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:-translate-y-0.5'} ${(isExporting || crossTabRows.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isExporting ? <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span> Exporting...</> : exportComplete ? <><BiCheckCircle className="mr-2 text-lg" /> Downloaded</> : <><BiFile className="mr-2 text-lg" /> Export Excel</>}
              </button>
            </div>
          </div>

          <div className="bg-slate-50/50 p-4 md:px-6 md:py-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4">
              
              <div className="hidden lg:flex items-center text-sm font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-2">
                <BiFilter className="mr-1 text-lg" /> Filters:
              </div>

              <div className="flex items-center bg-white hover:bg-slate-50 transition-colors border border-slate-200 rounded-xl px-3 py-2 w-full lg:w-auto shrink-0 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50">
                <BiCalendar className="text-slate-400 text-lg mr-2" />
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer w-full appearance-none"
                >
                  <option value={new Date().getFullYear().toString()}>{new Date().getFullYear()} (Current)</option>
                  <option value={(new Date().getFullYear() - 1).toString()}>{new Date().getFullYear() - 1}</option>
                  <option value={(new Date().getFullYear() - 2).toString()}>{new Date().getFullYear() - 2}</option>
                </select>
              </div>

              <div className="flex items-center bg-white hover:bg-slate-50 transition-colors border border-slate-200 rounded-xl px-3 py-2 w-full lg:w-[220px] shrink-0 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50">
                <BiBuildings className="text-slate-400 text-lg mr-2" />
                <select 
                  value={selectedCompany} 
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer w-full truncate appearance-none"
                >
                  <option value="all">All Companies</option>
                  {companies.filter(c => !c.parentId).map(primary => (
                    <optgroup key={primary.id} label={`🏢 ${primary.companyName}`}>
                      <option value={primary.id}>🏢 {primary.companyName} (All)</option>
                      {companies.filter(c => c.parentId === primary.id).map(sub => (
                        <option key={sub.id} value={sub.id}>↳ {sub.companyName}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="relative w-full flex-grow">
                <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                <input 
                  type="text" 
                  placeholder="Search by EMP ID, Name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-9 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400 shadow-sm"
                />
                {searchQuery && (
                  <BiX 
                    onClick={() => setSearchQuery('')} 
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-full cursor-pointer text-xl transition-colors" 
                  />
                )}
              </div>
              
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg shadow-blue-500/30 transition-transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
            <h6 className="mb-2 text-sm font-semibold text-blue-100 relative z-10">Total Gross Income</h6>
            <h3 className="text-3xl font-black tracking-tight relative z-10 flex items-baseline">
              <span className="text-xl mr-1.5 opacity-80">฿</span> {summaryData.gross.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </h3>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-red-500 to-red-600 p-6 text-white shadow-lg shadow-red-500/30 transition-transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
            <h6 className="mb-2 text-sm font-semibold text-red-100 relative z-10">Total Deductions</h6>
            <h3 className="text-3xl font-black tracking-tight relative z-10 flex items-baseline">
              <span className="text-xl mr-1.5 opacity-80">฿</span> {summaryData.deduct.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </h3>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg shadow-emerald-500/30 transition-transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
            <h6 className="mb-2 text-sm font-semibold text-emerald-100 relative z-10">Net Income (Payable)</h6>
            <h3 className="text-3xl font-black tracking-tight relative z-10 flex items-baseline">
              <span className="text-xl mr-1.5 opacity-80">฿</span> {summaryData.net.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </h3>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white shadow-lg shadow-amber-500/30 transition-transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
            <h6 className="mb-2 text-sm font-semibold text-amber-100 relative z-10">Total Employees</h6>
            <h3 className="text-3xl font-black tracking-tight relative z-10">
              {summaryData.emp} <span className="text-base font-medium text-amber-200">Persons</span>
            </h3>
          </div>
        </div>

        {/* Tabs Container */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
            <button onClick={() => setActiveTab('summary')} className={`flex items-center rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${activeTab === 'summary' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><BiTable className="mr-2 text-lg" /> Summary Cross-Tab</button>
            <button onClick={() => setActiveTab('income')} className={`flex items-center rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${activeTab === 'income' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><BiMoney className="mr-2 text-lg" /> Income Details</button>
            <button onClick={() => setActiveTab('deduction')} className={`flex items-center rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${activeTab === 'deduction' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><BiLineChartDown className="mr-2 text-lg" /> TAX / SSO / PVF</button>
            <button onClick={() => setActiveTab('people')} className={`flex items-center rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${activeTab === 'people' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><BiUser className="mr-2 text-lg" /> People Profile</button>
          </div>

          <div className="animate-in fade-in duration-300">
            
            {/* Tab 1: Summary Cross-Tab */}
            {activeTab === 'summary' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[600px] shadow-sm relative custom-scrollbar">
                <table className="w-full text-sm whitespace-nowrap border-collapse">
                  <thead className="sticky top-0 z-40 bg-slate-50 shadow-sm">
                    <tr>
                      <th rowSpan={2} className="sticky left-0 z-50 bg-slate-50 px-6 py-4 align-middle text-xs font-bold uppercase tracking-wider text-slate-600 border-r border-b border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[280px]">
                        Employee Info
                      </th>
                      {monthNames.map(month => (
                        <th key={month} colSpan={2} className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wider bg-blue-50/50 text-blue-800 border-r border-b border-blue-100">
                          {month}
                        </th>
                      ))}
                      <th colSpan={4} className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border-b border-emerald-200">
                        Year-To-Date (YTD) Total
                      </th>
                    </tr>
                    <tr className="bg-white">
                      {monthNames.map((_, i) => (
                        <span key={`sub-${i}`} className="contents">
                          <th className="px-4 py-2 text-[10px] font-bold border-b border-slate-200 text-slate-500 bg-white">INCOME</th>
                          <th className="px-4 py-2 text-[10px] font-bold border-r border-b border-slate-200 text-red-400 bg-white">DEDUCT</th>
                        </span>
                      ))}
                      <th className="px-4 py-2 text-[10px] font-bold border-b border-emerald-200 text-emerald-600 bg-emerald-50/50">TOTAL INCOME</th>
                      <th className="px-4 py-2 text-[10px] font-bold border-b border-emerald-200 text-red-600 bg-red-50/50">TOTAL DEDUCT</th>
                      <th className="px-4 py-2 text-[10px] font-bold border-b border-emerald-200 text-amber-600 bg-amber-50/50">TOTAL SSO</th>
                      <th className="px-4 py-2 text-[10px] font-bold border-b border-emerald-200 text-cyan-600 bg-cyan-50/50">TOTAL PVF</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {crossTabRows.length === 0 ? (
                      <tr><td colSpan={29} className="py-16 text-center text-slate-400 font-medium">ไม่มีข้อมูลพนักงานตามเงื่อนไขที่ค้นหาครับ</td></tr>
                    ) : (
                      crossTabRows.map((emp: any) => (
                        <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="sticky left-0 z-30 bg-white group-hover:bg-blue-50/30 px-6 py-4 flex items-center justify-between border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors">
                            <span className="text-slate-400 text-xs font-bold mr-4 bg-slate-100 px-2 py-1 rounded">{emp.id}</span>
                            <span className="font-bold text-slate-800 truncate max-w-[150px]" title={emp.name}>{emp.name}</span>
                          </td>
                          
                          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                            <span key={`${emp.id}-${m}`} className="contents">
                              <td className="px-4 py-4 text-right font-mono font-medium text-slate-700">{fmt(emp.months[m].income)}</td>
                              <td className="px-4 py-4 text-right font-mono font-medium text-red-500 border-r border-slate-100">{fmt(emp.months[m].deduct)}</td>
                            </span>
                          ))}

                          <td className="px-4 py-4 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">{fmt(emp.ytd.income)}</td>
                          <td className="px-4 py-4 text-right font-mono font-bold text-red-700 bg-red-50/30">{fmt(emp.ytd.deduct)}</td>
                          <td className="px-4 py-4 text-right font-mono font-bold text-amber-700 bg-amber-50/30">{fmt(emp.ytd.sso)}</td>
                          <td className="px-4 py-4 text-right font-mono font-bold text-cyan-700 bg-cyan-50/30">{fmt(emp.ytd.pvf)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  {crossTabRows.length > 0 && (
                    <tfoot className="sticky bottom-0 z-40 bg-slate-50 shadow-[0_-2px_5px_rgba(0,0,0,0.05)]">
                      <tr>
                        <td className="sticky left-0 z-50 bg-slate-50 px-6 py-5 text-right font-bold text-blue-700 border-r border-t border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] uppercase tracking-wider">
                          Company Total:
                        </td>
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                          <span key={`total-${m}`} className="contents">
                            <td className="px-4 py-5 text-right font-mono font-bold text-slate-800 border-t border-slate-200">{fmt(companyTotal.months[m].income)}</td>
                            <td className="px-4 py-5 text-right font-mono font-bold text-red-600 border-r border-t border-slate-200">{fmt(companyTotal.months[m].deduct)}</td>
                          </span>
                        ))}
                        <td className="px-4 py-5 text-right font-mono font-black text-emerald-700 border-t border-slate-200 bg-emerald-100/50">{fmt(companyTotal.ytd.income)}</td>
                        <td className="px-4 py-5 text-right font-mono font-black text-red-700 border-t border-slate-200 bg-red-100/50">{fmt(companyTotal.ytd.deduct)}</td>
                        <td className="px-4 py-5 text-right font-mono font-black text-amber-700 border-t border-slate-200 bg-amber-100/50">{fmt(companyTotal.ytd.sso)}</td>
                        <td className="px-4 py-5 text-right font-mono font-black text-cyan-700 border-t border-slate-200 bg-cyan-100/50">{fmt(companyTotal.ytd.pvf)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* Tab 2: Income Details */}
            {activeTab === 'income' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="sticky top-0 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 shadow-sm z-10">
                    <tr>
                      <th className="px-6 py-4">ID</th><th className="px-6 py-4">Name</th><th className="px-6 py-4 text-right">Base Salary</th><th className="px-6 py-4 text-right">OT</th><th className="px-6 py-4 text-right">Bonus</th><th className="px-6 py-4 text-right">Allowances</th><th className="px-6 py-4 text-right text-blue-600">Total Income</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allRecords.length === 0 ? (
                       <tr><td colSpan={7} className="py-10 text-center text-slate-400">ไม่มีข้อมูลพนักงาน</td></tr>
                    ) : (
                      allRecords.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-500"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{r.employeeId}</span></td>
                          <td className="px-6 py-4 font-bold text-slate-800">{r.name}</td>
                          <td className="px-6 py-4 text-right font-mono text-slate-700">{fmt(Number(r.salary))}</td>
                          <td className="px-6 py-4 text-right font-mono text-slate-700">{fmt(Number(r.overtime))}</td>
                          <td className="px-6 py-4 text-right font-mono text-slate-700">{fmt(Number(r.bonus))}</td>
                          <td className="px-6 py-4 text-right font-mono text-slate-700">{fmt((Number(r.mobileAllowance) + Number(r.housingTravelingAllowance)))}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-blue-600 bg-blue-50/30">{fmt(Number(r.totalEarnings))}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: Deduction Details */}
            {activeTab === 'deduction' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="sticky top-0 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 shadow-sm z-10">
                    <tr>
                      <th className="px-6 py-4">ID</th><th className="px-6 py-4">Name</th><th className="px-6 py-4 text-right">TAX</th><th className="px-6 py-4 text-right">SSO</th><th className="px-6 py-4 text-right">PVF</th><th className="px-6 py-4 text-right">Student Loan (กยศ.)</th><th className="px-6 py-4 text-right text-red-600">Total Deduction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allRecords.length === 0 ? (
                       <tr><td colSpan={7} className="py-10 text-center text-slate-400">ไม่มีข้อมูลพนักงาน</td></tr>
                    ) : (
                      allRecords.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-500"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{r.employeeId}</span></td>
                          <td className="px-6 py-4 font-bold text-slate-800">{r.name}</td>
                          <td className="px-6 py-4 text-right font-mono text-slate-700">{fmt(Number(r.tax))}</td>
                          <td className="px-6 py-4 text-right font-mono text-slate-700">{fmt(Number(r.socialSecurityFund))}</td>
                          <td className="px-6 py-4 text-right font-mono text-slate-700">{fmt(Number(r.providentFund))}</td>
                          <td className="px-6 py-4 text-right font-mono text-slate-700">{fmt(Number(r.studentLoanFund))}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-red-600 bg-red-50/30">{fmt(Number(r.totalDeduction))}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 4: People Profile */}
            {activeTab === 'people' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="sticky top-0 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 shadow-sm z-10">
                    <tr>
                      <th className="px-6 py-4">ID</th><th className="px-6 py-4">Name</th><th className="px-6 py-4">Position</th><th className="px-6 py-4">Department</th><th className="px-6 py-4">Bank</th><th className="px-6 py-4">Bank Account</th><th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allRecords.length === 0 ? (
                       <tr><td colSpan={7} className="py-10 text-center text-slate-400">ไม่มีข้อมูลพนักงาน</td></tr>
                    ) : (
                      allRecords.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-500"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{r.employeeId}</span></td>
                          <td className="px-6 py-4 font-bold text-slate-800">{r.name}</td>
                          <td className="px-6 py-4 text-slate-600">{r.position || '-'}</td><td className="px-6 py-4 text-slate-600">{r.department || '-'}</td>
                          <td className="px-6 py-4 font-semibold text-slate-700">{r.bank || '-'}</td><td className="px-6 py-4 font-mono text-slate-700">{r.bankAccount || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => handleViewPayslips(r.employeeId, r.name)} 
                              className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600 shadow-sm transition hover:bg-blue-600 hover:text-white"
                            >
                              <BiReceipt className="inline mr-1 text-base" /> View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modal: Employee Payslip History */}
      {empModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            
            <div className="flex items-center justify-between px-8 py-5 bg-slate-800 text-white shrink-0">
              <h3 className="text-xl font-bold flex items-center">
                <div className="bg-blue-500/20 p-2 rounded-xl mr-3"><BiUser className="text-2xl text-blue-400" /></div>
                Payslip History: <span className="ml-2 font-normal">{empModal.empName}</span> <span className="ml-2 text-blue-300 text-sm font-mono">({empModal.empId})</span>
              </h3>
              <button onClick={() => setEmpModal(prev => ({ ...prev, isOpen: false }))} className="rounded-full p-2 bg-white/10 hover:bg-white/20 transition">
                <BiX className="text-2xl" />
              </button>
            </div>

            <div className="p-8 bg-slate-50 overflow-y-auto grow custom-scrollbar">
              {empModal.isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 mb-4"></div>
                  <p className="font-semibold text-lg">Loading payroll history...</p>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex items-center justify-between">
                    <p className="font-bold text-slate-600 text-lg">Total Records Found: <span className="text-blue-600 bg-blue-100 px-3 py-1 rounded-lg ml-2">{empModal.payslips.length}</span></p>
                  </div>

                  {empModal.payslips.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
                      <BiReceipt className="text-6xl mx-auto mb-4 opacity-20" />
                      No payslip records found for this employee.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs">
                          <tr>
                            <th className="px-6 py-4 font-bold">Billing Period</th>
                            <th className="px-6 py-4 text-right font-bold">Gross Income</th>
                            <th className="px-6 py-4 text-right font-bold">Deductions</th>
                            <th className="px-6 py-4 text-right font-bold text-emerald-600">Net Salary</th>
                            <th className="px-6 py-4 text-center font-bold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {empModal.payslips.map((slip) => (
                            <tr key={slip.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-5 font-bold text-slate-700 text-base">
                                {monthNames[slip.month - 1]} {slip.year}
                              </td>
                              <td className="px-6 py-5 text-right font-mono text-slate-600 text-base">฿{fmt(Number(slip.totalEarnings))}</td>
                              <td className="px-6 py-5 text-right font-mono text-red-500 text-base">฿{fmt(Number(slip.totalDeductions))}</td>
                              <td className="px-6 py-5 text-right font-mono font-bold text-emerald-600 bg-emerald-50/30 text-base">฿{fmt(Number(slip.netSalary))}</td>
                              <td className="px-6 py-5 text-center">
                                <button 
                                  onClick={() => window.open(`/employee/payslips/${slip.id}`, '_blank')}
                                  className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-600 hover:-translate-y-0.5 transition-all"
                                >
                                  View Statement
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="px-8 py-5 bg-white border-t border-slate-200 flex justify-end shrink-0">
              <button onClick={() => setEmpModal(prev => ({ ...prev, isOpen: false }))} className="rounded-xl px-8 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}