import React, { useState, useEffect } from 'react';
import { ViewMode, AppData } from './types';
import { getAppData, saveAppData } from './services/storage';
import { Users, RefreshCw, Search } from 'lucide-react';
import { lookupTeacherByIDGV } from './components/verifyadmin';

// Components
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ImportSection from './components/ImportSection';
import AttendanceSection from './components/AttendanceSection';
import SettingsSection from './components/SettingsSection';
import GeminiSection from './components/GeminiSection';
import ListSection from './components/ListSection';
import PaymentHistorySection from './components/PaymentHistorySection';
import QRCalculator from './components/QRCalculator';
import ImportQR from './components/ImportQR';
import GVCNSection from './components/GVCNSection';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(() => {
    const savedView = localStorage.getItem('app_current_view');
    if (savedView && Object.values(ViewMode).includes(savedView as ViewMode)) {
      return savedView as ViewMode;
    }
    return ViewMode.DASHBOARD;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Tự động lưu view hiện tại vào localStorage
  useEffect(() => {
    if (view) {
      localStorage.setItem('app_current_view', view);
    }
  }, [view]);

  // 1. Khởi tạo dữ liệu: Ưu tiên lấy từ LocalStorage
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('hocphi_data');
    let parsed: any = null;
    if (saved) {
      try {
        parsed = JSON.parse(saved);
        if (!parsed.sheetLink || parsed.sheetLink.includes('AKfycbxU1gFzMDIzYbWxAh70658gBw6czUAhyhud7VqbZWMD1OYlZfqDR5M7W7wfxz831e3gXA')) {
          parsed.sheetLink = 'https://script.google.com/macros/s/AKfycbwlglx696Wr0BCj8SMAvwh1hlfFg66uemInbxI2W0TdE96wY67eZx_AAxxD5RJnl04NXg/exec';
        }
      } catch (e) {
        console.error("Lỗi dữ liệu LocalStorage:", e);
      }
    }
    const initial: AppData = parsed || getAppData();
    const savedIdgv = localStorage.getItem('saved_idgv');
    if (savedIdgv && (!initial.idgv || !initial.idgv.trim())) {
      initial.idgv = savedIdgv;
    }
    if (!initial.sheetLink || !initial.sheetLink.trim()) {
      initial.sheetLink = 'https://script.google.com/macros/s/AKfycbwlglx696Wr0BCj8SMAvwh1hlfFg66uemInbxI2W0TdE96wY67eZx_AAxxD5RJnl04NXg/exec';
    }
    return initial;
  });

  // 2307them2: Kiểm tra trạng thái đã kết nối Link Script
  const hasSheetLink = Boolean(data.sheetLink && data.sheetLink.trim() !== '');

  // 2307sua2: Giới hạn truy cập - Nếu chưa kết nối Link Script thì tự động đưa về Dashboard
  useEffect(() => {
    if (!hasSheetLink && view !== ViewMode.DASHBOARD && view !== ViewMode.SETTINGS) {
      setView(ViewMode.DASHBOARD);
    }
  }, [view, hasSheetLink]);

  // 2. Hàm kéo dữ liệu từ tất cả các Sheet về App (tự động đính kèm IDGV đã lưu)
  const refreshDataFromCloud = async (link: string, showAlert: boolean = false) => {
    if (!link) return;
    setIsRefreshing(true);
    try {
      const activeIdgv = data.idgv || localStorage.getItem('saved_idgv') || '';
      const url = activeIdgv ? `${link}${link.indexOf('?') === -1 ? '?' : '&'}idgv=${encodeURIComponent(activeIdgv)}` : link;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const cloudData = await response.json();
      
      if (cloudData && cloudData.sheets) {
        const effectiveLinkScript = (cloudData.linkScript && String(cloudData.linkScript).trim() !== '')
          ? String(cloudData.linkScript).trim()
          : (data.sheetLink || link);

        const updatedData: AppData = { 
          ...data, 
          sheets: cloudData.sheets, 
          passwordC2: cloudData.password || data.passwordC2,
          licenseStatus: (cloudData.licenseStatus !== undefined && cloudData.licenseStatus !== '') ? cloudData.licenseStatus : data.licenseStatus,
          fullname: (cloudData.fullname !== undefined && cloudData.fullname !== '') ? cloudData.fullname : data.fullname,
          mon: (cloudData.mon !== undefined && cloudData.mon !== '') ? cloudData.mon : data.mon,
          idmon: (cloudData.idmon !== undefined && cloudData.idmon !== '') ? cloudData.idmon : data.idmon,
          linkScript: effectiveLinkScript,
          idgv: activeIdgv || cloudData.idgv || data.idgv || '',
          sheetLink: effectiveLinkScript 
        };
        setData(updatedData);
        localStorage.setItem('hocphi_data', JSON.stringify(updatedData));
        if (updatedData.idgv) {
          localStorage.setItem('saved_idgv', updatedData.idgv);
        }
        
        if (showAlert) {
          alert("Đồng bộ thành công! Đã tải dữ liệu & kiểm tra bản quyền mới nhất từ Google Sheets.");
        }
      } else if (showAlert) {
        alert("Phản hồi từ Google Sheets không có dữ liệu phù hợp.");
      }
    } catch (err: any) {
      console.warn("Đồng bộ dữ liệu Cloud chưa hoàn tất (Đang ở chế độ Local):", err?.message || err);
      if (showAlert) {
        alert("Không thể kết nối đến Google Sheets. Thầy/Cô kiểm tra lại kết nối mạng hoặc Link Script Apps Script nhé.");
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // 3. Hàm cập nhật dữ liệu khi Settings hoặc Attendance thay đổi
  const handleUpdateData = async (newData: AppData) => {
    if (newData.idgv) {
      localStorage.setItem('saved_idgv', newData.idgv);
    }
    if (newData.sheetLink && newData.sheetLink !== data.sheetLink) {
      setData(newData);
      localStorage.setItem('hocphi_data', JSON.stringify(newData));
      if (window.confirm("Phát hiện Link Script mới. Tải dữ liệu từ Google Sheets về máy này?")) {
        await refreshDataFromCloud(newData.sheetLink, false);
      }
    } else {
      setData(newData);
      localStorage.setItem('hocphi_data', JSON.stringify(newData));
    }
  };

  // 4. Tự động lưu dữ liệu mỗi khi state data thay đổi
  useEffect(() => {
    saveAppData(data);
    if (data.idgv) {
      localStorage.setItem('saved_idgv', data.idgv);
    }
  }, [data]);

  // 5. Tự động đồng bộ NGẦM khi vừa mở App & Tự động đồng bộ NGẦM mỗi khi chuyển giao diện (views)
  useEffect(() => {
    if (data.sheetLink) {
      refreshDataFromCloud(data.sheetLink, false);
    }
  }, [view]);  

  const renderContent = () => {
    switch (view) {
      case ViewMode.DASHBOARD:
        return <Dashboard 
                 data={data} 
                 onUpdate={handleUpdateData} 
                 onRefreshData={() => refreshDataFromCloud(data.sheetLink, false)}
                 />;
      case ViewMode.IMPORT:
        return (
          <ImportSection 
            data={data} 
            onUpdate={handleUpdateData}            
          />
        );
      case ViewMode.LIST:
        return (
          <ListSection 
            data={data} 
            onUpdate={handleUpdateData}
            onRefreshData={() => refreshDataFromCloud(data.sheetLink, false)}
          />
        );
      case ViewMode.ATTENDANCE:
        return (
          <AttendanceSection 
            data={data} 
            onUpdate={handleUpdateData}       
            onRefreshData={() => refreshDataFromCloud(data.sheetLink, false)}
          />
        );
      case ViewMode.SETTINGS:
        return <SettingsSection data={data} onUpdate={handleUpdateData} />;
      case ViewMode.PAYMENT_HISTORY:
        return (
          <PaymentHistorySection 
            data={data} 
            onUpdate={handleUpdateData} 
            onRefreshData={() => refreshDataFromCloud(data.sheetLink, false)}
          />
        );
      case ViewMode.QRCODE:
        return (
          <QRCalculator 
            data={data} 
            onUpdate={handleUpdateData} 
          />
        );
      case ViewMode.IMPORT_QR:
        return (
          <ImportQR 
            data={data} 
            onUpdate={handleUpdateData} 
          />
        );
      case ViewMode.GVCN:
        return (
          <GVCNSection 
            data={data} 
            onUpdate={handleUpdateData} 
            onRefreshData={() => refreshDataFromCloud(data.sheetLink, false)}
          />
        );
      case ViewMode.GEMINI_AI:
        return <GeminiSection data={data} />;
      default:
        return <Dashboard data={data} />;
    }
  };

  const handleStudentLookupIDGV = async () => {
    const savedIdgv = data.idgv || localStorage.getItem('saved_idgv') || "";
    const inputIdgv = prompt("TRA CỨU DỮ LIỆU LỚP HỌC THEO IDGV (Số điện thoại Thầy/Cô):\nNhập IDGV Giáo viên:", savedIdgv);
    if (!inputIdgv || !inputIdgv.trim()) return;

    try {
      const targetIdgv = inputIdgv.trim();
      const res = await lookupTeacherByIDGV(targetIdgv);
      if (res.success && res.linkScript) {
        const updatedData: AppData = {
          ...data,
          idgv: res.idgv || targetIdgv,
          fullname: res.fullname || data.fullname,
          mon: res.mon || data.mon,
          idmon: res.idmon || data.idmon,
          licenseStatus: res.licenseStatus || data.licenseStatus,
          linkScript: res.linkScript,
          sheetLink: res.linkScript
        };
        localStorage.setItem('saved_idgv', res.idgv || targetIdgv);
        handleUpdateData(updatedData);
        await refreshDataFromCloud(res.linkScript, false);
        alert(`Thành công! Đã kết nối dữ liệu Lớp học của Giáo viên: ${res.fullname || targetIdgv} (${res.mon || 'Môn học'})!`);
      } else {
        alert(res.message || `Không tìm thấy IDGV: ${targetIdgv}`);
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối khi tra cứu IDGV!");
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar currentView={view} setView={setView} hasSheetLink={hasSheetLink} />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">SmartEdu Pro</h1>
            <p className="font-bold text-blue-700">Tác giả: Nguyễn Văn Hà - THPT Yên Dũng số 2 - Bắc Ninh. Liên hệ: 0988.948.882</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
             {/* Nút Tra cứu IDGV dành cho Học sinh */}
             <button
               onClick={handleStudentLookupIDGV}
               className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 text-xs font-bold transition-all shadow-sm cursor-pointer"
               title="Nhập IDGV của Giáo viên để Học sinh/Phụ huynh xem dữ liệu lớp học tương ứng"
             >
               <Search size={14} className="text-emerald-600" />
               <span>Tra cứu IDGV HS/PH</span>
             </button>

             {/* NÚT REFRESH CHỦ ĐỘNG TRÊN HEADER */}
             {data.sheetLink && (
               <button
                 onClick={() => refreshDataFromCloud(data.sheetLink, true)}
                 disabled={isRefreshing}
                 className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                 title="Tải lại dữ liệu từ Google Sheets"
               >
                 <RefreshCw size={14} className={isRefreshing ? "animate-spin text-indigo-500" : ""} />
                 {isRefreshing ? "Đang đồng bộ..." : "Làm mới Cloud"}
               </button>
             )}

             <div className="hidden lg:block text-right border-l border-slate-200 pl-3">
                <p className="text-xs font-bold text-slate-700">
                  GV: <span className="text-indigo-600">{data.fullname || data.idgv || 'Admin'}</span>
                </p>
                <p className={`text-[11px] font-mono ${data.sheetLink ? 'text-emerald-600 font-bold' : 'text-amber-500'}`}>
                  {data.sheetLink ? `IDGV: ${data.idgv || 'OK'}` : 'Chưa có Link Script'}
                </p>
             </div>
             <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200 shrink-0">
                <Users size={18} />
             </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
