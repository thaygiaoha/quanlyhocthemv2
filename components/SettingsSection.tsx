// 2107them / 2107sua: SettingsSection quản lý bản quyền học tập
import React, { useState, useEffect } from 'react';
import { Save, Key, Database, DollarSign, RefreshCw, Loader2, Lock, ShieldCheck, ToggleLeft, ToggleRight, Phone, EyeOff, Eye, User } from 'lucide-react';
import { AppData } from '../types';
import { fetchFromSheet, syncSettingsToSheet } from '../services/storage';
import { verifyBanquyen, updateLinkScriptOnSheet, verifyAdminPassword, URL_ADMIN } from './verifyadmin';

interface SettingsSectionProps {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ data, onUpdate }) => {
  const [idgv, setIdgv] = useState(data.idgv || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [config, setConfig] = useState(data);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setConfig(data);
    if (data.idgv) {
      setIdgv(data.idgv);
    }
  }, [data]);

  const handleAuth = async () => {
    if (!idgv.trim()) {
      alert('Vui lòng nhập số điện thoại IDGV!');
      return;
    }
    if (!password.trim()) {
      alert('Vui lòng nhập mật khẩu bản quyền!');
      return;
    }
    setIsChecking(true);
    try {
      if (data.sheetLink) {
        // 2107sua: Xác thực qua API banquyen trên Google Sheets
        const result = await verifyBanquyen(data.sheetLink, idgv, password);
        
        if (result.success) {
          setIsAuthorized(true);
          const updatedConfig = {
            ...config,
            idgv: result.idgv || idgv,
            fullname: result.fullname || '',
            mon: result.mon || '',
            idmon: result.idmon || '',
            licenseStatus: result.licenseStatus || '',
            linkScript: result.linkScript || config.linkScript || ''
          };
          setConfig(updatedConfig);
          onUpdate(updatedConfig);
          alert(`Xác thực thành công!\nChào mừng Giáo viên: ${result.fullname || idgv}`);
        } else {
          alert(result.message || 'Xác thực thất bại! Sai IDGV hoặc mật khẩu.');
        }
      } else {
        alert("Không tìm thấy liên kết Google Sheets!");
      }
    } catch (err) {
      console.error(err);
      alert("Có lỗi xảy ra trong quá trình xác thực.");
    } finally {
      setIsChecking(false); 
    }
  };

  const handleSaveAll = async () => {
    onUpdate(config);
    
    if (config.sheetLink && window.confirm("Xác nhận cập nhật cấu hình và đồng bộ lên Google Sheets?")) {
        setSyncing(true);
        try {
            // 1. Đồng bộ cấu hình học phí & mật khẩu C2 lên Google Sheets
            await syncSettingsToSheet(config.sheetLink, config.passwordC2, config.fees);
            
            // 2207sua3: Ghi Link Script (cột G) của Giáo viên vào sheet banquyen khi GV đồng bộ
            const linkToSave = (config.linkScript && config.linkScript.trim()) ? config.linkScript.trim() : config.sheetLink;
            if (linkToSave) {
              await updateLinkScriptOnSheet(config.sheetLink, idgv, password, linkToSave);
            }
            
            alert('Đồng bộ thành công cấu hình hệ thống & Link Script lên Google Sheets!');
        } catch (err) {
            console.error(err);
            alert('Đồng bộ thất bại! Bạn hãy kiểm tra lại kết nối mạng nhé.');
        } finally {
            setSyncing(false);
        }
    } else {
        alert('Đã lưu cấu hình cục bộ thành công!');
    }
  };

  const handleTestConnection = async () => {
    if (!config.sheetLink) {
        alert("Vui lòng nhập link Web App!");
        return;
    }
    setTesting(true);
    try {
      const result = await fetchFromSheet(config.sheetLink);
      if (result) {
        const newConfig = { ...config };
        if (result.password) newConfig.passwordC2 = String(result.password);
        if (result.sheets) newConfig.sheets = result.sheets;
        if (result.licenseStatus) newConfig.licenseStatus = String(result.licenseStatus);
        if (result.fullname) newConfig.fullname = String(result.fullname);
        setConfig(newConfig);
        onUpdate(newConfig);
        alert("Kết nối và nạp dữ liệu từ Cloud thành công!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối! Kiểm tra link hoặc quyền truy cập của Web App.");
    } finally {
      setTesting(false);
    }
  };

  // 2207them3: Hàm bảo mật kiểm tra Mật khẩu Quản trị C2 của URL_ADMIN khi thay đổi Bật/Tắt bản quyền
  const handleToggleCopyright = async () => {
    const pwd = prompt("Yêu cầu nhập Mật khẩu Quản trị Hệ thống (C2 Admin) để Bật/Tắt bản quyền:");
    if (!pwd || !pwd.trim()) return;

    const targetAdminUrl = URL_ADMIN || config.sheetLink;
    if (!targetAdminUrl) {
      alert("Chưa cấu hình URL_ADMIN hoặc Google Sheets Link để xác minh mật khẩu Admin!");
      return;
    }

    try {
      const res = await verifyAdminPassword(targetAdminUrl, pwd.trim());
      if (res.success) {
        const nextState = config.enableCopyrightCheck === false ? true : false;
        const updated = { ...config, enableCopyrightCheck: nextState };
        setConfig(updated);
        onUpdate(updated);
        alert(`Đã xác thực Mật khẩu Quản trị Admin thành công!\nTrạng thái bản quyền hiện tại: ${nextState ? 'ĐÃ BẬT (Bắt buộc VIP)' : 'ĐÃ TẮT (Dùng thử miễn phí)'}`);
      } else {
        alert("Mật khẩu Quản trị Admin (C2 System) không chính xác! Chỉ Admin hệ thống mới có quyền Bật/Tắt kiểm tra bản quyền.");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối khi xác thực mật khẩu Quản trị Admin!");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md mx-auto border border-slate-100 flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4 border border-amber-100">
          <Lock size={32} />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800 mb-2">Quyền truy cập cấu hình</h2>
        <p className="text-xs text-slate-400 font-medium text-center mb-6">
          Nhập tài khoản Giáo viên (SĐT đăng ký) và mật khẩu để xác minh bản quyền và thay đổi thiết lập hệ thống.
        </p>
        
        <div className="w-full space-y-4 mb-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">SĐT Giáo viên (IDGV)</label>
            <div className="relative">
              <Phone className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input 
                type="text" 
                value={idgv}
                onChange={(e) => setIdgv(e.target.value)}
                placeholder="09xx.xxx.xxx"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 placeholder-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Mật khẩu bản quyền</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 placeholder-slate-300"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={handleAuth} 
          disabled={isChecking}
          className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isChecking ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Đang xác minh...
            </>
          ) : 'Xác nhận Đăng nhập'}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      <div className="space-y-6">
        
        {/* Khối Thông tin giáo viên & Bản quyền (2107them) */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" /> Thông tin Bản quyền Giáo viên
          </h3>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 mb-5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-400">Giáo viên:</span>
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <User size={14} className="text-indigo-500" /> {config.fullname || "Chưa cập nhật"}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-400">Số điện thoại IDGV:</span>
              <span className="font-mono font-bold text-slate-700">{config.idgv}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-400">Chuyên môn:</span>
              <span className="font-bold text-slate-700">
                {config.mon ? `${config.mon} (${config.idmon || ''})` : "Chưa cập nhật"}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-400">Trạng thái bản quyền:</span>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${config.licenseStatus === 'vip' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white animate-pulse'}`}>
                {config.licenseStatus === 'vip' ? 'VIP - ĐÃ KÍCH HOẠT' : 'CHƯA ĐĂNG KÝ (BẢN FREE)'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Link Script của bạn (Cột G)</label>
              <input 
                type="text" 
                value={config.linkScript || ''}
                onChange={(e) => setConfig({ ...config, linkScript: e.target.value })}
                placeholder="Nhập liên kết Google Apps Script cá nhân..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600 text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
              <div>
                <h4 className="text-xs font-extrabold text-indigo-900">Bắt buộc kiểm tra Bản quyền</h4>
                <p className="text-[10px] text-indigo-500 font-medium">
                  {config.enableCopyrightCheck !== false 
                    ? 'Đang BẬT: Cần trạng thái VIP để dùng trọn vẹn tính năng. (Bấm nút để Tắt - Yêu cầu Mật khẩu C2)' 
                    : 'Đang TẮT: Dùng thử miễn phí cho tất cả Giáo viên. (Bấm nút để Bật - Yêu cầu Mật khẩu C2)'}
                </p>
              </div>
              <button 
                onClick={handleToggleCopyright}
                className="text-indigo-600 hover:text-indigo-800 transition-colors"
                title="Yêu cầu Mật khẩu Quản trị C2 để Bật/Tắt"
              >
                {config.enableCopyrightCheck !== false ? (
                  <ToggleRight size={40} className="text-indigo-600" />
                ) : (
                  <ToggleLeft size={40} className="text-slate-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Khối liên kết Google Sheet */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Key className="text-amber-500" /> Cấu hình Kết nối Google Sheet
          </h3>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Mật khẩu quản lý lớp học (C2)</label>
              <input 
                  type="text" 
                  value={config.passwordC2}
                  onChange={(e) => setConfig({ ...config, passwordC2: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleTestConnection()}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Google Apps Script Web App URL</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={config.sheetLink}
                  onChange={(e) => setConfig({ ...config, sheetLink: e.target.value })}
                  placeholder="https://script.google.com/..."
                  onKeyDown={(e) => e.key === 'Enter' && handleTestConnection()}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 text-xs font-mono text-slate-600"
                />
                <button 
                  onClick={handleTestConnection}
                  disabled={testing}
                  title="Kiểm tra kết nối và nạp dữ liệu"
                  className="px-4 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors"
                >
                  {testing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="space-y-6">
        
        {/* Khối Biểu phí */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <DollarSign className="text-emerald-500" /> Biểu phí học tập theo Lớp
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {["Lop9", "Lop10", "Lop11", "Lop12"].map((name) => {
              const feeObj = config.fees.find(f => f.className === name) || { className: name, fee: 0 };
              return (
                <div key={name} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-extrabold text-slate-700 text-sm mb-2">{name}</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={feeObj.fee}
                      onChange={(e) => updateFee(name, Number(e.target.value))}
                      className="w-full px-3 py-2 text-right rounded-xl border border-slate-200 font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                    />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">đ/b</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Khối lưu & đồng bộ */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-5 border border-indigo-100">
            <Database size={32} />
          </div>
          <h3 className="text-lg font-extrabold text-slate-800 mb-2">Lưu cấu hình & Đồng bộ Cloud</h3>
          <p className="text-slate-500 mb-6 max-w-xs text-xs leading-relaxed">
            Xác nhận sẽ lưu cấu hình cục bộ và gửi thông tin đồng bộ (Học phí, Link Script cá nhân) lên Google Sheets.
          </p>
          <button 
            onClick={handleSaveAll}
            disabled={syncing}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {syncing ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} 
            Cập nhật toàn hệ thống
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsSection;
