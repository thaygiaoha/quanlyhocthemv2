
import React, { useState } from 'react';
import { ViewMode } from '../types';
import { 
  LayoutDashboard, 
  UserPlus, 
  CheckSquare, 
  Settings, 
  Sparkles,
  GraduationCap,
  ListOrdered,
  History,
  QrCode,
  FileSpreadsheet,
  Gift,
  X,
  Heart,
  Coffee,
  Copy,
  Check,
  Download,
  Flame,
  ClipboardList
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewMode;
  setView: (view: ViewMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const showGiftButton = false;
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [giftTab, setGiftTab] = useState<'coffee' | 'milktea' | 'custom'>('coffee');
  const [customGiftAmount, setCustomGiftAmount] = useState<number>(100000);
  const [copiedText, setCopiedText] = useState<'stk' | 'nd' | null>(null);

  const menuItems = [
    { id: ViewMode.DASHBOARD, label: 'Tổng quan', icon: LayoutDashboard },
    { id: ViewMode.IMPORT, label: 'Nhập danh sách HT', icon: UserPlus },
    { id: ViewMode.GVCN, label: 'Danh sách lớp GVCN', icon: ClipboardList }, // 1807Them2
    { id: ViewMode.LIST, label: 'Xem danh sách HT', icon: ListOrdered },    
    { id: ViewMode.ATTENDANCE, label: 'Điểm danh', icon: CheckSquare },
    { id: ViewMode.QRCODE, label: 'QR nộp tiền HT', icon: QrCode },
    { id: ViewMode.IMPORT_QR, label: 'Tạo QR từ Excel', icon: FileSpreadsheet },
    { id: ViewMode.PAYMENT_HISTORY, label: 'Nhật ký nộp tiền', icon: History },
    { id: ViewMode.GEMINI_AI, label: 'Trợ lý Gemini', icon: Sparkles },
    { id: ViewMode.SETTINGS, label: 'Settings', icon: Settings },    
  ];

  // Hàm sao chép nhanh
  const handleCopy = (text: string, type: 'stk' | 'nd') => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Tạo URL ảnh QR
  const getGiftQrUrl = (amount: number) => {
    return `https://img.vietqr.io/image/MB-0240198389999-compact2.png?amount=${amount}&addInfo=${encodeURIComponent('Tang qua tac gia')}&accountName=${encodeURIComponent('NGUYEN VAN HA')}`;
  };

  // Tải ảnh QR về máy
  const downloadGiftQR = async (amount: number, label: string) => {
    try {
      const url = getGiftQrUrl(amount);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch error");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Tri_An_Thay_Ha_${label}_${amount}đ.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert("Không thể tải xuống trực tiếp. Thầy cô vui lòng nhấn giữ hình ảnh hoặc chuột phải để lưu thủ công nhé!");
    }
  };

  return (
    <aside className="w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col transition-all duration-300">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <GraduationCap size={24} />
        </div>
        <span className="hidden md:block font-bold text-slate-800 text-lg">SmartEdu</span>
      </div>

      <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-600 font-medium shadow-sm border border-indigo-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Icon size={22} />
              <span className="hidden md:block text-sm">{item.label}</span>
            </button>
          );
        })}

        {/* NÚT BỔ SUNG: TẶNG QUÀ LẤP LÁNH NỔI BẬT */}
          {showGiftButton && (
            <button
          onClick={() => setIsGiftModalOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white font-extrabold shadow-md hover:brightness-110 transition-all duration-200 animate-pulse active:scale-95 border border-pink-400/40 relative overflow-hidden"
          title="Tặng quà tri ân tác giả Nguyễn Văn Hà"
        >
          <Gift size={22} className="text-white animate-bounce" />
          <span className="hidden md:block text-sm font-black tracking-wide">TẶNG QUÀ TÁC GIẢ 💖</span>
          <span className="absolute top-0 right-0 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></span>
        </button>
         )}
      </nav>

      {/* MODAL TẶNG QUÀ TÁC GIẢ LẤP LÁNH */}
      {showGiftButton && isGiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] md:max-h-none">
            
            {/* Thanh màu gradient phía trên cùng */}
            <div className="h-2 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500"></div>

            {/* Nút đóng modal */}
            <button 
              onClick={() => setIsGiftModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all"
            >
              <X size={18} />
            </button>

            {/* Content của Modal */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
              {/* Header Modal */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-pink-50 text-pink-500 rounded-full animate-bounce">
                  <Heart size={30} className="fill-current" />
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                  ỦNG HỘ TÁC GIẢ NGUYỄN VĂN HÀ
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  THPT Yên Dũng Số 2 - Bắc Ninh
                </p>
              </div>

              {/* Lời nhắn cảm ơn */}
              <div className="bg-gradient-to-r from-pink-50/50 via-rose-50/30 to-amber-50/40 p-4 rounded-2xl border border-pink-100/50 text-center space-y-2">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  "Kính chào quý Thầy Cô! Ứng dụng này được xây dựng độc lập bởi Thầy Hà nhằm hỗ trợ Thầy Cô quản lý học sinh và tạo mã QR học phí nhanh chóng nhất. Nếu ứng dụng mang lại giá trị thiết thực, kính mong Thầy Cô gửi tặng tác giả ly Cafe ấm áp làm động lực tiếp tục nâng cấp hệ thống nhé!"
                </p>
              </div>

              {/* Thông tin chuyển khoản sao chép nhanh */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Ngân hàng</span>
                  <span className="font-extrabold text-slate-700">MB Bank (Quân Đội)</span>
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Chủ tài khoản</span>
                  <span className="font-extrabold text-slate-700 uppercase">NGUYEN VAN HA</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Số tài khoản</span>
                    <span className="font-extrabold text-slate-800 text-sm font-mono">0240198389999</span>
                  </div>
                  <button 
                    onClick={() => handleCopy('0240198389999', 'stk')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                  >
                    {copiedText === 'stk' ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                    {copiedText === 'stk' ? 'Đã chép' : 'Sao chép STK'}
                  </button>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Nội dung chuyển khoản</span>
                    <span className="font-extrabold text-slate-800 text-xs font-mono">Tang qua tac gia</span>
                  </div>
                  <button 
                    onClick={() => handleCopy('Tang qua tac gia', 'nd')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                  >
                    {copiedText === 'nd' ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                    {copiedText === 'nd' ? 'Đã chép' : 'Sao chép nội dung'}
                  </button>
                </div>
              </div>

              {/* Phần chọn 3 gói QR nạp tiền */}
              <div className="space-y-4">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2">
                  <button
                    onClick={() => setGiftTab('coffee')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                      giftTab === 'coffee' 
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md' 
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    <Coffee size={14} />
                    Ly Cafe (20K)
                  </button>
                  <button
                    onClick={() => setGiftTab('milktea')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                      giftTab === 'milktea' 
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md' 
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    <Heart size={14} />
                    Trà Sữa (50K)
                  </button>
                  <button
                    onClick={() => setGiftTab('custom')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                      giftTab === 'custom' 
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md' 
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    <Flame size={14} />
                    Ủng Hộ Tự Do
                  </button>
                </div>

                {/* Giao diện hiển thị QR Code dựa vào Tab */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                  {giftTab === 'custom' && (
                    <div className="w-full max-w-xs space-y-1.5 text-center">
                      <label className="block text-[10px] text-slate-400 font-bold uppercase">Nhập số tiền ủng hộ (VNĐ)</label>
                      <input
                        type="number"
                        value={customGiftAmount}
                        onChange={(e) => setCustomGiftAmount(Math.max(0, Number(e.target.value)))}
                        placeholder="Nhập số tiền..."
                        className="w-full p-2 text-center bg-white rounded-xl border border-slate-200 text-sm font-extrabold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {/* Ảnh QR tương ứng */}
                  {((giftTab === 'coffee') || (giftTab === 'milktea') || (giftTab === 'custom' && customGiftAmount > 0)) ? (
                    <div className="relative p-2 bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden flex items-center justify-center">
                      <img
                        src={getGiftQrUrl(giftTab === 'coffee' ? 20000 : giftTab === 'milktea' ? 50000 : customGiftAmount)}
                        alt="Ủng hộ tác giả SmartEdu"
                        className="w-48 h-48 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 border-2 border-pink-50/20 rounded-2xl pointer-events-none"></div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl border border-amber-100">
                      Vui lòng nhập số tiền ủng hộ lớn hơn 0đ để tạo mã QR!
                    </div>
                  )}

                  {/* Thông tin số tiền cụ thể đang quét */}
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Mệnh giá quét</p>
                    <p className="text-base font-black text-slate-800">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                        giftTab === 'coffee' ? 20000 : giftTab === 'milktea' ? 50000 : customGiftAmount
                      )}
                    </p>
                  </div>

                  {/* Nút tải ảnh QR */}
                  {((giftTab === 'coffee') || (giftTab === 'milktea') || (giftTab === 'custom' && customGiftAmount > 0)) && (
                    <button
                      onClick={() => downloadGiftQR(
                        giftTab === 'coffee' ? 20000 : giftTab === 'milktea' ? 50000 : customGiftAmount,
                        giftTab === 'coffee' ? 'Cafe_20K' : giftTab === 'milktea' ? 'Tra_Sua_50K' : 'Tuy_Tam'
                      )}
                      className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Download size={13} />
                      Tải ảnh QR về máy
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              <span>SmartEdu cảm ơn tấm lòng hảo tâm của quý Thầy Cô!</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
