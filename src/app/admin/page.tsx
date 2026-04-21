// src/app/admin/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BiShieldQuarter, BiKey, BiLogOutCircle } from 'react-icons/bi';

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // จำลองการโหลด 1 วินาที แล้วส่งไปหน้า Company Management ของ Admin
    setTimeout(() => {
      setIsLoading(false);
      router.push('/admin/company'); 
    }, 1000);
  };

  return (
    // พื้นหลังสีเทาอ่อน สไตล์มินิมอล
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6] p-4 font-sans">
      
      {/* การ์ด Login หลัก */}
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
        
         {/* 🌟 ปรับขนาดลงมาเหลือ 200px ตรงนี้ครับ */}
         <div className="mx-auto mb-4 flex h-[200px] w-full items-center justify-center relative z-10">
                      <Image 
                        src="/src/logoFynnSoft.jpg" 
                        alt="FynnSoft Logo" 
                        width={200} 
                        height={200} 
                        className="h-full w-auto object-contain" 
                        priority
                      />
                    </div>
        
        {/* Header Text */}
        <div className="mb-8 text-center">
          <h4 className="mb-1 text-2xl font-bold text-gray-900">Welcome</h4>
          <p className="text-sm text-gray-500">Please sign in to your account</p>
        </div>

        {/* แท็บจำลอง (แสดงว่าเป็นโหมด Admin) */}
        <div className="mb-8 rounded-lg bg-slate-50 p-1">
          <div className="w-full rounded-md bg-slate-800 py-2.5 text-center text-sm font-semibold text-white shadow-[0_4px_10px_rgba(30,41,59,0.2)]">
            Administrator Mode
          </div>
        </div>

        {/* ฟอร์ม Login ของ Admin */}
        <form onSubmit={handleAdminLogin} className="space-y-5">
          
          {/* Admin Username (แก้ไขใช้โครงสร้าง Flex ป้องกันตัวอักษรทับกัน) */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">Admin Username</label>
            <div className="flex items-center rounded-lg border border-gray-200 bg-slate-50 overflow-hidden transition-all focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-100">
              <span className="flex items-center justify-center h-full p-3 text-slate-400 border-r border-gray-200">
                <BiShieldQuarter className="text-lg" />
              </span>
              <input 
                type="text" 
                className="w-full bg-transparent px-4 py-3 text-sm leading-normal outline-none text-slate-800"
                placeholder="admin_username" 
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                required 
              />
            </div>
          </div>

          {/* Admin Password (แก้ไขใช้โครงสร้าง Flex ป้องกันตัวอักษรทับกัน) */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-600">Admin Password</label>
              <a href="#" className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline">Forgot password?</a>
            </div>
            <div className="flex items-center rounded-lg border border-gray-200 bg-slate-50 overflow-hidden transition-all focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-100">
              <span className="flex items-center justify-center h-full p-3 text-slate-400 border-r border-gray-200">
                <BiKey className="text-lg" />
              </span>
              <input 
                type="password" 
                className="w-full bg-transparent px-4 py-3 text-sm leading-normal outline-none text-slate-800"
                placeholder="••••••••" 
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                required 
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isLoading}
            className="mt-4 flex w-full items-center justify-center rounded-lg bg-slate-800 py-3.5 text-sm font-bold text-white transition-all hover:bg-slate-900 disabled:opacity-70"
          >
            {isLoading ? (
              <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span> Securing Connection...</>
            ) : (
              <>Access Admin Portal <BiLogOutCircle className="ml-2 text-lg" /></>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p className="mb-1">&copy; @2006 Digital Slip,</p>
          <p>created by Fynn Infinity Software Co.,Ltd</p>
        </div>

      </div>
    </div>
  );
}