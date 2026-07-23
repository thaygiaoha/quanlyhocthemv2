import React, { useState, useEffect } from 'react';
import { ViewMode, AppData } from './types';
import { getAppData, saveAppData } from './services/storage';
import { Users, RefreshCw } from 'lucide-react';

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
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 1. Khởi tạo dữ liệu: Ưu tiên lấy từ LocalStorage
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('hocphi_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.sheetLink || parsed.sheetLink.includes('AKfycbxU1gFzMDIzYbWxAh70658gBw6czUAhyhud7VqbZWMD1OYlZfqDR5M7W7wfxz831e3gXA')) {
          parsed.sheetLink = 'https://script.google.com/macros/s/AKfycbwlglx696Wr0BCj8SMAvwh1hlfFg66uemInbxI2W0TdE96wY67eZx_AAxxD5RJnl04NXg/exec';
        }
        return parsed;
      } catch (e) {
        console.error("Lỗi dữ liệu LocalStorage:", e);
      }
    }
    return getAppData(); 
  });

  // 2307them2: Kiểm tra trạng thái đã kết nối Link Script
  const hasSheetLink = Boolean(data.sheetLink && data.sheetLink.trim() !== '');

  // 2307sua2: Giới hạn truy cập - Nếu chưa kết nối Link Script thì tự động đưa về Dashboard nếu đang truy cập chức năng khác
  useEffect(() => {
    if (!hasSheetLink && view !== ViewMode.DASHBOARD && view !== ViewMode.SETTINGS) {
      setView(ViewMode.DASHBOARD);
    }
  }, [view, hasSheetLink]);

  // 2. Hàm kéo dữ liệu từ tất cả các Sheet về App
  const refreshDataFromCloud = async (link: string, showAlert: boolean = false) => {
    if (!link) return;
    setIsRefreshing(true);
    try {
      const url = data.idgv ? `${link}${link.indexOf('?') === -1 ? '?' : '&'}idgv=${encodeURIComponent(data.idgv)}` : link;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const cloudData = await response.json();
      
      if (cloudData && cloudData.sheets) {
        const updatedData = { 
          ...data, 
          sheets: cloudData.sheets, 
          passwordC2: cloudData.password || data.passwordC2,
          licenseStatus: cloudData.licenseStatus !== undefined ? cloudData.licenseStatus : data.licenseStatus,
          fullname: cloudData.fullname !== undefined ? cloudData.fullname : data.fullname,
          mon: cloudData.mon !== undefined ? cloudData.mon : data.mon,
          idmon: cloudData.idmon !== undefined ? cloudData.idmon : data.idmon,
          linkScript: cloudData.linkScript !== undefined ? cloudData.linkScript : data.linkScript,
          sheetLink: link 
        };
        setData(updatedData);
        localStorage.setItem('hocphi_data', JSON.stringify(updatedData));
        
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
    if (newData.sheetLink && newData.sheetLink !== data.sheetLink) {
      setData(newData);
      localStorage.setItem('hocphi_data', JSON.stringify(newData));
      if (window.confirm("Phát hiện Link Script mới. Tải dữ liệu từ Google Sheets về máy này?")) {
        await refreshDataFromCloud(newData.sheetLink, true);
      }
    } else {
      setData(newData);
      localStorage.setItem('hocphi_data', JSON.stringify(newData));
    }
  };

  // 4. Tự động lưu dữ liệu mỗi khi state data thay đổi
  useEffect(() => {
    saveAppData(data);
  }, [data]);

  // 5. Tự động đồng bộ NGẦM khi vừa mở App
  useEffect(() => {
    if (data.sheetLink) {
      refreshDataFromCloud(data.sheetLink, false);
    }
  }, []);  

  const renderContent = () => {
    switch (view) {
      case ViewMode.DASHBOARD:
        return <Dashboard 
                 data={data} 
                 onUpdate={handleUpdateData} 
                 onRefreshData={() => refreshDataFromCloud(data.sheetLink, true)}
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
            onRefreshData={() => refreshDataFromCloud(data.sheetLink, true)}
          />
        );
      case ViewMode.SETTINGS:
        return <SettingsSection data={data} onUpdate={handleUpdateData} />;
      case ViewMode.PAYMENT_HISTORY:
        return (
          <PaymentHistorySection 
            data={data} 
            onUpdate={handleUpdateData} 
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
            onRefreshData={() => refreshDataFromCloud(data.sheetLink, true)}
          />
        );
      case ViewMode.GEMINI_AI:
        return <GeminiSection data={data} />;
      default:
        return <Dashboard data={data} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar currentView={view} setView={setView} hasSheetLink={hasSheetLink} />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">SmartEdu Pro</h1>
            <p className="font-bold text-blue-700">Tác giả: Nguyễn Văn Hà - THPT Yên Dũng số 2 - Bắc Ninh. Liên hệ: 0988.948.882</p>
          </div>
          <div className="flex items-center gap-3">
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

             <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-slate-700">Trạng thái Google</p>
                <p className={`text-xs font-mono ${data.sheetLink ? 'text-green-500' : 'text-amber-500'}`}>
                  {data.sheetLink ? 'Đã kết nối Cloud' : 'Chưa có Link Script'}
                </p>
             </div>
             <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200">
                <Users size={20} />
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
