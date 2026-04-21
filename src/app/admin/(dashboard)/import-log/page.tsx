// src/app/admin/(dashboard)/import-log/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { BiHistory, BiRefresh, BiCheckCircle, BiXCircle, BiSearch, BiFilter, BiBuildings, BiX, BiDetail } from 'react-icons/bi';
import { redirect } from 'next/navigation';

interface ImportBatch {
  id: string;
  createdAt: string;
  month: number;
  year: number;
  paymentDate: string | null;
  totalRecords: number;
  readyRecords: number;
  failedRecords: number;
  status: string;
  uploadedById: string;
  company: {
    companyName: string;
  };
}

export default function ImportLogPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [logs, setLogs] = useState<ImportBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 Filter States
  const [searchCompany, setSearchCompany] = useState('');
  const [searchPeriod, setSearchPeriod] = useState('');

  // 🌟 Preview Modal States
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewRecords, setPreviewRecords] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null);

  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.role !== "ADMIN") redirect("/admin/company");
  }, [session, sessionStatus]);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/payroll/import-logs');
      if (res.ok) setLogs(await res.json());
    } catch (error) {
      console.error("Error fetching logs", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🌟 ฟังก์ชันดึงข้อมูลพนักงานตอนกดปุ่ม Preview
  const openPreview = async (batch: ImportBatch) => {
    setSelectedBatch(batch);
    setPreviewModalOpen(true);
    setIsPreviewLoading(true);
    try {
      const res = await fetch(`/api/payroll/import-logs/${batch.id}`);
      if (res.ok) setPreviewRecords(await res.json());
    } catch (error) {
      alert("ไม่สามารถดึงข้อมูลพนักงานได้");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // 🌟 ลอจิกการกรองข้อมูล (Filter)
  const filteredLogs = logs.filter(log => {
    const matchCompany = searchCompany === '' || log.company?.companyName.toLowerCase().includes(searchCompany.toLowerCase());
    const logPeriod = `${log.year}-${String(log.month).padStart(2, '0')}`;
    const matchPeriod = searchPeriod === '' || logPeriod === searchPeriod;
    return matchCompany && matchPeriod;
  });

  // สร้างรายการบริษัทแบบไม่ซ้ำสำหรับ Dropdown Filter
  const uniqueCompanies = Array.from(new Set(logs.map(log => log.company?.companyName))).filter(Boolean);

  if (sessionStatus === "loading") return <div className="p-10 text-center">Loading...</div>;
  if (session?.user?.role !== "ADMIN") return null;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black flex items-center tracking-tight">
            <BiHistory className="mr-3 text-4xl text-blue-400" /> Data Import Logs
          </h2>
          <p className="mt-2 text-slate-300 font-medium">System history for payroll and employee data imports</p>
        </div>
        <button onClick={fetchLogs} className="flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 text-sm font-bold backdrop-blur-sm transition active:scale-95">
          <BiRefresh className="mr-2 text-xl" /> Refresh Logs
        </button>
      </div>

      {/* 🌟 Search Filters */}
      <div className="mb-6 rounded-xl bg-white p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center mb-1.5"><BiBuildings className="mr-1" /> Filter by Company</label>
          <select value={searchCompany} onChange={e => setSearchCompany(e.target.value)} className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
            <option value="">All Companies</option>
            {uniqueCompanies.map((comp, idx) => (
              <option key={idx} value={comp as string}>{comp}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center mb-1.5"><BiFilter className="mr-1" /> Filter by Period</label>
          <input type="month" value={searchPeriod} onChange={e => setSearchPeriod(e.target.value)} className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">Date & Time</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">Target Company</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">Payroll Period</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">Payment Date</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-xs text-center">Records</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-xs text-center">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-xs text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400 font-semibold animate-pulse">Loading import history...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">No import logs found matching your criteria.</td></tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{new Date(log.createdAt).toLocaleDateString('en-GB')}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{new Date(log.createdAt).toLocaleTimeString('en-GB')}</div>
                    </td>
                    
                    <td className="px-6 py-4 font-bold text-blue-600">{log.company?.companyName || 'Unknown Company'}</td>
                    
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                        {log.year}-{String(log.month).padStart(2, '0')}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-600">{log.paymentDate || '-'}</td>
                    
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-black text-slate-700">{log.readyRecords} Rows</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide border shadow-sm bg-emerald-100 text-emerald-700 border-emerald-200">
                        {log.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button onClick={() => openPreview(log)} className="inline-flex items-center p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition shadow-sm" title="Preview Data">
                        <BiDetail className="text-lg" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🌟 Preview Modal */}
      {previewModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-6 py-5 bg-slate-800 text-white border-b border-slate-700">
              <div>
                <h3 className="text-lg font-bold flex items-center"><BiDetail className="mr-2 text-xl text-blue-400" /> Data Import Preview</h3>
                <p className="text-xs text-slate-400 mt-1">Company: {selectedBatch.company?.companyName} | Period: {selectedBatch.year}-{String(selectedBatch.month).padStart(2, '0')}</p>
              </div>
              <button onClick={() => setPreviewModalOpen(false)} className="rounded-full p-2 bg-white/10 hover:bg-white/20 transition"><BiX className="text-2xl" /></button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
              {isPreviewLoading ? (
                <div className="py-20 text-center text-slate-500 font-semibold animate-pulse flex flex-col items-center">
                  <div className="h-10 w-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  Fetching records...
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-bold uppercase text-[10px]">No.</th>
                        <th className="px-4 py-3 font-bold uppercase text-[10px]">Emp ID</th>
                        <th className="px-4 py-3 font-bold uppercase text-[10px]">Name</th>
                        <th className="px-4 py-3 font-bold uppercase text-[10px] text-right">Net Salary</th>
                        <th className="px-4 py-3 font-bold uppercase text-[10px] text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewRecords.map((rec, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500 font-medium">{rec.rowNumber}</td>
                          <td className="px-4 py-3 font-bold text-slate-700">{rec.employeeId}</td>
                          <td className="px-4 py-3 font-semibold">{rec.name}</td>
                          <td className="px-4 py-3 text-right font-mono text-blue-600 font-bold">{Number(rec.payrollAmount).toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Imported</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}