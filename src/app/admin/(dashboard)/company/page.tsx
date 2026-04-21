// src/app/admin/companies/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { BiBuilding, BiPlus, BiSubdirectoryRight, BiX, BiRefresh, BiCog, BiTrash, BiSearch, BiImage } from 'react-icons/bi';

interface Company {
  id: number;
  companyCode: string;
  companyName: string;
  logoUrl: string | null;
  parentId: number | null;
  subCompanies?: Company[];
}

export default function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT' | 'PREVIEW'>('CREATE');
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    companyCode: '',
    companyName: '',
    logoUrl: '',
    parentId: ''
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const openModal = (mode: 'CREATE' | 'EDIT' | 'PREVIEW', company?: Company) => {
    setModalMode(mode);
    if (company) {
      setEditingId(company.id);
      setFormData({
        companyCode: company.companyCode,
        companyName: company.companyName,
        logoUrl: company.logoUrl || '',
        parentId: company.parentId ? company.parentId.toString() : ''
      });
    } else {
      setEditingId(null);
      setFormData({ companyCode: '', companyName: '', logoUrl: '', parentId: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'PREVIEW') return;
    setIsSaving(true);

    const url = modalMode === 'EDIT' ? `/api/companies/${editingId}` : '/api/companies';
    const method = modalMode === 'EDIT' ? 'PUT' : 'POST';

    const formDataToSend = new FormData();
    formDataToSend.append('companyCode', formData.companyCode);
    formDataToSend.append('companyName', formData.companyName);
    if (formData.parentId) {
      formDataToSend.append('parentId', formData.parentId.toString());
    } else {
      formDataToSend.append('parentId', ''); 
    }

    if (logoFile) formDataToSend.append('logoFile', logoFile);

    try {
      const res = await fetch(url, {
        method,
        body: formDataToSend, 
      });

      if (res.ok) {
        alert(modalMode === 'EDIT' ? 'อัปเดตข้อมูลสำเร็จ!' : 'สร้างบริษัทสำเร็จ!');
        setIsModalOpen(false);
        setLogoFile(null); 
        fetchCompanies();
      } else {
        const errData = await res.json();
        alert(`เกิดข้อผิดพลาด: ${errData.error}`);
      }
    } catch (error) {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบบริษัท "${name}"?\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) return;

    try {
      const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('ลบข้อมูลสำเร็จ!');
        fetchCompanies();
      } else {
        const errData = await res.json();
        alert(`ลบไม่สำเร็จ: ${errData.error}`);
      }
    } catch (error) {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  // 🌟 จุดสำคัญ: กรองบริษัทที่จะมาเป็น "หัวตาราง" 
  // (ถ้าคนล็อกอินเป็นแม่ จะเห็นแม่เป็นหัวแถว / ถ้าคนล็อกอินเป็นลูก จะเห็นลูกเป็นหัวแถวแทน)
  const displayCompanies = companies.filter(c => 
    c.parentId === null || !companies.find(parent => parent.id === c.parentId)
  );

  const ActionButtons = ({ company }: { company: Company }) => (
    <div className="flex items-center justify-end gap-2">
      <button onClick={() => openModal('PREVIEW', company)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white transition shadow-sm" title="Preview"><BiSearch className="text-lg" /></button>
      <button onClick={() => openModal('EDIT', company)} className="p-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-500 hover:text-white transition shadow-sm" title="Edit"><BiCog className="text-lg" /></button>
      <button onClick={() => handleDelete(company.id, company.companyName)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-600 hover:text-white transition shadow-sm" title="Delete"><BiTrash className="text-lg" /></button>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 bg-slate-50 min-h-screen">
      
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-800 p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black flex items-center tracking-tight">
            <BiBuilding className="mr-3 text-4xl text-blue-300" /> Company Management
          </h2>
          <p className="mt-2 text-blue-100 font-medium">Manage primary holding companies and subsidiaries</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchCompanies} className="flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-sm font-bold backdrop-blur-sm transition"><BiRefresh className="mr-2 text-lg" /> Refresh</button>
          <button onClick={() => openModal('CREATE')} className="flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-sm font-bold shadow-md transition"><BiPlus className="mr-2 text-xl" /> New Company</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400 font-semibold animate-pulse">Loading company structures...</div>
        ) : displayCompanies.length === 0 ? (
          <div className="p-10 text-center text-slate-400 font-semibold">No companies found. Click "New Company" to start.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">Company Info</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">Company Code</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-xs text-center">Type</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayCompanies.map((main) => (
                  <React.Fragment key={main.id}>
                    <tr className="hover:bg-blue-50/50 transition">
                      <td className="px-6 py-5 flex items-center">
                        <div className="h-12 w-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center mr-4 shadow-sm overflow-hidden shrink-0">
                          {main.logoUrl ? <img src={main.logoUrl} alt="logo" className="h-full w-full object-contain p-1" /> : <BiBuilding className="text-2xl text-slate-300" />}
                        </div>
                        <span className="font-black text-slate-800 text-base">{main.companyName}</span>
                      </td>
                      <td className="px-6 py-5 font-mono font-bold text-slate-600">{main.companyCode}</td>
                      <td className="px-6 py-5 text-center">
                        {/* 🌟 เปลี่ยนสีป้ายสถานะตามความเป็นจริง */}
                        <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border shadow-sm ${main.parentId === null ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                          {main.parentId === null ? 'Primary' : 'Sub-Company'}
                        </span>
                      </td>
                      <td className="px-6 py-5"><ActionButtons company={main} /></td>
                    </tr>
                    
                    {main.subCompanies?.map((sub) => (
                      <tr key={sub.id} className="bg-slate-50/80 hover:bg-slate-100 transition">
                        <td className="px-6 py-4 pl-14 flex items-center">
                          <BiSubdirectoryRight className="mr-3 text-slate-400 text-2xl shrink-0" />
                          <div className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center mr-3 shadow-sm overflow-hidden shrink-0">
                            {sub.logoUrl ? <img src={sub.logoUrl} alt="logo" className="h-full w-full object-contain p-0.5" /> : <BiBuilding className="text-slate-300" />}
                          </div>
                          <span className="font-bold text-slate-700">{sub.companyName}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-slate-500 text-sm">{sub.companyCode}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-bold uppercase border border-emerald-200">
                            Sub-Company
                          </span>
                        </td>
                        <td className="px-6 py-4"><ActionButtons company={sub} /></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className={`flex items-center justify-between px-6 py-4 text-white ${modalMode === 'PREVIEW' ? 'bg-blue-600' : modalMode === 'EDIT' ? 'bg-amber-500' : 'bg-emerald-600'}`}>
              <h3 className="text-lg font-bold flex items-center">
                {modalMode === 'PREVIEW' ? <BiSearch className="mr-2 text-xl" /> : modalMode === 'EDIT' ? <BiCog className="mr-2 text-xl" /> : <BiPlus className="mr-2 text-xl" />}
                {modalMode === 'PREVIEW' ? 'Company Details' : modalMode === 'EDIT' ? 'Edit Company' : 'Add New Company'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-1 bg-white/20 hover:bg-white/40 transition"><BiX className="text-2xl" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-slate-50">
              {modalMode === 'PREVIEW' && formData.logoUrl && (
                <div className="flex justify-center mb-6">
                  <div className="h-24 w-24 rounded-2xl border-4 border-white shadow-lg bg-white overflow-hidden p-2">
                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">Company Name <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="e.g. 2C2P Thailand Co., Ltd." value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} disabled={modalMode === 'PREVIEW'} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-200 disabled:text-slate-500" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">Company Registration No. <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="e.g. 2C2P-TH" value={formData.companyCode} onChange={e => setFormData({...formData, companyCode: e.target.value})} disabled={modalMode === 'PREVIEW'} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-200 disabled:text-slate-500" />
              </div>

              {modalMode !== 'PREVIEW' && (
                <div>
                  <label className="mb-1.5 flex items-center text-sm font-bold text-slate-700">
                    <BiImage className="mr-1 text-slate-400" /> Upload Logo (Optional)
                  </label>
                  <input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={e => { if (e.target.files && e.target.files.length > 0) setLogoFile(e.target.files[0]); }} className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer" />
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-4 mt-2 shadow-sm">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Hierarchy Level</label>
                <select value={formData.parentId} onChange={e => setFormData({...formData, parentId: e.target.value})} disabled={modalMode === 'PREVIEW'} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400">
                  <option value="">--- 👑 Primary Company (บริษัทแม่หลัก) ---</option>
                  {displayCompanies.filter(c => c.id !== editingId).map(company => (
                    <option key={company.id} value={company.id}>↳ Sub-company of: {company.companyName}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 transition">{modalMode === 'PREVIEW' ? 'Close' : 'Cancel'}</button>
                {modalMode !== 'PREVIEW' && (
                  <button type="submit" disabled={isSaving} className={`rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition ${isSaving ? 'bg-slate-400' : modalMode === 'EDIT' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{isSaving ? 'Saving...' : modalMode === 'EDIT' ? 'Save Changes' : 'Create Company'}</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}