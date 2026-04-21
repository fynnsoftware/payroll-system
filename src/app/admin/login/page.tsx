// src/app/admin/login/page.tsx
'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BiLockAlt, BiUser, BiErrorCircle, BiShieldQuarter } from 'react-icons/bi';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      username,
      password,
    });

    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      const session = await getSession();
      
      console.log("=== Login Debug ===");
      console.log("1. Full Session Object:", session);
      console.log("2. Detected Role:", session?.user?.role);
      
      const userRole = session?.user?.role?.toUpperCase();

      if (userRole === 'ADMIN') {
        router.push('/admin/summary'); 
      } else if (userRole === 'HR') {
        router.push('/admin/people'); 
      } else {
        console.log("🚨 Role ไม่ตรงกับเงื่อนไขด้านบน กำลัง Redirect ไปหน้า Employee...");
        router.push('/employee/payslips'); 
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100">
          
          <div className="bg-slate-50 px-8 py-10 text-center border-b border-slate-100 relative overflow-hidden">
            <BiShieldQuarter className="absolute -right-6 -top-6 text-[120px] text-slate-100 opacity-50 rotate-12" />
            
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
            
            <h2 className="text-2xl font-black text-slate-800 tracking-tight relative z-10">Admin Portal</h2>
            <p className="mt-2 text-sm font-medium text-slate-500 relative z-10">System Administrator Access</p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {error && (
              <div className="flex items-center rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600 border border-red-100">
                <BiErrorCircle className="mr-2 text-xl shrink-0" /> {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Admin Username</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"><BiUser className="text-lg" /></div>
                <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-100" placeholder="admin" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"><BiLockAlt className="text-lg" /></div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-100" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className={`mt-4 flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition-all ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900'}`}>
              {isLoading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : 'Secure Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}