// src/app/employee/login/page.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BiLockAlt, BiUser, BiErrorCircle } from 'react-icons/bi';

export default function EmployeeLoginPage() {
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
      // 🌟 พนักงานล็อกอินผ่าน ให้พุ่งไปหน้า Employee Hub (ดูสลิป)
      router.push('/employee/payslips'); 
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-50/50 p-4">
      {/* 🌟 ฝั่งพนักงานใช้โทนสีฟ้า/สว่าง ดูเป็นมิตร */}
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-blue-100/50 border border-slate-100">
          
          <div className="bg-white px-8 py-10 text-center border-b border-slate-50">
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
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Employee Portal</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">Access your payslips and profile</p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-6 bg-slate-50/50">
            {error && (
              <div className="flex items-center rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600 border border-red-100">
                <BiErrorCircle className="mr-2 text-xl shrink-0" /> {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Employee ID or Email</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"><BiUser className="text-lg" /></div>
                <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" placeholder="e.g. EMP001" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"><BiLockAlt className="text-lg" /></div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className={`mt-4 flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition-all ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5'}`}>
              {isLoading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}