// src/app/employee/layout.tsx
import AutoLogout from '@/components/AutoLogout';
import LogoutButton from '@/components/LogoutButton';
import Link from 'next/link';
import { BiFile, BiUserCircle } from 'react-icons/bi';
import { ReactNode } from 'react';

// โค้ดนี้จะทำหน้าที่เป็น "กรอบ" ให้กับทุกหน้าเว็บที่อยู่ในโฟลเดอร์ /employee/...
export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f4f7f6] font-sans text-slate-700">
      
      {/* 🌟 1. ตัวจับเวลาเบื้องหลัง (ซ่อนอยู่) 
          สามารถเปลี่ยนตัวเลข timeoutSeconds เป็น 60, 120, 300 ได้ตามต้องการเลยครับ! 
      */}
      <AutoLogout timeoutSeconds={120} redirectUrl="/employee/login" />

      {/* เมนูด้านซ้าย (Sidebar) - ซ่อนในจอมือถือ, แสดงในจอใหญ่ (md:flex) */}
      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="border-b border-gray-100 p-6 font-bold tracking-tight text-blue-600">
          PEOPLE HUB
        </div>
        
        <div className="flex flex-col py-4">
          <Link href="/employee/payslips" className="flex items-center rounded-r-full bg-blue-50 px-6 py-3 font-medium text-blue-600">
            <BiFile className="mr-3 text-lg" /> My Payslips
          </Link>
          
        </div>
        {/* 🌟 3. ปุ่ม Logout จะถูกดันลงมาอยู่ล่างสุดของ Sidebar เสมอ */}
        <div className="flex flex-col py-4">
          <LogoutButton redirectUrl="/employee/login" />
        </div>
      </aside>

      {/* พื้นที่แสดงเนื้อหาหลัก (Main Content) - ตรงนี้คือจุดที่ page.tsx จะมาสอดแทรก */}
      <main className="flex-1 p-6 md:p-10">
        {children}
      </main>
      
    </div>
  );
}