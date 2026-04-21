// src/app/admin/(dashboard)/import/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BiCloudUpload, BiCheckCircle, BiError, BiTrash, 
  BiUpload, BiBuildings 
} from 'react-icons/bi';
import * as XLSX from 'xlsx';

export default function ImportSalary() {
  const router = useRouter();
  
  // --- สร้างฟังก์ชันคำนวณหาวันที่ปัจจุบัน (ปี-เดือน) ---
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const defaultPeriod = `${currentYear}-${currentMonth}`;      
  const defaultPayment = `${currentYear}-${currentMonth}-25`;  

  // --- States หลัก ---
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showConfirmModal, setShowConfirmModal] = useState<'confirm' | 'cancel' | null>(null);
  
  // 🌟 STATES: สำหรับ Batch Settings (ย้ายมาใช้ตั้งแต่ Step 1)
  const [batchCompany, setBatchCompany] = useState('');        
  const [companies, setCompanies] = useState<any[]>([]);       
  const [batchPeriod, setBatchPeriod] = useState(defaultPeriod);       
  const [batchPaymentDate, setBatchPaymentDate] = useState(defaultPayment); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State เก็บข้อมูล
  const [parsedRecords, setParsedRecords] = useState<any[]>([]);
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);

  // ดึงข้อมูลบริษัทและพนักงานตอนเปิดหน้า
  useEffect(() => {
    const fetchData = async () => {
      try {
        const compRes = await fetch('/api/companies');
        if (compRes.ok) {
          const data = await compRes.json();
          const uniqueCompanies = data.reduce((acc: any[], current: any) => {
            const x = acc.find(item => item.id === current.id);
            if (!x) return acc.concat([current]);
            return acc;
          }, []);
          setCompanies(uniqueCompanies);
        }

        const empRes = await fetch('/api/employees');
        if (empRes.ok) {
          const empData = await empRes.json();
          setDbEmployees(empData.data || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  // 🌟 ฟังก์ชันเคลียร์ไฟล์เวลาเปลี่ยนการตั้งค่าใน Step 1
  const handleConfigChange = (setter: any, value: any) => {
    setter(value);
    setParsedRecords([]); // ล้างข้อมูลที่เคยอ่านไว้ เพราะ Setting เปลี่ยน
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isReadyToUpload = batchCompany !== '' && batchPeriod !== '';

  const filteredRecords = parsedRecords.filter(record => 
    filterStatus === 'all' ? true : record.status === filterStatus
  );

  // --- Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurrentStep(2);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0]; 
        const ws = wb.Sheets[wsname];

        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (data.length < 2) throw new Error("ไฟล์ไม่มีข้อมูล");

        const headers = data[0].map((h: any) => String(h || "").toLowerCase().trim());
        
        const rows = data.slice(1);
        const mappedData = rows.map((row) => {
          
          const getVal = (key: string) => {
            const index = headers.indexOf(key.toLowerCase().trim());
            return index !== -1 ? row[index] : null;
          };

          const getNum = (key: string) => {
            const val = getVal(key);
            const num = parseFloat(String(val).replace(/,/g, ''));
            return isNaN(num) ? 0.00 : num;
          };

          const empId = getVal('employee id');
          
          // 🌟 เช็ก 2 ด่าน: 1. มีในระบบไหม? 2. อยู่ในบริษัทที่เลือกไว้ใน Step 1 ไหม?
          const empInDb = dbEmployees.find(e => String(e.id).trim() === String(empId).trim());

          let status = 'ready';
          let errorMsg = null;

          if (!empId) {
            status = 'failed';
            errorMsg = 'Missing Employee ID';
          } else if (!empInDb) {
            status = 'failed';
            errorMsg = 'ไม่พบรหัสพนักงานในระบบ';
          } else if (empInDb.currentCompanyId !== Number(batchCompany)) {
            status = 'failed';
            errorMsg = 'พนักงานไม่ได้สังกัดบริษัทที่เลือก';
          }

          return {
            rowNumber: getNum('no.'),
            id: empId, 
            name: getVal('name'),
            position: getVal('position'),
            department: getVal('department'),
            function: getVal('function'),
            startDate: getVal('start date'),
            bank: getVal('bank'),
            bankAccount: getVal('bank account'),

            salary: getNum('salary'), 
            mobileAllowance: getNum('mobile allowance'),
            housingTravelingAllowance: getNum('housing traveling allowance'),
            overtime: getNum('overtime'),
            bonus: getNum('bonus'),
            others: getNum('other'),
            parkingAllowance: getNum('parking allowance'),
            perdiemOtherAdditional: getNum('perdium other additional'),
            totalEarnings: getNum('total earning'),

            tax: getNum('tax'),
            socialSecurityFund: getNum('social security fund'),
            providentFund: getNum('provident fund'),
            studentLoanFund: getNum('student loan fund'),
            parking: getNum('parking'),
            otherDeduction: getNum('other deduction'),
            totalDeduction: getNum('total deduction'),

            totalAmount: getNum('total amount'),
            payrollAmount: getNum('payroll amount'),

            allowance: getNum('mobile allowance') + getNum('housing traveling allowance'), 
            status: status,
            error: errorMsg
          };
        });

        setParsedRecords(mappedData.filter(r => r.rowNumber || r.id)); 
        
        setTimeout(() => {
          setIsProcessing(false);
        }, 1500);

      } catch (error) {
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel ครับ กรุณาเช็กฟอร์แมตอีกครั้ง");
        setIsProcessing(false);
        setCurrentStep(1); 
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleModalAction = async () => {
    if (showConfirmModal === 'confirm') {
      setIsProcessing(true); 
      
      try {
        const readyRecords = parsedRecords.filter(r => r.status === 'ready');
        
        const res = await fetch('/api/payroll/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: batchCompany,
            period: batchPeriod,
            paymentDate: batchPaymentDate,
            records: readyRecords,
            fileName: fileInputRef.current?.files?.[0]?.name || "Web_Upload_Excel"
          })
        });

        if (res.ok) {
          setCurrentStep(4); 
        } else {
          const err = await res.json();
          alert(`เกิดข้อผิดพลาด: ${err.error}`);
        }
      } catch (error) {
        alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ครับ");
      } finally {
        setIsProcessing(false);
        setShowConfirmModal(null);
      }
      
    } else {
      setParsedRecords([]);
      setBatchCompany('');
      setCurrentStep(1);
      setShowConfirmModal(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl relative">
      
      {/* --- Main Card --- */}
      <div className="rounded-2xl bg-white p-6 md:p-10 shadow-sm border border-slate-100">
        
        <h4 className="flex items-center text-2xl font-bold text-slate-800 mb-8">
          <BiUpload className="mr-3 text-blue-600" /> 
          Import Salary Wizard
        </h4>

        {/* --- Stepper UI --- */}
        <div className="relative mb-12 flex justify-between">
          <div className="absolute left-0 top-6 h-1 w-full bg-slate-100 z-0"></div>
          {[1, 2, 3, 4].map((step) => {
            const isActive = step === currentStep;
            const isCompleted = step < currentStep;
            return (
              <div 
                key={step} 
                onClick={() => {
                  if (step < currentStep && currentStep !== 4) {
                    setCurrentStep(step);
                  }
                }}
                className={`relative z-10 flex flex-col items-center flex-1 ${step < currentStep && currentStep !== 4 ? 'cursor-pointer hover:opacity-80' : ''}`}
              >
                <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full border-4 font-bold transition-all duration-300
                  ${isActive ? 'border-blue-100 bg-white text-blue-600 shadow-[0_0_0_2px_#2563eb]' : ''}
                  ${isCompleted ? 'border-blue-600 bg-blue-600 text-white' : ''}
                  ${!isActive && !isCompleted ? 'border-slate-100 bg-white text-slate-400' : ''}
                `}>
                  {isCompleted ? <BiCheckCircle className="text-2xl" /> : step}
                </div>
                <span className={`text-sm font-semibold transition-colors duration-300
                  ${isActive ? 'text-blue-600' : isCompleted ? 'text-slate-800' : 'text-slate-400'}
                `}>
                  {step === 1 ? 'Setup & Upload' : step === 2 ? 'Validate' : step === 3 ? 'Review & Confirm' : 'Complete'}
                </span>
              </div>
            );
          })}
        </div>

        {/* --- Step 1: Setup & Upload File --- */}
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 🌟 ย้าย Batch Settings มาไว้ Step 1 */}
            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/50 p-6 shadow-sm">
              <h6 className="mb-5 text-sm font-bold text-blue-800 flex items-center">
                <BiBuildings className="mr-2 text-lg" /> 1. กำหนดการตั้งค่าก่อนนำเข้าข้อมูล
              </h6>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">Target Company <span className="text-red-500">*</span></label>
                  <select 
                    value={batchCompany}
                    onChange={e => handleConfigChange(setBatchCompany, e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm font-semibold outline-none transition-all ${batchCompany === '' ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-100' : 'border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`}
                  >
                    <option value="">-- Select Target Company --</option>
                    {companies.map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.parentId ? `↳ [Sub] ${comp.companyName}` : `🏢 [Primary] ${comp.companyName}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">Payroll Period <span className="text-red-500">*</span></label>
                  <input 
                    type="month" 
                    value={batchPeriod}
                    onChange={e => handleConfigChange(setBatchPeriod, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">Payment Date</label>
                  <input 
                    type="date" 
                    value={batchPaymentDate}
                    onChange={e => handleConfigChange(setBatchPaymentDate, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
                  />
                </div>
              </div>
            </div>

            {/* 🌟 ล็อกปุ่มอัปโหลดถ้ายังไม่ตั้งค่า */}
            <div 
              onClick={() => isReadyToUpload && fileInputRef.current?.click()} 
              className={`group rounded-2xl border-2 border-dashed py-16 text-center transition-all ${isReadyToUpload ? 'cursor-pointer border-blue-300 bg-white hover:border-blue-500 hover:bg-blue-50' : 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70'}`}
            >
              <BiCloudUpload className={`mx-auto mb-4 text-7xl transition-transform ${isReadyToUpload ? 'text-blue-500 group-hover:scale-110' : 'text-slate-300'}`} />
              <h5 className={`mb-2 text-xl font-bold ${isReadyToUpload ? 'text-slate-700' : 'text-slate-400'}`}>
                {isReadyToUpload ? '2. Click to upload salary file' : 'Please configure settings first'}
              </h5>
              <p className="text-sm text-slate-500 mb-2">Excel or CSV files only</p>
              
              {!isReadyToUpload && (
                <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                  กรุณาเลือกบริษัทและรอบบิลด้านบนก่อนอัปโหลดไฟล์
                </span>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .csv" className="hidden" />
            </div>
          </div>
        )}

       {/* --- Step 2: Validation --- */}
        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 py-10 text-center">
            {isProcessing ? (
              <div>
                <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
                <h5 className="text-xl font-bold text-slate-800">Processing file...</h5>
                <p className="mt-2 text-slate-500">Analyzing records and validating employee IDs against selected company.</p>
              </div>
            ) : (
              <div>
                {parsedRecords.filter(r => r.status === 'failed').length > 0 ? (
                  <BiError className="mx-auto mb-4 text-7xl text-amber-500" />
                ) : (
                  <BiCheckCircle className="mx-auto mb-4 text-7xl text-emerald-500" />
                )}
                
                <h5 className={`mb-6 text-xl font-bold ${parsedRecords.filter(r => r.status === 'failed').length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {parsedRecords.filter(r => r.status === 'failed').length > 0 ? 'Validation completed with warnings.' : 'Validation completed successfully!'}
                </h5>
                
                <p className="mb-8 font-semibold text-slate-600">
                  {parsedRecords.filter(r => r.status === 'ready').length} records validated successfully.{' '}
                  {parsedRecords.filter(r => r.status === 'failed').length > 0 && (
                    <span className="text-red-500">{parsedRecords.filter(r => r.status === 'failed').length} records failed validation.</span>
                  )}
                </p>
                
                <div className="flex justify-center gap-3">
                  <button onClick={() => setCurrentStep(1)} className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">Upload New File</button>
                  <button onClick={() => setCurrentStep(3)} className="rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white shadow-md hover:bg-blue-700">Next to Review</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- Step 3: Review & Confirm --- */}
        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Alert Warning Overwrite */}
            <div className="mb-6 flex items-start rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 shadow-sm">
              <BiError className="mr-3 text-2xl shrink-0 mt-0.5 text-red-500" />
              <div className="text-sm leading-relaxed m-0">
                <strong className="text-red-700">Overwrite Warning:</strong><br/>
                หากมีข้อมูลของ <b>รอบบิล ({batchPeriod})</b> สำหรับบริษัทที่เลือกอยู่ในระบบแล้ว การกด Confirm จะเป็นการ <b>ลบข้อมูลเดิมทั้งหมดและเขียนทับด้วยไฟล์นี้ใหม่</b> ทันที
              </div>
            </div>

            {/* Header ของตาราง */}
            <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <h6 className="font-bold text-slate-700 m-0">Review Imported Records</h6>
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <label className="mr-3 text-sm font-bold text-slate-500">Filter Status:</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
                    <option value="all">All Records ({parsedRecords.length})</option>
                    <option value="ready">Ready ({parsedRecords.filter(r => r.status === 'ready').length})</option>
                    <option value="failed">Failed ({parsedRecords.filter(r => r.status === 'failed').length})</option>
                  </select>
                </div>
                <span className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-800">Showing {filteredRecords.length} records</span>
              </div>
            </div>

            {/* Table */}
            <div className="max-h-[400px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="sticky top-0 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 shadow-sm z-10">
                  <tr>
                    <th className="px-4 py-3">Emp ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3 text-right">Base Salary</th>
                    <th className="px-4 py-3 text-right">Allowances</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record, index) => (
                    <tr key={index} className={record.status === 'failed' ? 'bg-red-50/50' : 'hover:bg-slate-50'}>
                      <td className={`px-4 py-4 font-semibold ${record.status === 'failed' ? 'text-red-500' : 'text-slate-600'}`}>{record.id}</td>
                      <td className="px-4 py-4 font-bold text-slate-800">{record.name}</td>
                      <td className={`px-4 py-4 text-right font-semibold ${record.status === 'failed' && record.salary === 'Invalid' ? 'text-red-500' : 'text-slate-700'}`}>
                        {typeof record.salary === 'number' ? record.salary.toLocaleString() : record.salary}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-700">
                        {typeof record.allowance === 'number' ? record.allowance.toLocaleString() : record.allowance}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {record.status === 'ready' ? (
                          <span className="rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">Ready</span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="rounded-full bg-red-100 border border-red-200 px-3 py-1 text-xs font-bold text-red-700 mb-1">Failed</span>
                            <span className="text-[11px] font-semibold text-red-500">Error: {record.error}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                     <tr><td colSpan={5} className="py-8 text-center text-slate-400">No records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Alert Warning สำหรับ Error Records */}
            {parsedRecords.filter(r => r.status === 'failed').length > 0 && (
              <div className="mt-4 flex items-center rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 shadow-sm">
                <BiError className="mr-3 text-3xl shrink-0" />
                <p className="text-sm leading-relaxed m-0">
                  <strong>Attention:</strong> There are <span className="font-bold text-red-600">{parsedRecords.filter(r => r.status === 'failed').length} failed records</span>. Only "Ready" records will be imported. Please correct the failed data in your file and re-upload if necessary.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowConfirmModal('cancel')} className="rounded-lg border-2 border-red-500 px-6 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-50">CANCEL</button>
              
              <button 
                onClick={() => setShowConfirmModal('confirm')} 
                disabled={parsedRecords.filter(r => r.status === 'ready').length === 0}
                className={`flex items-center rounded-lg px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all ${parsedRecords.filter(r => r.status === 'ready').length > 0 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-300 cursor-not-allowed opacity-70'}`}
              >
                CONFIRM IMPORT ({parsedRecords.filter(r => r.status === 'ready').length})
              </button>
            </div>

          </div>
        )}

        {/* --- Step 4: Success Complete --- */}
        {currentStep === 4 && (
          <div className="animate-in fade-in zoom-in duration-500 py-12 text-center">
            <BiCheckCircle className="mx-auto mb-6 text-8xl text-emerald-500 drop-shadow-sm" />
            <h3 className="mb-3 text-3xl font-black text-slate-800 tracking-tight">Import Successful!</h3>
            <p className="mb-8 text-lg font-medium text-slate-500">{parsedRecords.filter(r => r.status === 'ready').length} payroll records have been committed to the database.</p>
            
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => {
                  setParsedRecords([]); 
                  setBatchCompany('');  
                  setCurrentStep(1);    
                }} 
                className="rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-lg font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:-translate-y-1"
              >
                Import Another File
              </button>
              
              <button 
                onClick={() => router.push('/admin/summary')} 
                className="rounded-xl bg-blue-600 px-8 py-3.5 text-lg font-bold text-white shadow-lg transition hover:bg-blue-700 hover:-translate-y-1"
              >
                Go to Salary Summary
              </button>
            </div>
          </div>
        )}

      </div>

      {/* --- Confirm / Cancel Modal --- */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            {showConfirmModal === 'confirm' ? (
              <BiCheckCircle className="mx-auto mb-4 text-7xl text-emerald-500" />
            ) : (
              <BiTrash className="mx-auto mb-4 text-7xl text-red-500" />
            )}
            <h5 className="text-xl font-bold text-slate-800 mb-2">{showConfirmModal === 'confirm' ? 'Confirm Data Import?' : 'Cancel Process?'}</h5>
            
            <p className="mb-6 text-sm font-medium text-slate-500 leading-relaxed px-2">
              {showConfirmModal === 'confirm' 
                ? <span>คุณกำลังจะนำเข้าข้อมูล <b>{parsedRecords.filter(r => r.status === 'ready').length} รายการ</b> เข้าสู่ระบบ<br/><span className="text-red-500 mt-2 block">** คำเตือน: ข้อมูลเดิมในรอบบิลเดียวกันจะถูกเขียนทับทั้งหมด (Overwrite) **</span></span> 
                : 'All uploaded salary data will be cleared and you will need to start over.'}
            </p>

            <div className="flex justify-center gap-3">
              <button onClick={() => setShowConfirmModal(null)} disabled={isProcessing} className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Go Back</button>
              <button onClick={handleModalAction} disabled={isProcessing} className={`flex items-center rounded-lg px-6 py-2.5 text-sm font-bold text-white shadow-sm ${showConfirmModal === 'confirm' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'} disabled:opacity-70`}>
                 {isProcessing ? <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span> Processing...</> : showConfirmModal === 'confirm' ? 'Confirm Import' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}