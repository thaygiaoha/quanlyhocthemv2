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
  const [savedAuthPassword, setSavedAuthPassword] = useState('');
  const [config, setConfig] = useState(data);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setConfig(data);
    if (data.idgv) {
      setIdgv(data.idgv);
    }
  }, [data]);

  const updateFee = (className: string, fee: number) => {
    const updatedFees = config.fees.map(f => 
      f.className === className ? { ...f, fee } : f
    );
    if (!updatedFees.some(f => f.className === className)) {
      updatedFees.push({ className, fee });
    }
    setConfig({ ...config, fees: updatedFees });
  };

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
      // Xác thực tài khoản giáo viên qua Google Sheet của Admin (URL_ADMIN)
      const result = await verifyBanquyen(idgv, password);
      
      if (result.success) {
        setIsAuthorized(true);
        setSavedAuthPassword(password.trim());

        // Tự động dùng Link Script trả về từ Google Sheet Admin (cột G) nếu có, hoặc dùng sheetLink hiện tại
        const scriptFromAdmin = result.linkScript ? result.linkScript.trim() : '';
        const currentSheetLink = config.sheetLink ? config.sheetLink.trim() : '';
        const effectiveLink = scriptFromAdmin || currentSheetLink;

        const updatedConfig = {
          ...config,
          idgv: result.idgv || idgv,
          fullname: result.fullname || '',
          mon: result.mon || '',
          idmon: result.idmon || '',
          licenseStatus: result.licenseStatus || '',
          linkScript: effectiveLink,
          sheetLink: effectiveLink
        };
        setConfig(updatedConfig);
        onUpdate(updatedConfig);

        // Tự động ghi nhận link cá nhân lên URL_ADMIN nếu có
        if (effectiveLink && (result.idgv || idgv)) {
          updateLinkScriptOnSheet(result.idgv || idgv, password.trim(), effectiveLink).then(res => {
            if (res && res.success) {
              console.log("Đã tự động cập nhật Link Web App cá nhân lên Admin Sheet (URL_ADMIN)");
            }
          });
        }

        alert(`Xác thực thành công!\nChào mừng Giáo viên: ${result.fullname || idgv}`);
      } else {
        alert(result.message || 'Xác thực thất bại! Sai IDGV hoặc mật khẩu.');
      }
    } catch (err) {
      console.error(err);
      alert("Có lỗi xảy ra trong quá trình xác thực.");
    } finally {
      setIsChecking(false); 
    }
  };

  // Cập nhật toàn hệ thống: Ghi Mật khẩu Admin Ô C2 & Mức học phí lên Google Sheet cá nhân, đồng thời ghi nhận Link Web App lên Admin Sheet
  const handleSaveAll = async () => {
    const targetIdgv = idgv || config.idgv || '';
    const activePass = password.trim() || savedAuthPassword || config.passwordC2 || '';
    const linkToSave = (config.sheetLink && config.sheetLink.trim()) ? config.sheetLink.trim() : (config.linkScript || '');

    const updatedConfig = {
      ...config,
      idgv: targetIdgv,
      sheetLink: linkToSave,
      linkScript: linkToSave
    };
    setConfig(updatedConfig);
    onUpdate(updatedConfig);
    
    // Tự động gửi Link Script cá nhân của GV lên Google Sheet Admin (URL_ADMIN) để admin quản lý tập trung
    let scriptNote = '';
    if (linkToSave && targetIdgv) {
      const resScript = await updateLinkScriptOnSheet(targetIdgv, activePass, linkToSave);
      if (resScript && resScript.success) {
        scriptNote = '\n✓ Đã ghi nhận Link Web App cá nhân vào Google Sheet Admin thành công!';
      } else if (resScript && resScript.message) {
        scriptNote = `\nLưu ý Admin Sheet: ${resScript.message}`;
      }
    }

    // Ghi Mật khẩu Ô C2 và thông số Mức học phí lên Google Sheet cá nhân (data.sheetLink)
    if (updatedConfig.sheetLink && window.confirm("Xác nhận cập nhật Mật khẩu Ô C2 & Mức học phí lên Google Sheets cá nhân?")) {
        setSyncing(true);
        try {
            await syncSettingsToSheet(updatedConfig.sheetLink, updatedConfig.passwordC2, updatedConfig.fees);
            alert(`Đồng bộ thành công Mật khẩu Ô C2 & Mức học phí lên Google Sheets cá nhân!${scriptNote}`);
        } catch (err) {
            console.error("Lỗi khi lưu cấu hình:", err);
            alert(`Đã lưu cấu hình cục bộ! ${scriptNote}`);
        } finally {
            setSyncing(false);
        }
    } else {
        alert(`Đã lưu cấu hình cục bộ thành công!${scriptNote}`);
    }
  };

  // Nút gửi trực tiếp Link Script cá nhân lên Google Sheet Admin (URL_ADMIN) và cập nhật ngaydata.sheetLink
  const handleSyncLinkToAdmin = async () => {
    const targetIdgv = idgv || config.idgv || '';
    const activePass = password.trim() || savedAuthPassword || config.passwordC2 || '';
    const linkToSave = (config.sheetLink && config.sheetLink.trim()) ? config.sheetLink.trim() : (config.linkScript || '');

    if (!targetIdgv) {
      alert("Thiếu số điện thoại IDGV!");
      return;
    }
    if (!linkToSave) {
      alert("Vui lòng nhập Link Web App cá nhân của Giáo viên trước!");
      return;
    }

    setTesting(true);
    try {
      const res = await updateLinkScriptOnSheet(targetIdgv, activePass, linkToSave);
      if (res && res.success) {
        // Ngay lập tức cập nhật data.sheetLink là link đó!
        const updatedConfig = {
          ...config,
          idgv: targetIdgv,
          sheetLink: linkToSave,
          linkScript: linkToSave
        };
        setConfig(updatedConfig);
        onUpdate(updatedConfig);

        alert(`✓ Đã ghi nhận Link Web App cá nhân (${linkToSave}) vào cột G sheet banquyen trên Google Sheet Admin và ngay lập tức cập nhật vào data.sheetLink thành công!`);
      } else {
        alert(`Không thể ghi vào Sheet Admin: ${res?.message || 'Lỗi không xác định'}`);
      }
    } catch (err) {
      console.error("Lỗi khi ghi lên URL_ADMIN:", err);
      alert("Lỗi kết nối tới máy chủ Google Sheet Admin!");
    } finally {
      setTesting(false);
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

  // Kiểm tra Mật khẩu Quản trị C2 của URL_ADMIN khi thay đổi Bật/Tắt bản quyền
  const handleToggleCopyright = async () => {
    const pwd = prompt("Yêu cầu nhập Mật khẩu Quản trị Hệ thống (C2 Admin) để Bật/Tắt bản quyền:");
    if (!pwd || !pwd.trim()) return;

    try {
      const res = await verifyAdminPassword(URL_ADMIN, pwd.trim());
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
        
        {/* Khối Thông tin giáo viên & Bản quyền */}
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

        {/* Khối liên kết Google Sheet cá nhân của Giáo viên */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Key className="text-amber-500" /> Link Google Apps Script cá nhân Giáo viên
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
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                Link Web App cá nhân (data.sheetLink)
              </label>
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                Nơi lưu/đọc danh sách học sinh, điểm danh, xóa/thêm học sinh, tính học phí và tạo mã QR. Link này sẽ tự động ghi nhận vào cột G của Google Sheet Admin.
              </p>
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <input 
                  type="text" 
                  value={config.sheetLink || ''}
                  onChange={(e) => setConfig({ ...config, sheetLink: e.target.value, linkScript: e.target.value })}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  onKeyDown={(e) => e.key === 'Enter' && handleTestConnection()}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50 text-xs font-mono font-bold text-indigo-600 min-w-[200px]"
                />
                <button 
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  title="Kiểm tra kết nối và nạp dữ liệu từ Google Sheet cá nhân"
                  className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  {testing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  <span>Kiểm tra</span>
                </button>
                <button 
                  type="button"
                  onClick={handleSyncLinkToAdmin}
                  disabled={testing}
                  title="Ghi nhận Link Web App cá nhân vào Cột G Sheet Admin (URL_ADMIN)"
                  className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  <Save size={16} />
                  <span>Ghi lên Admin</span>
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
