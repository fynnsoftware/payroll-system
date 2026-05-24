// src/app/employee/payslips/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BiSearch } from 'react-icons/bi';
// 🌟 Import useSession เพื่อตรวจสอบการล็อกอิน
import { useSession } from 'next-auth/react'; 

export default function PayslipList() {
  // 🌟 ดึงข้อมูล Session ของคนที่ Login อยู่
  const { data: session, status } = useSession();

  // --- States ---
  const [payslips, setPayslips] = useState<any[]>([]);
  const [employeeProfile, setEmployeeProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- States ตัวกรอง ---
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // 🌟 1. โหลดข้อมูลเมื่อ Session พร้อมแล้ว
  useEffect(() => {
    if (status === 'authenticated') {
      fetchPayslips(); 
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status]);

  // 🌟 2. ฟังก์ชัน Fetch ข้อมูลสลิป
  const fetchPayslips = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/employees/payslips'); 
      
      if (res.ok) {
        const data = await res.json();
        
        // 🌟 ต้องดึงข้อมูลแยกก้อนแบบนี้ครับ
        setEmployeeProfile(data.profile || null);
        
        // 🌟 ป้องกันพัง: ถ้า data.payslips ไม่มี ให้ใส่เป็น Array เปล่า []
        setPayslips(data.payslips || []); 
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ API Error Status:", res.status);
      }
    } catch (error) {
      console.error("❌ Error fetching payslips:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // 🌟 ระบบ Filter (เพิ่ม Array.isArray ป้องกันแอปพัง)
  const safePayslips = Array.isArray(payslips) ? payslips : [];
  const filteredPayslips = safePayslips.filter(slip => {
    const slipMonthName = monthNames[slip.month - 1];
    return (filterYear === '' || slip.year.toString() === filterYear) &&
           (filterMonth === '' || slipMonthName === filterMonth);
  });

  // 🌟 3. หน้าจอโหลดข้อมูลระหว่างเช็ก Session
  if (status === 'loading' || isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
        <p className="mt-4 font-semibold text-slate-500">Authenticating and loading your secure data...</p>
      </div>
    );
  }

  // 🌟 4. ป้องกันกรณีหลุดเข้ามาแต่ไม่ได้ล็อกอิน
  if (!session) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-red-500">
        <h2 className="text-2xl font-bold">Unauthorized Access</h2>
        <p>กรุณาล็อกอินเข้าสู่ระบบก่อนดูข้อมูลสลิปเงินเดือนครับ</p>
      </div>
    );
  }

  // กำหนดรหัสพนักงานเพื่อเอาไปโชว์ใน UI 
  const displayEmpId = (session.user as any).employeeId || (session.user as any).name || (session.user as any).id || 'Unknown ID';
  // 🌟 ฟังก์ชันช่วยหา Logo (หาจาก Profile ก่อน ถ้าไม่มีหาจากสลิปใบล่าสุด)
  const getLogoUrl = () => {
    // 1. ลองเช็กจาก profile ก่อน
    if (employeeProfile?.company?.logoUrl) {
      return decodeURIComponent(employeeProfile.company.logoUrl);
    }
    // 2. ถ้า profile ไม่มี ลองเช็กจากสลิปใบล่าสุดในตาราง
    if (payslips?.[0]?.company?.logoUrl) {
      return decodeURIComponent(payslips[0].company.logoUrl);
    }
    // 3. ถ้าไม่มีค่าเลยทั้งสองจุด ให้ใช้ Logo FynnSoft เป็นค่าเริ่มต้น
    return "/src/logoFynnSoft.jpg"; 
  };
  return (
    <div className="mx-auto max-w-5xl">
      
      {/* Profile Header Card */}
      <div className="mb-8 flex items-center justify-between rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-lg relative overflow-hidden">
        {/* รูปพื้นหลังตกแต่ง */}
        <div className="absolute -right-20 -top-20 opacity-10">
          <svg width="300" height="300" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FFFFFF" d="M42.7,-73.4C55.9,-67.5,67.6,-57.4,76.5,-45.3C85.4,-33.2,91.5,-19.1,91.8,-4.9C92.2,9.3,86.8,23.5,78.2,35.6C69.6,47.7,57.8,57.7,44.9,64.8C32,71.9,18,76.1,3.4,70.6C-11.2,65.1,-25.2,49.9,-37.8,40.8C-50.4,31.7,-61.6,28.7,-70.5,19.3C-79.4,9.9,-86,-5.9,-84.1,-21C-82.2,-36.1,-71.8,-50.5,-58.5,-57.2C-45.2,-63.9,-29.1,-62.9,-14.8,-69C-0.5,-75.1,14,-88.3,28.3,-84.3C42.6,-80.3,56.8,-69,42.7,-73.4Z" transform="translate(100 100) scale(1.1)" />
          </svg>
        </div>

        <div className="flex items-center relative z-10">
          <div className="mr-6 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-blue-400 bg-white shadow-sm p-1">
           <Image 
              src={getLogoUrl()} 
              alt="Company Logo" 
              width={96} 
              height={96} 
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h3 className="mb-1 text-2xl font-bold">{employeeProfile?.fullName || session.user?.name || 'Loading...'}</h3>
            <p className="mb-2 text-blue-100">EMP ID: <span className="font-bold">{displayEmpId}</span> | {employeeProfile?.department || '-'}</p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-600">Position: {employeeProfile?.position || '-'}</span>
          </div>
        </div>
        <div className="hidden text-right lg:block relative z-10">
          <p className="mb-1 text-sm text-blue-100">Employment Starting Date</p>
          <h5 className="text-xl font-bold">{employeeProfile?.startDate ? new Date(employeeProfile.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</h5>
        </div>
      </div>

      {/* Content Card (ตารางและตัวกรอง) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="w-full md:w-48">
            <label className="mb-1 block text-xs font-bold text-gray-500">Filter by Year</label>
            <select 
              className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:bg-white" 
              value={filterYear} 
              onChange={e => setFilterYear(e.target.value)}
            >
              <option value="">All Years</option>
              {Array.from(new Set(payslips.map(s => s.year))).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-48">
            <label className="mb-1 block text-xs font-bold text-gray-500">Filter by Month</label>
            <select 
              className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:bg-white" 
              value={filterMonth} 
              onChange={e => setFilterMonth(e.target.value)}
            >
              <option value="">All Months</option>
              {monthNames.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <button 
            className="rounded-lg border border-blue-600 px-6 py-2.5 text-sm font-bold text-blue-600 transition hover:bg-blue-50 hover:-translate-y-0.5" 
            onClick={() => { setFilterYear(''); setFilterMonth(''); }}
          >
            Reset
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm text-gray-600 whitespace-nowrap">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="px-5 py-4 text-center">No.</th>
                <th className="px-5 py-4">Year</th>
                <th className="px-5 py-4">Month</th>
                <th className="px-5 py-4">Company</th>
                {/* 🌟 ลบคอลัมน์ Net Salary ออกไปแล้ว */}
                <th className="px-5 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredPayslips.length > 0 ? filteredPayslips.map((slip, idx) => (
                <tr key={slip.id} className="transition-colors hover:bg-blue-50/50">
                  <td className="px-5 py-4 text-center font-semibold text-gray-400">{idx + 1}.</td>
                  <td className="px-5 py-4 font-semibold text-gray-700">{slip.year}</td>
                  <td className="px-5 py-4 font-bold text-blue-600">{monthNames[slip.month - 1]}</td>
                  <td className="px-5 py-4 font-semibold text-gray-600">{slip.company?.companyName || 'Unknown'}</td>
                  {/* 🌟 ลบข้อมูล Net Salary ออกไปแล้ว */}
                  <td className="px-5 py-4 text-center">
                    <Link href={`/employee/payslips/${slip.id}`}>
                      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition hover:bg-blue-600 hover:text-white hover:scale-110 shadow-sm cursor-pointer">
                        <BiSearch className="text-lg" />
                      </div>
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  {/* 🌟 ปรับ colSpan เป็น 5 เพราะลบคอลัมน์ออกไป 1 อัน */}
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 font-medium">
                    ไม่พบประวัติสลิปเงินเดือนของคุณในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}