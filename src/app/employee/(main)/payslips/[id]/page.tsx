// src/app/employee/payslips/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { BiArrowBack, BiPrinter } from 'react-icons/bi';
import { useSession } from 'next-auth/react';

export default function PayslipDetail() {
  const router = useRouter();
  const { id } = useParams();
  const { data: session, status } = useSession();

  const [payslip, setPayslip] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // 🌟 ดึงข้อมูลจาก API
  useEffect(() => {
    if (status === 'authenticated' && id) {
      fetchPayslipDetail();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status, id]);

  const fetchPayslipDetail = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/employees/payslips/${id}`);
      if (res.ok) {
        setPayslip(await res.json());
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      }
    } catch (error) {
      setErrorMsg('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const fmt = (num: number) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#525659]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-400 border-t-white"></div>
        <p className="mt-4 font-semibold text-white">Loading your payslip...</p>
      </div>
    );
  }

  if (!session || errorMsg) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#525659] p-6 text-center">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl">
          <h2 className="mb-2 text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-gray-600">{errorMsg || 'กรุณาล็อกอินเข้าสู่ระบบ'}</p>
          <button onClick={() => router.push('/employee/payslips')} className="mt-6 w-full rounded bg-gray-800 px-4 py-2 font-bold text-white hover:bg-gray-900">
            กลับไปหน้ารายการ
          </button>
        </div>
      </div>
    );
  }

  if (!payslip) return null;

  // 🌟 ฟังก์ชันช่วยดึงค่าจากรายการใน items มาแสดง (ถ้าไม่มีให้คืนค่า 0)
  const getVal = (type: string, keyword: string) => {
    const item = payslip.items?.find((i: any) => 
      i.itemType === type && i.description.toLowerCase().includes(keyword.toLowerCase())
    );
    return item ? Number(item.amount) : 0;
  };

  // 🌟 ล็อกรายการรายได้ตายตัว ตามแบบฟอร์มเดิม
  const fixedEarnings = [
    { label: 'Base Salary', amount: payslip.salary || getVal('EARNING', 'Salary') },
    { label: 'Mobile Allowance', amount: getVal('EARNING', 'Mobile') },
    { label: 'Housing/Traveling Allowance', amount: getVal('EARNING', 'Housing') },
    { label: 'Overtime', amount: getVal('EARNING', 'Overtime') },
    { label: 'Bonus', amount: getVal('EARNING', 'Bonus') },
    { label: 'Others', amount: getVal('EARNING', 'Other Earnings') },
    { label: 'Parking Allowance', amount: getVal('EARNING', 'Parking Allowance') },
    { label: 'Perdiem/Others', amount: getVal('EARNING', 'Perdiem') }
  ];

  // 🌟 ล็อกรายการรายหักตายตัว ตามแบบฟอร์มเดิม
  const fixedDeductions = [
    { label: 'Tax', amount: payslip.tax || getVal('DEDUCTION', 'Tax') },
    { label: 'Social Security Fund', amount: payslip.sso || getVal('DEDUCTION', 'Social') },
    { label: 'Provident Fund', amount: payslip.pvf || getVal('DEDUCTION', 'Provident') },
    { label: 'Student Loan Fund', amount: getVal('DEDUCTION', 'Student') },
    { label: 'Parking', amount: getVal('DEDUCTION', 'Parking') },
    { label: 'Other deduction', amount: getVal('DEDUCTION', 'Other Deduction') }
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 0; 
          }
          html, body {
            width: auto !important;
            height: auto !important; 
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact;
          }
        }
      `}} />

      <div className="min-h-screen bg-[#525659] pb-8 font-sans print:block print:min-h-0 print:bg-white print:pb-0">
        
        {/* Header Action Bar */}
        <div className="sticky top-0 z-50 flex items-center justify-between bg-[#333639] p-4 shadow-md print:hidden">
          <button onClick={() => router.back()} className="flex items-center rounded border border-gray-500 px-4 py-1.5 text-sm text-white transition hover:bg-gray-700">
            <BiArrowBack className="mr-2" /> Back to Summary
          </button>
          <button onClick={() => window.print()} className="flex items-center rounded bg-blue-600 px-5 py-1.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700">
            <BiPrinter className="mr-2 text-lg" /> Print / Save PDF
          </button>
        </div>

        {/* 📄 Paper A4 */}
        {/* 🌟 ปลด class relative ออกด้วยเพื่อความชัวร์ จะได้ไม่มีปัญหาเกี่ยวเนื่องกับ absolute */}
        <div className="mx-auto mt-8 flex min-h-[297mm] w-[210mm] flex-col rounded bg-white p-[15mm_20mm] text-black shadow-2xl print:m-0 print:h-auto print:min-h-0 print:w-full print:rounded-none print:border-0 print:p-[10mm_15mm] print:shadow-none">
          
          {/* Header สลิป */}
          <div className="mb-5 flex items-start justify-between border-b-2 border-blue-600 pb-3">
            <div className="text-right">
              {/* ใช้โลโก้เดิมของคุณ */}
              <Image src={decodeURIComponent(payslip.company?.logoUrl) || "/src/logoFynnSoft.jpg"} alt="Company Logo" width={140} height={60} className="h-[60px] w-auto object-contain" />
            </div>
            <div className="px-4">
              <h4 className="text-xl font-bold text-[#0d47a1]">{payslip.company?.companyName || 'Company Name'}</h4>
              <p className="text-xs text-gray-500">Company Registration No. {payslip.company?.companyCode || '0105558142544'}</p>
            </div>
            <div className="text-right">
              <h6 className="text-lg font-bold text-[#0d47a1]">Salary Slip</h6>
              <p className="text-xs text-gray-500">Period: {monthNames[payslip.month - 1]} {payslip.year}</p>
            </div>
          </div>

          {/* ข้อมูลพนักงาน */}
          <div className="mb-5 grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-1">
              <div className="flex"><div className="w-32 font-bold text-gray-800">Name :</div><div>{payslip.employee?.fullName || payslip.employee?.name || '-'}</div></div>
              <div className="flex"><div className="w-32 font-bold text-gray-800">Employee ID :</div><div>{payslip.employeeId}</div></div>
              <div className="flex"><div className="w-32 font-bold text-gray-800">&nbsp;</div></div>
            </div>
            <div className="space-y-1">
              <div className="flex"><div className="w-32 font-bold text-gray-800">Pay Date :</div><div className="font-semibold text-blue-700">{payslip.paymentDate ? new Date(payslip.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : `25 ${monthNames[payslip.month - 1].substring(0, 3)} ${payslip.year}`}</div></div>
              <div className="flex"><div className="w-32 font-bold text-gray-800">Bank :</div><div>{payslip.employee?.bank || '-'}</div></div>
              <div className="flex"><div className="w-32 font-bold text-gray-800">Bank A/C :</div><div>{payslip.employee?.bankAccount || '-'}</div></div>
            </div>
          </div>

          {/* ตารางรายได้ - รายหัก (โครงสร้างล็อกตายตัว) */}
          <div className="mb-4 flex overflow-hidden rounded-md border border-gray-300">
            {/* ฝั่งซ้าย: รายได้ */}
            <div className="flex flex-1 flex-col border-r border-gray-300">
              <table className="w-full text-sm">
                <thead className="bg-[#aec8d4] text-xs font-bold uppercase text-black">
                  <tr><th className="px-3 py-1.5 text-left">EARNINGS</th><th className="px-3 py-1.5 text-right">AMOUNT(THB)</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fixedEarnings.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-1.5 text-xs">{item.label}</td>
                      <td className="px-3 py-1.5 text-right">{fmt(item.amount)}</td>
                    </tr>
                  ))}
                  {/* บรรทัดว่างให้ตารางดูเต็ม */}
                  <tr><td className="px-3 py-1.5">&nbsp;</td><td></td></tr>
                </tbody>
                <tfoot className="bg-gray-100 font-bold border-t border-gray-300">
                  <tr>
                    <td className="px-3 py-2">Gross Earnings</td>
                    <td className="px-3 py-2 text-right text-blue-600">{fmt(payslip.totalEarnings)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {/* ฝั่งขวา: รายหัก */}
            <div className="flex flex-1 flex-col">
              <table className="w-full text-sm">
                <thead className="bg-[#aec8d4] text-xs font-bold uppercase text-black">
                  <tr><th className="px-3 py-1.5 text-left">DEDUCTIONS</th><th className="px-3 py-1.5 text-right">AMOUNT(THB)</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fixedDeductions.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-1.5 text-xs">{item.label}</td>
                      <td className={`px-3 py-1.5 text-right ${item.amount > 0 ? 'text-red-600' : ''}`}>
                        {fmt(item.amount)}
                      </td>
                    </tr>
                  ))}
                  {/* บรรทัดว่างให้ตารางดูเต็ม บาลานซ์กับฝั่งรายได้ */}
                  <tr><td className="px-3 py-1.5">&nbsp;</td><td></td></tr>
                  <tr><td className="px-3 py-1.5">&nbsp;</td><td></td></tr>
                  <tr><td className="px-3 py-1.5">&nbsp;</td><td></td></tr>
                </tbody>
                <tfoot className="bg-gray-100 font-bold border-t border-gray-300">
                  <tr>
                    <td className="px-3 py-2">Total Deductions</td>
                    <td className="px-3 py-2 text-right text-red-600">{fmt(payslip.totalDeductions)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* สรุปยอดสุทธิ */}
          <div className="mb-5 flex items-center justify-between rounded-lg bg-[#274bc3] p-5 shadow-md print:border-2 print:border-blue-800 print:bg-[#274bc3] print:shadow-none">
            <div>
              <span className="block text-xs font-bold uppercase text-blue-100 print:text-white">NET SALARY PAYABLE</span>
              <h6 className="m-0 text-sm font-medium text-white print:text-white mt-1">* โอนเข้าบัญชีธนาคาร (Transferred to Bank Account)</h6>
            </div>
            <div className="text-right">
              <h2 className="m-0 text-3xl font-black text-white print:text-white">฿ {fmt(payslip.netSalary)}</h2>
            </div>
          </div>

          {/* ตาราง YTD */}
          <div className="overflow-hidden rounded-md border border-gray-300">
            <table className="w-full text-sm">
              <thead className="bg-[#aec8d4] text-xs font-bold uppercase text-black">
                <tr>
                  <th className="px-3 py-1.5">&nbsp;</th>
                  <th className="px-3 py-1.5 text-right border-l border-gray-300/30">CURRENT(THB)</th>
                  <th className="px-3 py-1.5 text-right border-l border-gray-300/30">YEAR TO DATE (THB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                <tr>
                  <td className="px-3 py-2 font-bold text-gray-800">Net Wage</td>
                  <td className="px-3 py-2 text-right border-l border-gray-200">{fmt(payslip.netSalary)}</td>
                  <td className="px-3 py-2 text-right border-l border-gray-200 text-gray-700"></td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-bold text-gray-800">Gross Wage</td>
                  <td className="px-3 py-2 text-right border-l border-gray-200">{fmt(payslip.grossWage)}</td>
                  <td className="px-3 py-2 text-right border-l border-gray-200 text-gray-700">{fmt(payslip.ytd?.grossWage)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-bold text-gray-800">Tax</td>
                  <td className="px-3 py-2 text-right border-l border-gray-200">{fmt(payslip.tax)}</td>
                  <td className="px-3 py-2 text-right border-l border-gray-200 text-gray-700">{fmt(payslip.ytd?.tax)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-bold text-gray-800">Social Security Fund</td>
                  <td className="px-3 py-2 text-right border-l border-gray-200">{fmt(payslip.sso)}</td>
                  <td className="px-3 py-2 text-right border-l border-gray-200 text-gray-700">{fmt(payslip.ytd?.sso)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-bold text-gray-800">Provident Fund</td>
                  <td className="px-3 py-2 text-right border-l border-gray-200">{fmt(payslip.pvf)}</td>
                  <td className="px-3 py-2 text-right border-l border-gray-200 text-gray-700">{fmt(payslip.ytd?.pvf)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* 🌟 เปลี่ยนจาก absolute เป็นการดันลงมาแบบปกติ (mt-12) เพื่อกันทับตารางตอน Print */}
          <div className="mt-12 w-full text-center text-[10px] italic text-gray-400">
            Remark: Parking Allowance & Perdiem is not included on Tax Calculation.<br/>
            This is a computer-generated document. No signature is required.
          </div>

        </div>
      </div>
    </>
  );
}