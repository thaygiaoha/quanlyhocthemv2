import React, { useState, useEffect } from 'react';
import { ViewMode, AppData } from './types';
import { getAppData, saveAppData } from './services/storage';
import { Users, RefreshCw } from 'lucide-react'; // Thêm icon làm mới

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
  const [isRefreshing, setIsRefreshing] = useState(false); // Trạng thái xoay icon loading
  
  // 1. Khởi tạo dữ liệu: Ưu tiên lấy từ LocalStorage
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('hocphi_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Lỗi dữ liệu LocalStorage:", e);
      }
    }
    return getAppData(); 
  });

  // 2. Hàm kéo dữ liệu từ tất cả các Sheet về App (Cải tiến: showAlert)
  const refreshDataFromCloud = async (link: string, showAlert: boolean = false) => {
    if (!link) return;
    setIsRefreshing(true);
    try {
      // 2107sua: Đính kèm IDGV của Giáo viên để lấy trạng thái bản quyền mới nhất
      const url = data.idgv ? `${link}${link.indexOf('?') === -1 ? '?' : '&'}idgv=${encodeURIComponent(data.idgv)}` : link;
      const response = await fetch(url);
      const cloudData = await response.json();
      
      if (cloudData && cloudData.sheets) {
        const updatedData = { 
          ...data, 
          sheets: cloudData.sheets, 
          passwordC2: cloudData.password || data.passwordC2,
          // 2107them: Tự động cập nhật thông tin bản quyền và giáo viên từ Cloud
          licenseStatus: cloudData.licenseStatus !== undefined ? cloudData.licenseStatus : data.licenseStatus,
          fullname: cloudData.fullname !== undefined ? cloudData.fullname : data.fullname,
          mon: cloudData.mon !== undefined ? cloudData.mon : data.mon,
          idmon: cloudData.idmon !== undefined ? cloudData.idmon : data.idmon,
          linkScript: cloudData.linkScript !== undefined ? cloudData.linkScript : data.linkScript,
          sheetLink: link 
        };
        setData(updatedData);
        localStorage.setItem('hocphi_data', JSON.stringify(updatedData));
        
        // Chỉ hiện thông báo khi thầy chủ động bấm nút
        if (showAlert) {
          alert("Đồng bộ thành công! Đã tải dữ liệu & kiểm tra bản quyền mới nhất từ Google Sheets.");
        }
      }
    } catch (err) {
      console.error("Lỗi đồng bộ:", err);
      if (showAlert) {
        alert("Không thể tải dữ liệu. Thầy kiểm tra lại Link Script đã Deploy đúng chưa nhé.");
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

  // 5. Tự động đồng bộ NGẦM khi vừa mở App (Không hiện alert gây phiền)
  useEffect(() => {
    if (data.sheetLink) {
      refreshDataFromCloud(data.sheetLink, false); // false để chạy ngầm im lặng
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
            //onRefreshData={() => refreshDataFromCloud(data.sheetLink, true)} // <-- TRUYỀN XUỐNG ĐÂY
          />
        );
      case ViewMode.LIST:
        return <ListSection 
                 data={data}                  
                 onUpdate={handleUpdateData}
                 onRefreshData={() => refreshDataFromCloud(data.sheetLink, false)} // 2207themdelete
                 />;
      case ViewMode.ATTENDANCE:
  return (
    <AttendanceSection 
      data={data} 
      onUpdate={handleUpdateData}       
       onRefreshData={() => refreshDataFromCloud(data.sheetLink, true)} // 1807Sua
    />
  );
      case ViewMode.SETTINGS:
        return <SettingsSection data={data} onUpdate={handleUpdateData} />;
      case ViewMode.PAYMENT_HISTORY:
  return (
    <PaymentHistorySection 
      data={data} 
      onUpdate={handleUpdateData} 
      //onRefreshData={() => refreshDataFromCloud(data.sheetLink, true)} // <-- TRUYỀN THÊM DÒNG NÀY VÀO THẦY NHÉ
    />
  );
    case ViewMode.QRCODE:
        return (
          <QRCalculator 
            data={data} 
            onUpdate={handleUpdateData} 
          />
        );
      case ViewMode.IMPORT_QR: // Sửa lần 2: Thêm đường dẫn hiển thị Tạo QR từ Excel
        return (
          <ImportQR 
            data={data} 
            onUpdate={handleUpdateData} 
          />
        );
         case ViewMode.GVCN: // 1807Them2: Render GVCN section
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
      <Sidebar currentView={view} setView={setView} />
      
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
                  {data.sheetLink ? 'Đã kết nối Cloud' : 'Chế độ Local'}
                </p>
             </div>
             <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200">
                <Users size={20} />
             </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {/* 2107them: Thanh thông báo trạng thái bản quyền nếu là View-Only (Thường) */}
          {data.enableCopyrightCheck !== false && data.licenseStatus !== 'vip' && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-200">
                  <RefreshCw size={20} className="animate-spin duration-3000" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">Chế độ xem thử (Bản FREE - Chưa kích hoạt VIP)</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Hệ thống đang chạy chế độ view-only. Thầy/Cô vui lòng đăng ký VIP hoặc liên kết tài khoản để sử dụng đầy đủ các tính năng nạp/lưu dữ liệu.</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <a 
                  href="https://smarteduv2.vercel.app?mode=register" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-amber-200 flex items-center gap-1"
                >
                  Đăng ký bản quyền
                </a>
                <button 
                  onClick={() => setView(ViewMode.SETTINGS)}
                  className="px-3.5 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold transition-all"
                >
                  Kích hoạt VIP
                </button>
              </div>
            </div>
          )}

          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
