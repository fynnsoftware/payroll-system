'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  BiSearch, BiBriefcase, BiEnvelope, 
  BiCalendar, BiEditAlt, BiRefresh, BiBuilding,
  BiX, BiLock, BiUser // 🌟 เพิ่มไอคอนใหม่
} from 'react-icons/bi';

export default function EmployeeHub() {
  const [filterYear, setFilterYear] = useState('All Years');
  const [filterMonth, setFilterMonth] = useState('All Months');

  // 🌟 NEW STATES: สำหรับจัดการ Modal Edit Profile
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    email: 'viruj@2c2p.com', // ค่าเริ่มต้นดึงจากข้อมูลพนักงาน
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // --- Mock Data ---
  const employeeInfo = {
    name: 'วิรุจน์ XXXXXX',
    empId: 'EMP001',
    initials: 'VX',
    company: '2C2P Plus Co., Ltd.',
    position: 'Managing Director (MD)',
    department: 'Integrated Business',
    functionInfo: 'Management',
    email: editForm.email, // 🌟 ให้ Email ผูกกับ State เผื่อมีการแก้ไข
    startDate: '10 March 2024',
    isActive: true
  };

  const payslips = [
    { id: 1, year: '2026', month: 'March', company: '2C2PPlus', empId: 'EMP001' },
    { id: 2, year: '2026', month: 'February', company: '2C2PPlus', empId: 'EMP001' },
  ];

  const handleResetFilter = () => {
    setFilterYear('All Years');
    setFilterMonth('All Months');
  };

  // 🌟 NEW HANDLER: ฟังก์ชันจัดการเมื่อกด Save Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // เช็กว่ารหัสผ่านใหม่ตรงกันไหม (แบบง่ายๆ ก่อน)
    if (editForm.newPassword !== editForm.confirmPassword) {
      alert("รหัสผ่านใหม่ไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง!");
      return;
    }
    
    // จำลองการ Save สำเร็จ
    alert("อัปเดตข้อมูลและรหัสผ่านเรียบร้อยแล้ว!");
    setIsEditModalOpen(false);
    
    // เคลียร์ช่องรหัสผ่านหลังบันทึกเสร็จ
    setEditForm({ ...editForm, currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8 relative">
      
      {/* 🌟 1. Company Banner */}
      <div className="mb-6 flex items-center rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
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
        <div>
          <h2 className="text-xl font-bold text-slate-800">{employeeInfo.company}</h2>
          <p className="text-sm font-medium text-slate-500">Payroll Management System</p>
        </div>
      </div>

      {/* 🌟 2. Main Grid Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* ========================================== */}
        {/* เลนซ้าย: Employee Profile Card */}
        {/* ========================================== */}
        <div className="w-full lg:w-1/3">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 sticky top-6">
            
            {/* Avatar & Basic Info */}
            <div className="flex flex-col items-center border-b border-slate-100 pb-6 text-center">
              <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-3xl font-bold text-white shadow-md">
                {employeeInfo.initials}
              </div>
              <h3 className="text-xl font-bold text-slate-800">{employeeInfo.name}</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">Employee ID: {employeeInfo.empId}</p>
              
              <span className={`mt-3 rounded-full px-4 py-1 text-xs font-bold ${employeeInfo.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {employeeInfo.isActive ? 'Active Status' : 'Terminated'}
              </span>
            </div>

            {/* Detailed Info */}
            <div className="py-6 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-1">Current Position</p>
                <div className="flex items-center text-sm font-semibold text-slate-700">
                  <BiBriefcase className="mr-2 text-slate-400 text-lg" /> {employeeInfo.position}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-1">Department & Function</p>
                <div className="flex items-center text-sm font-semibold text-slate-700">
                  <BiBuilding className="mr-2 text-slate-400 text-lg" /> {employeeInfo.department} ({employeeInfo.functionInfo})
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-1">Email Address</p>
                <div className="flex items-center text-sm font-semibold text-slate-700">
                  <BiEnvelope className="mr-2 text-slate-400 text-lg" /> {employeeInfo.email}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-1">Start Date</p>
                <div className="flex items-center text-sm font-semibold text-slate-700">
                  <BiCalendar className="mr-2 text-slate-400 text-lg" /> {employeeInfo.startDate}
                </div>
              </div>
            </div>

            {/* Action Button: 🌟 อัปเดตให้กดแล้วเปิด Modal */}
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex w-full items-center justify-center rounded-xl border-2 border-blue-600 py-2.5 text-sm font-bold text-blue-600 transition-colors hover:bg-blue-50"
            >
              <BiEditAlt className="mr-2 text-lg" /> Edit Profile & Security
            </button>

          </div>
        </div>

        {/* ========================================== */}
        {/* เลนขวา: Payslips History */}
        {/* ========================================== */}
        <div className="w-full lg:w-2/3">
          <div className="rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-slate-100 h-full">
            
            <h4 className="text-lg font-bold text-slate-800 mb-6">Payslip History</h4>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div className="flex-1 min-w-[150px]">
                <label className="mb-1.5 block text-xs font-bold text-slate-500">Filter by Year</label>
                <select 
                  value={filterYear} 
                  onChange={e => setFilterYear(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="All Years">All Years</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="mb-1.5 block text-xs font-bold text-slate-500">Filter by Month</label>
                <select 
                  value={filterMonth} 
                  onChange={e => setFilterMonth(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="All Months">All Months</option>
                  <option value="March">March</option>
                  <option value="February">February</option>
                  <option value="January">January</option>
                </select>
              </div>
              <button 
                onClick={handleResetFilter}
                className="flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-blue-600 transition-colors hover:bg-slate-50"
              >
                <BiRefresh className="mr-1 text-lg" /> Reset
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 text-center">No.</th>
                    <th className="px-6 py-4">Year</th>
                    <th className="px-6 py-4">Month</th>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Employee ID</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {payslips.map((slip, index) => (
                    <tr key={slip.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 text-center font-medium text-slate-400">{index + 1}.</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{slip.year}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{slip.month}</td>
                      <td className="px-6 py-4 text-slate-600">{slip.company}</td>
                      <td className="px-6 py-4 font-mono text-slate-500">{slip.empId}</td>
                      <td className="px-6 py-4 text-center">
                        <Link 
                          href={`/employee/payslips/${slip.id}?month=${slip.month}&year=${slip.year}`}
                          className="inline-flex rounded-full p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800" 
                          title="View Payslip"
                        >
                          <BiSearch className="text-xl" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {payslips.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">No payslips found matching your filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>

      {/* ========================================== */}
      {/* 🌟 NEW: Edit Profile & Password Modal       */}
      {/* ========================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <BiUser className="mr-2 text-blue-600" /> Edit Profile & Security
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <BiX className="text-2xl" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveProfile} className="p-6">
              
              {/* ส่วนแก้ไขข้อมูล */}
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Contact Information</h4>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              {/* ส่วนเปลี่ยนรหัสผ่าน */}
              <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center">
                  <BiLock className="mr-1.5" /> Change Password
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">Current Password</label>
                    <input 
                      type="password" 
                      placeholder="Enter current password"
                      value={editForm.currentPassword}
                      onChange={(e) => setEditForm({...editForm, currentPassword: e.target.value})}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">New Password</label>
                    <input 
                      type="password" 
                      placeholder="Enter new password"
                      value={editForm.newPassword}
                      onChange={(e) => setEditForm({...editForm, newPassword: e.target.value})}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">Confirm New Password</label>
                    <input 
                      type="password" 
                      placeholder="Re-type new password"
                      value={editForm.confirmPassword}
                      onChange={(e) => setEditForm({...editForm, confirmPassword: e.target.value})}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-slate-500 font-medium">Leave password fields blank if you do not wish to change it.</p>
              </div>

              {/* Modal Footer (Buttons) */}
              <div className="flex justify-end gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-md transition hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}