'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  BiUserPlus, BiFilter, BiCog, BiEnvelope, BiSearch, 
  BiCheckCircle, BiX, BiErrorCircle, BiSend, BiShow, 
  BiHide, BiTrash 
} from 'react-icons/bi';

interface Company {
  id: number;
  companyName: string;
  parentId: number | null;
}

interface Employee {
  id: string;
  name: string;      
  position: string;
  department: string;
  role: 'ADMIN' | 'HR' | 'USER'; 
  func: string;
  startDate: string;
  email: string;
  username: string;
  isActive: boolean;
  company: string;   
  companyId: number; 
}

const checkPasswordStrength = (password: string) => {
  if (!password) return { text: '', color: 'bg-transparent', w: 'w-0', textColor: 'text-slate-400' };
  
  let strength = 0;
  if (password.length >= 8) strength += 1; 
  if (/[A-Z]/.test(password)) strength += 1; 
  if (/[a-z]/.test(password)) strength += 1; 
  if (/[0-9]/.test(password)) strength += 1; 
  if (/[^A-Za-z0-9]/.test(password)) strength += 1; 

  if (strength < 3) return { text: 'Weak', color: 'bg-red-500', w: 'w-1/3', textColor: 'text-red-500' };
  if (strength === 3 || strength === 4) return { text: 'Medium', color: 'bg-amber-500', w: 'w-2/3', textColor: 'text-amber-500' };
  return { text: 'Strong', color: 'bg-emerald-500', w: 'w-full', textColor: 'text-emerald-500' };
};

export default function PeopleManagement() {
  const { data: session } = useSession();
  const currentUserRole = session?.user?.role || "USER";

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false); 
  
  const [filters, setFilters] = useState({ empId: '', companyId: '', position: '', department: '', status: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(20);

  const [modalType, setModalType] = useState<'add' | 'edit' | 'preview' | 'email' | 'statusWarning' | 'deleteWarning'| null>(null);
  const [activeItem, setActiveItem] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee & { password?: string }>>({});
  const [emailSubject, setEmailSubject] = useState(''); 
  const [emailBody, setEmailBody] = useState('');
  const [toastConfig, setToastConfig] = useState({ show: false, message: '', icon: <BiCheckCircle className="mr-2 text-xl" /> });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [compRes, empRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/employees')
      ]);

      if (compRes.ok) setCompanies(await compRes.json());

      if (empRes.ok) {
        const empData = await empRes.json();
        const formattedEmps = empData.data.map((emp: any) => ({
          id: emp.id,
          name: emp.fullName,
          position: emp.position || '-',
          department: emp.department || '-',
          role: emp.user?.role || 'USER',
          func: '-', 
          startDate: emp.startDate ? new Date(emp.startDate).toISOString().split('T')[0] : '-',
          email: emp.email || '-',
          username: emp.user?.username || '-',
          isActive: emp.isActive,
          company: emp.company?.companyName || 'Unknown',
          companyId: emp.currentCompanyId
        }));
        setEmployees(formattedEmps);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string, icon = <BiCheckCircle className="mr-2 text-xl" />) => {
    setToastConfig({ show: true, message, icon });
    setTimeout(() => setToastConfig({ show: false, message: '', icon: <BiCheckCircle /> }), 3000);
  };

  const openModal = (type: typeof modalType, item?: Employee) => {
    setModalType(type);
    setActiveItem(item || null);
    setShowPassword(false);
    
    if (type === 'add') {
      setFormData({ role: 'USER', companyId: undefined, password: '', isActive: true });
    } else if ((type === 'edit' || type === 'preview') && item) {
      // 🌟 ดึงข้อมูลมาแสดงในฟอร์มเหมือนกันทั้ง Edit และ Preview
      setFormData({ 
        ...item, 
        password: '',
        startDate: item.startDate === '-' ? '' : item.startDate,
        position: item.position === '-' ? '' : item.position,
        department: item.department === '-' ? '' : item.department,
      });
    }
  };

  const handleToggleStatusClick = (emp: Employee) => {
    setActiveItem(emp);
    setModalType('statusWarning');
  };

  const openEmailModal = (emp: Employee) => {
    if (!emp.email || emp.email === '-' || emp.email.trim() === "") {
      alert(`❌ ไม่สามารถส่งอีเมลได้: พนักงาน "${emp.name}" ยังไม่มีข้อมูลอีเมลในระบบ\nกรุณาแก้ไขข้อมูลพนักงานเพื่อระบุอีเมลก่อนครับ`);
      return;
    }

    setActiveItem(emp);
    setEmailSubject('Invitation to Access the Payroll System');
    setEmailBody(`Dear ${emp.name},

You are invited to access the Payroll System. Please <a href="https://payroll.fynnsoft.com/employee/login" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: underline;">Click link</a> to log in and view your payslips.

Username: <b>${emp.username}</b>

If this is your first time accessing the system, please log in using your credentials.

Should you have any questions or require assistance, please contact the HR or IT Support team.

Best regards,
Payroll Administrator`);
    setModalType('email');
  };

  const handleSaveEmployee = async () => {
    if (!formData.id || !formData.name || !formData.companyId || !formData.username) {
      return alert('กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน');
    }

    const isAdd = modalType === 'add';
    const url = isAdd ? '/api/employees' : `/api/employees/${activeItem?.id}`;
    const method = isAdd ? 'POST' : 'PUT';

    if (isAdd && !formData.password) return alert('กรุณาตั้งรหัสผ่านสำหรับพนักงานใหม่');

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fullName: formData.name,
        }),
      });

      if (res.ok) {
        showToast(isAdd ? 'Created successfully!' : 'Updated successfully!');
        fetchData();
        setModalType(null);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (error) {
      alert('Network Error');
    }
  };

  const handleSendEmail = async () => {
    if (!activeItem?.email || activeItem.email === '-') return alert('Invalid Email');
    if (!emailSubject.trim() || !emailBody.trim()) return alert('Please fill in subject and message');

    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeItem.email,
          subject: emailSubject,
          body: emailBody,
        }),
      });

      if (res.ok) {
        showToast('อีเมลถูกส่งเรียบร้อยแล้ว!', <BiSend className="mr-2 text-xl" />);
        setModalType(null);
      } else {
        const err = await res.json();
        alert(`Failed: ${err.error}`);
      }
    } catch (error) {
      alert('Email server connection failed');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const confirmStatusToggle = async () => {
    if (!activeItem) return;
    try {
      const res = await fetch(`/api/employees/${activeItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !activeItem.isActive }),
      });
      if (res.ok) {
        showToast('Status updated!');
        fetchData();
        setModalType(null);
      }
    } catch (e) { alert('Update failed'); }
  };

  const confirmDeleteEmployee = async () => {
    if (!activeItem) return;
    try {
      const res = await fetch(`/api/employees/${activeItem.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Deleted successfully!');
        fetchData();
        setModalType(null);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) { alert('Delete failed'); }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchEmpId = filters.empId === '' || emp.id.toLowerCase().includes(filters.empId.toLowerCase());
    
    let matchCompany = true;
    if (filters.companyId !== '') {
      const selectedCompId = Number(filters.companyId);
      const selectedComp = companies.find(c => c.id === selectedCompId);
      
      let allowedCompanyIds = [selectedCompId];

      if (selectedComp && !selectedComp.parentId) {
        const subCompIds = companies.filter(c => c.parentId === selectedCompId).map(c => c.id);
        allowedCompanyIds = [...allowedCompanyIds, ...subCompIds];
      }

      matchCompany = allowedCompanyIds.includes(emp.companyId);
    }

    const matchPosition = filters.position === '' || emp.position.toLowerCase().includes(filters.position.toLowerCase());
    const matchDept = filters.department === '' || emp.department.toLowerCase().includes(filters.department.toLowerCase());
    const matchStatus = filters.status === '' || (filters.status === 'active' ? emp.isActive : !emp.isActive);

    return matchEmpId && matchCompany && matchPosition && matchDept && matchStatus;
  });

  const totalItems = filteredEmployees.length;
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);
  const startIndex = itemsPerPage === 'all' ? 0 : (currentPage - 1) * itemsPerPage;
  const currentItems = filteredEmployees.slice(startIndex, itemsPerPage === 'all' ? totalItems : startIndex + itemsPerPage);

  const renderCompanyOptions = () => {
    const primaryCompanies = companies.filter(c => !c.parentId);
    
    return primaryCompanies.map(primary => (
      <React.Fragment key={primary.id}>
        <option value={primary.id} className="font-bold text-slate-800">
          🏢 {primary.companyName} (All Sub-Entities)
        </option>
        {companies.filter(c => c.parentId === primary.id).map(sub => (
          <option key={sub.id} value={sub.id} className="text-slate-600">
            &nbsp;&nbsp;&nbsp;&nbsp;↳ {sub.companyName}
          </option>
        ))}
      </React.Fragment>
    ));
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="rounded-2xl bg-white p-6 md:p-10 shadow-sm border border-slate-100">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b-2 border-slate-100 pb-4">
          <h5 className="text-xl font-bold text-blue-600 uppercase tracking-tight">People Management</h5>
          <button onClick={() => openModal('add')} className="flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 active:scale-95">
            <BiUserPlus className="mr-2 text-xl" /> Add Employee
          </button>
        </div>

        {/* Filters Section */}
        <div className="mb-6 rounded-xl bg-slate-50 p-4 border border-slate-100">
          <p className="mb-2 text-xs font-bold text-slate-500 flex items-center uppercase tracking-wider"><BiFilter className="mr-1 text-lg" /> Search Filters</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
            <input type="text" placeholder="EMP ID..." className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 shadow-sm" value={filters.empId} onChange={e => {setFilters({...filters, empId: e.target.value}); setCurrentPage(1);}} />
            
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 shadow-sm text-slate-700" value={filters.companyId} onChange={e => {setFilters({...filters, companyId: e.target.value}); setCurrentPage(1);}}>
              <option value="" className="font-bold">All Companies</option>
              {renderCompanyOptions()}
            </select>

            <input type="text" placeholder="Position..." className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 shadow-sm" value={filters.position} onChange={e => {setFilters({...filters, position: e.target.value}); setCurrentPage(1);}} />
            <input type="text" placeholder="Department..." className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 shadow-sm" value={filters.department} onChange={e => {setFilters({...filters, department: e.target.value}); setCurrentPage(1);}} />
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 shadow-sm text-slate-700" value={filters.status} onChange={e => {setFilters({...filters, status: e.target.value}); setCurrentPage(1);}}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="terminate">Terminate</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-4 text-center">No.</th>
                <th className="px-4 py-4">Employee</th>
                <th className="px-4 py-4">Company</th>
                <th className="px-4 py-4 text-center">System Role</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-4 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400 font-medium animate-pulse">Fetching employee records...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">No employees found.</td></tr>
              ) : (
                currentItems.map((emp, index) => (
                  <tr key={emp.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-4 text-center font-bold text-slate-300">{startIndex + index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-800">{emp.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono uppercase">{emp.id} | {emp.position}</div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-blue-600">{emp.company}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-block min-w-[65px] rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${
                        emp.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : emp.role === 'HR' ? 'bg-pink-100 text-pink-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className="relative inline-block w-10 h-5 align-middle select-none transition duration-200 ease-in">
                          <input type="checkbox" checked={emp.isActive} onChange={() => handleToggleStatusClick(emp)} className={`toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-2 appearance-none cursor-pointer transition-transform duration-200 ${emp.isActive ? 'translate-x-5 border-emerald-500' : 'border-slate-300'}`}/>
                          <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors ${emp.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></label>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${emp.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>{emp.isActive ? 'Active' : 'Terminated'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => openModal('edit', emp)} className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition shadow-sm" title="Edit"><BiCog className="text-lg" /></button>
                        <button onClick={() => openEmailModal(emp)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition shadow-sm" title="Invite"><BiEnvelope className="text-lg" /></button>
                        
                        {/* 🌟 ปุ่มแว่นขยายสำหรับ Preview */}
                        <button onClick={() => openModal('preview', emp)} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-600 hover:text-white transition shadow-sm" title="View"><BiSearch className="text-lg" /></button>
                        
                        <button onClick={() => openModal('deleteWarning', emp)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition shadow-sm" title="Delete"><BiTrash className="text-lg" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && itemsPerPage !== 'all' && (
          <div className="mt-6 flex justify-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <div className="flex items-center px-4 font-bold text-blue-600">Page {currentPage} of {totalPages}</div>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      {/* --- Toast --- */}
      {toastConfig.show && (
        <div className="fixed bottom-10 right-10 z-[200] flex items-center rounded-2xl bg-slate-900 text-white px-6 py-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <span className="text-emerald-400">{toastConfig.icon}</span>
          <span className="font-bold ml-2">{toastConfig.message}</span>
        </div>
      )}

      {/* --- Modals --- */}
      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
          
          {/* 🌟 Add / Edit / Preview Modal */}
          {(modalType === 'add' || modalType === 'edit' || modalType === 'preview') && (
            <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
              
              {/* 🎨 Header สีเปลี่ยนตามโหมด */}
              <div className={`px-8 py-5 flex justify-between items-center text-white ${modalType === 'add' ? 'bg-blue-600' : modalType === 'edit' ? 'bg-amber-500' : 'bg-slate-700'}`}>
                <h5 className="font-black text-xl uppercase tracking-tight flex items-center">
                  {modalType === 'preview' && <BiSearch className="mr-2 text-2xl" />}
                  {modalType === 'add' ? 'Add New Employee' : modalType === 'edit' ? 'Edit Employee Profile' : 'Employee Details'}
                </h5>
                <button onClick={() => setModalType(null)} className="rounded-full p-1 bg-white/20 hover:bg-white/40"><BiX className="text-2xl" /></button>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50">
                {/* 🔒 ใช้ disabled={modalType === 'preview'} ล็อกทุกช่อง */}
                <div className="col-span-1"><label className="font-bold text-xs uppercase text-slate-500 mb-1.5 block">Employee ID *</label><input type="text" value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} disabled={modalType === 'edit' || modalType === 'preview'} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500 disabled:bg-slate-100 font-bold" placeholder="EX: TH001" /></div>
                <div className="col-span-1"><label className="font-bold text-xs uppercase text-slate-500 mb-1.5 block">Full Name *</label><input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} disabled={modalType === 'preview'} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500 font-bold disabled:bg-slate-100 disabled:text-slate-500" placeholder="John Doe" /></div>
                
                <div className="col-span-2"><label className="font-bold text-xs uppercase text-slate-500 mb-1.5 block">Company Entity *</label>
                  <select value={formData.companyId || ''} onChange={e => setFormData({...formData, companyId: Number(e.target.value)})} disabled={modalType === 'preview'} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500 font-bold bg-white disabled:bg-slate-100 disabled:text-slate-500">
                    <option value="">Select Entity</option>
                    {renderCompanyOptions()}
                  </select>
                </div>
                
                <div><label className="font-bold text-xs uppercase text-slate-500 mb-1.5 block">Position</label><input type="text" value={formData.position || ''} onChange={e => setFormData({...formData, position: e.target.value})} disabled={modalType === 'preview'} className="w-full rounded-xl border border-slate-200 p-3 outline-none disabled:bg-slate-100 disabled:text-slate-500" /></div>
                <div><label className="font-bold text-xs uppercase text-slate-500 mb-1.5 block">Department</label><input type="text" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} disabled={modalType === 'preview'} className="w-full rounded-xl border border-slate-200 p-3 outline-none disabled:bg-slate-100 disabled:text-slate-500" /></div>
                <div><label className="font-bold text-xs uppercase text-slate-500 mb-1.5 block">Email Address</label><input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} disabled={modalType === 'preview'} className="w-full rounded-xl border border-slate-200 p-3 outline-none disabled:bg-slate-100 disabled:text-slate-500" placeholder="example@mail.com" /></div>
                <div><label className="font-bold text-xs uppercase text-slate-500 mb-1.5 block">Start Date</label><input type="date" value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})} disabled={modalType === 'preview'} className="w-full rounded-xl border border-slate-200 p-3 outline-none disabled:bg-slate-100 disabled:text-slate-500" /></div>
                
                <div className="col-span-2 p-5 bg-blue-50 rounded-2xl border border-blue-100">
                   <p className="text-xs font-black text-blue-600 uppercase mb-4 tracking-widest">System Access Credentials</p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="font-bold text-[10px] uppercase text-blue-400 mb-1 block">Login Username *</label><input type="text" value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} disabled={modalType === 'edit' || modalType === 'preview'} className="w-full rounded-lg border-blue-200 border p-2.5 outline-none focus:border-blue-500 disabled:bg-blue-100/50 font-bold text-blue-900" /></div>
                      
                      {/* ซ่อนช่อง Password ถ้าเป็นโหมด Preview */}
                      {modalType !== 'preview' ? (
                        <div>
                          <label className="font-bold text-[10px] uppercase text-blue-400 mb-1 flex justify-between">
                            <span>{modalType === 'edit' ? 'Reset Password (Optional)' : 'Login Password *'}</span>
                            {formData.password && <span className={checkPasswordStrength(formData.password).textColor}>{checkPasswordStrength(formData.password).text}</span>}
                          </label>
                          <div className="relative">
                            <input type={showPassword ? "text" : "password"} value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full rounded-lg border-blue-200 border p-2.5 outline-none focus:border-blue-500 pr-10 font-mono" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300">{showPassword ? <BiShow /> : <BiHide />}</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="font-bold text-[10px] uppercase text-blue-400 mb-1 block">Login Password</label>
                          <input type="password" value="********" disabled className="w-full rounded-lg border-blue-200 border p-2.5 outline-none focus:border-blue-500 disabled:bg-blue-100/50 font-mono text-blue-900" />
                        </div>
                      )}

                      <div className="md:col-span-2 mt-2"><label className="font-bold text-[10px] uppercase text-blue-400 mb-1 block">Permission Level</label>
                        <select value={formData.role || 'USER'} onChange={e => setFormData({...formData, role: e.target.value as any})} disabled={modalType === 'preview'} className="w-full rounded-lg border-blue-200 border p-2.5 font-black text-blue-700 bg-white shadow-sm disabled:bg-blue-100/50">
                          <option value="USER">Standard User (Employee)</option>
                          <option value="HR">Human Resources (HR)</option>
                          {currentUserRole === 'ADMIN' && <option value="ADMIN">System Administrator</option>}
                        </select>
                      </div>
                   </div>
                </div>
              </div>

              {/* 🔘 โหมด Preview จะแสดงแค่ปุ่ม Close อย่างเดียว */}
              <div className="flex justify-end gap-3 bg-white px-8 py-5 border-t border-slate-100">
                <button onClick={() => setModalType(null)} className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-400 hover:bg-slate-50">
                  {modalType === 'preview' ? 'Close' : 'Cancel'}
                </button>
                {modalType !== 'preview' && (
                  <button onClick={handleSaveEmployee} className={`rounded-xl px-8 py-2.5 text-sm font-black text-white shadow-lg transition active:scale-95 ${modalType === 'add' ? 'bg-blue-600 shadow-blue-200' : 'bg-amber-500 shadow-amber-200'}`}>
                    {modalType === 'add' ? 'Confirm & Create' : 'Save All Changes'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Email Modal */}
          {modalType === 'email' && activeItem && (
            <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-slate-900 px-8 py-5 flex justify-between items-center text-white">
                <h5 className="font-black text-lg uppercase tracking-tight flex items-center"><BiEnvelope className="mr-2 text-2xl text-blue-400" /> Send System Invitation</h5>
                <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white"><BiX className="text-2xl" /></button>
              </div>
              <div className="p-8 space-y-5 bg-slate-50">
                <div className="flex items-center p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                   <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black mr-4 uppercase">{activeItem.name.charAt(0)}</div>
                   <div><p className="text-xs font-bold text-slate-400 uppercase">Recipient</p><p className="font-black text-slate-800">{activeItem.name} ({activeItem.email})</p></div>
                </div>
                <div><label className="font-bold text-[10px] uppercase text-slate-400 mb-1.5 block ml-1">Subject</label><input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3.5 outline-none focus:border-blue-500 font-bold text-slate-700 shadow-sm" /></div>
                <div><label className="font-bold text-[10px] uppercase text-slate-400 mb-1.5 block ml-1">Message Content</label><textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={7} className="w-full rounded-xl border border-slate-200 p-3.5 outline-none focus:border-blue-500 text-sm leading-relaxed text-slate-600 shadow-sm"></textarea></div>
              </div>
              <div className="flex justify-end gap-3 bg-white px-8 py-5 border-t border-slate-100">
                <button onClick={() => setModalType(null)} className="font-bold text-slate-400 px-6 py-2">Close</button>
                <button onClick={handleSendEmail} disabled={isSendingEmail} className="flex items-center rounded-xl bg-blue-600 px-8 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition active:scale-95">
                  {isSendingEmail ? <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span> : <BiSend className="mr-2 text-xl" />}
                  {isSendingEmail ? 'Sending...' : 'Deliver Invitation'}
                </button>
              </div>
            </div>
          )}

          {/* Delete Warning Modal */}
          {modalType === 'deleteWarning' && activeItem && (
            <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <BiTrash className="text-4xl text-red-500" />
              </div>
              <h5 className="text-xl font-black text-slate-800 uppercase tracking-tight">Remove Employee?</h5>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">คุณกำลังจะลบข้อมูลของ <b className="text-slate-800">{activeItem.name}</b> ออกจากฐานข้อมูลอย่างถาวร ยืนยันการดำเนินการ?</p>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setModalType(null)} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-400 hover:bg-slate-50">Cancel</button>
                <button onClick={confirmDeleteEmployee} className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-black text-white shadow-lg shadow-red-100 hover:bg-red-600 transition active:scale-95">Confirm Delete</button>
              </div>
            </div>
          )}

          {/* Status Warning Modal */}
          {modalType === 'statusWarning' && activeItem && (
            <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <BiErrorCircle className="text-4xl text-amber-500" />
              </div>
              <h5 className="text-xl font-black text-slate-800 uppercase tracking-tight">Change Employment?</h5>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">เปลี่ยนสถานะการจ้างงานเป็น <b className={activeItem.isActive ? 'text-red-500' : 'text-emerald-500'}>{activeItem.isActive ? 'Terminated' : 'Active'}</b> หรือไม่?</p>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setModalType(null)} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-400 hover:bg-slate-50">Cancel</button>
                <button onClick={confirmStatusToggle} className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-black text-white shadow-lg shadow-amber-100 hover:bg-amber-600 transition active:scale-95">Confirm Update</button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}