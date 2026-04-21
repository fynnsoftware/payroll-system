// src/app/admin/(dashboard)/layout.tsx
'use client'; // ต้องเพิ่มคำนี้เพราะเราจะใช้ usePathname

import { useSession } from "next-auth/react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// 🌟 1. นำเข้า BiHistory สำหรับเมนู Import Log
import { BiBuilding, BiGroup, BiImport, BiWallet, BiHistory } from 'react-icons/bi';
import AutoLogout from '@/components/AutoLogout';
import LogoutButton from '@/components/LogoutButton';
import { ReactNode } from 'react';

const MENU_ITEMS = [
  { name: "Company Mgt.", path: "/admin/company", icon: BiBuilding, allowedRoles: ["ADMIN", "HR"] },
  { name: "People Mgt.", path: "/admin/people", icon: BiGroup, allowedRoles: ["ADMIN", "HR"] },
  { name: "Import Salary", path: "/admin/import", icon: BiImport, allowedRoles: ["ADMIN", "HR"] },
  // 🌟 2. เพิ่มเมนู Import Log ตรงนี้ และกำหนด allowedRoles ให้เฉพาะ ADMIN
  { name: "Import Log", path: "/admin/import-log", icon: BiHistory, allowedRoles: ["ADMIN"] },
  { name: "Salary Summary", path: "/admin/summary", icon: BiWallet, allowedRoles: ["ADMIN"] }, // 👑 เฉพาะ ADMIN!
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname(); // ดึง URL ปัจจุบันมาตรวจสอบ

  const { data: session } = useSession();
  const userRole = session?.user?.role || "USER";
  
  // ดึงชื่อผู้ใช้งานมาแสดง (ดักจับทั้งแบบที่เก็บใน name หรือ username)
  const adminName = session?.user?.name || (session?.user as any)?.username || "Admin";

  // ฟังก์ชันเช็กว่าหน้านี้คือหน้าปัจจุบันไหม เพื่อสลับสีคลาส
  const getNavClass = (path: string) => {
    const isActive = pathname === path;
    return isActive 
      ? "flex items-center bg-blue-600 px-6 py-4 font-semibold text-white transition-colors"
      : "flex items-center px-6 py-4 font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-blue-600";
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7f6] font-sans text-slate-700">
      {/* 🌟 1. ตัวจับเวลาเบื้องหลัง (ซ่อนอยู่) */}
      <AutoLogout timeoutSeconds={600} redirectUrl="/admin/login" />

      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white shadow-sm md:flex">
        
        {/* 🌟 2. ปรับแต่งส่วน Header ของ Sidebar เพิ่มคำว่า Hi {adminName} ตรงนี้ครับ */}
        <div className="border-b border-gray-100 p-6">
          <div className="text-xl font-black tracking-tight text-blue-600">
            PAYROLL ADMIN
          </div>
          <div className="mt-2 flex items-center text-sm font-medium text-slate-500">
            <span className="mr-1.5 text-lg">👋</span> Hi, <span className="ml-1 font-bold text-slate-700">{adminName}</span>
          </div>
        </div>
        
        {/* 🌟 เมนูต่างๆ */}
        <div className="flex flex-1 flex-col py-2">
          {MENU_ITEMS.filter(menu => menu.allowedRoles.includes(userRole)).map((menu, index) => {
            const Icon = menu.icon; // ดึงรูปไอคอนมา
            return (
              <Link key={index} href={menu.path} className={getNavClass(menu.path)}>
                <Icon className="mr-3 text-xl" /> {menu.name}
              </Link>
            );
          })}
        </div>
        
        {/* 🌟 3. ปุ่ม Logout จะถูกดันลงมาอยู่ล่างสุดของ Sidebar เสมอ */}
        <div className="flex flex-col py-4 border-t border-gray-100 mt-auto">
          <LogoutButton redirectUrl="/admin/login" />
        </div>

      </aside>

      <main className="flex-1 p-6 md:p-10">
        {children}
      </main>
      
    </div>
  );
}