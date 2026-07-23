import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppData } from '../types';
import { verifyBanquyen } from './verifyadmin';
import { allcheck } from '../src/utils';
import { 
  GraduationCap, 
  QrCode, 
  CheckSquare, 
  FileWord, 
  FileText, 
  GitBranch, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Zap,
  X,
  Gamepad2, 
  RefreshCw,
  ExternalLink,
  Facebook, Youtube, Twitter, Send, UserPlus
} from 'lucide-react';

interface DashboardProps {
  data: AppData;  
  onUpdate: (data: AppData) => void;
  onRefreshData?: () => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onUpdate, onRefreshData }) => {
  const [showQrModal, setShowQrModal] = useState(false);
  
  const handleVerifyLicense = async () => {
    if (data.enableCopyrightCheck === false) {
      alert("Hệ thống đang tắt kiểm tra bản quyền (Chế độ Dùng thử miễn phí). Tất cả tính năng đều được sử dụng bình thường!");
      return;
    }

    const inputIdgv = prompt("Nhập Số điện thoại IDGV đã đăng ký:", data.idgv || "") || "";
    if (!inputIdgv.trim()) return;

    const inputPass = prompt("Nhập Mật khẩu tài khoản Giáo viên:") || "";
    if (!inputPass.trim()) return;

    try {
      const res = await verifyBanquyen(inputIdgv, inputPass);
      if (res.success && res.licenseStatus === 'vip') {
        const effectiveLink = res.linkScript || data.linkScript || data.sheetLink || "";
        const updatedData: AppData = {
          ...data,
          idgv: res.idgv || inputIdgv,
          fullname: res.fullname || data.fullname,
          mon: res.mon || data.mon,
          idmon: res.idmon || data.idmon,
          licenseStatus: 'vip',
          level: res.level || 'Vip',
          hetHan: res.hetHan || data.hetHan,
          checkBanquyen: res.checkBanquyen || 'vip',
          linkScript: effectiveLink,
          sheetLink: effectiveLink || data.sheetLink
        };
        onUpdate(updatedData);
        alert(`Xác thực bản quyền VIP thành công!\nChào mừng Giáo viên: ${res.fullname || inputIdgv}\nCấp độ: ${res.level || 'VIP'}\nHạn sử dụng: ${res.hetHan || 'Vô thời hạn'}`);
      } else {
        const updatedData: AppData = {
          ...data,
          idgv: inputIdgv,
          licenseStatus: 'free'
        };
        onUpdate(updatedData);
        alert(res.message || "Tài khoản chưa được kích hoạt bản quyền VIP hoặc đã hết hạn!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối khi xác minh tài khoản!");
    }
  };
  
  // Danh sách các ứng dụng trong hệ thống SmartEdu của Thầy Hà
  const smartEduApps = [
    {
  title: "Đăng ký tài khoản",
  description: "Tạo tài khoản mới để trải nghiệm đầy đủ các tính năng quản lý, tạo đề và tổ chức thi trực tuyến.",
  features: ["Đăng ký nhanh chóng", "Bảo mật thông tin", "Kích hoạt tức thì"],
  icon: UserPlus,
  color: "from-blue-500 to-indigo-600",
  shadow: "shadow-blue-100",
  badge: "Tài khoản",
  isExternal: true,
  link: "https://smarteduv2.vercel.app?mode=register"
},
{
  title: "Kiểm tra bản quyền",
  description: "Xác minh trạng thái bản quyền phần mềm để đảm bảo hệ thống hoạt động ổn định.",
  features: ["Xác minh tự động", "Bảo vệ dữ liệu", "Cập nhật bản quyền"],
  icon: ShieldCheck,
  color: "from-amber-500 to-orange-600",
  shadow: "shadow-amber-100",
  badge: "Hệ thống",
  isLicenseCheck: true // Cờ riêng để gọi hàm xác minh
},
 {
      title: "Hệ thống ra đề thi Online",
      description: "Nền tảng tổ chức thi và kiểm tra trực tuyến thế hệ mới: Nên chọn tạo đề từ PDF và ra đề từ ngân hàng, trích xuất hình ảnh/câu hỏi từ file PDF bằng AI và thiết lập ma trận đề thi từ ngân hàng câu hỏi.",
      features: ["Trích xuất Word / PDF", "Tạo đề theo ma trận", "Ngân hàng câu hỏi phong phú, đa dạng", "Chống gian lận khi làm bài", "Tải điểm, xem điểm linh hoạt"],
      icon: GraduationCap,
      color: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-100",
      badge: "Hệ sinh thái",
      isExternal: true,
      link: "https://smarteduv2.vercel.app?mode=login"
    },
    {
      title: "Hệ thống tạo trò chơi trí tuệ Online",
      description: "Nền tảng tạo Game online với ngân hàng câu hỏi hệ thống đa dạng, phong phú. Các game điển hình: Chinh phục vũ trụ, Đua xe công thức F1, Vua phá băng,... và nhiều game hấp dẫn khác.",
      features: ["Giao diện hấp dẫn", "Game phù hợp và vui nhộn", "Cập nhật điểm tức thì"],
      icon: Gamepad2,
      color: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-100",
      badge: "Hệ sinh thái",
      isExternal: true,
      link: "https://gametrithuc.vercel.app/"
    },
    {
      title: "Quản lý học thêm và chủ nhiệm thông minh",
      description: "Hệ thống tự động hóa lớp dạy thêm: Điểm danh chuyên nghiệp, tự động tính học phí theo buổi học thực tế, quản lý danh sách học sinh tinh gọn và lưu vết lịch sử đóng tiền rõ ràng.",
      features: ["Điểm danh tự động", "Tính học phí thông minh", "Ghi nhật ký nộp tiền", "Tự động cập nhật học phí khi phụ huynh chuyển khoản"],
      icon: CheckSquare,
      color: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-100",
      badge: "Phổ biến"
    },
    {
      title: "Tạo QR thu học phí tự động",
      description: "Giải pháp chuyển khoản rảnh tay: Tự động quét thông tin từ Google Sheets hoặc file Excel để sinh mã QR VietQR kèm chính xác số tiền và cú pháp định danh của từng học sinh.",
      features: ["Tích hợp VietQR chuẩn", "Tạo QR từ Excel", "Tạo QR từ Google sheet", "Bảo mật tài khoản", "Cần tích hợp VietQR hay SePay(Dễ làm)"],
      icon: QrCode,
      color: "from-pink-500 via-rose-500 to-amber-500",
      shadow: "shadow-rose-100",
      badge: "Tiện ích Pro",
      customLinks: [
        { label: "Tích hợp VietQR", url: "https://accounts.casso.vn/signup?returnTo=dYFr_6rDrHI99o0D0cq6Y" }, // Thầy thay link 1 ở đây
        { label: "Tích hợp SePay", url: "https://sepay.vn?utm_source=INV&utm_medium=RFTRA&utm_campaign=E611D6B0" },  // Thầy thay link 2 ở đây
        { label: "Tải code GAS", url: "https://docs.google.com/spreadsheets/d/1dX-yLVwsTeCDZZhII4xam_UQ4c6GipFYP7mQqHMaNrE/edit?usp=sharing" }  // Thầy thay link 2 ở đây
      ]
    },
    {
      title: "Chuyển đổi PDF/Img sang word Tex 99,99%",
      description: "Với nhiều phiên bản chuyển PDF/Img sang word với độ chính xác LaTex đến 99,99% khi chuyển sang Mathtype",
      features: ["Giữ nguyên hình ảnh, đồ thị", "Tốc độ ấn tượng", "Độ chính xác cao"],
      icon: RefreshCw,
      color: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-100",
      badge: "Hệ sinh thái",
      isExternal: true,
      link: "https://convertword.vercel.app/"
    },
    {
      title: "Trợ lý Trí tuệ nhân tạo Gemini AI",
      description: "Tích hợp mô hình ngôn ngữ lớn để đồng hành cùng giáo viên: Hỗ trợ giải toán, gợi ý phương pháp sư phạm, soạn thảo kế hoạch bài dạy và tối ưu hóa nội dung giáo án nhanh chóng.",
      features: ["Giải toán thông minh", "Hỗ trợ soạn giáo án", "Phân tích kết quả học sinh"],
      icon: Sparkles,
      color: "from-purple-500 to-fuchsia-600",
      shadow: "shadow-purple-100",
      badge: "AI Kích hoạt"
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Banner chào mừng rực rỡ và chuyên nghiệp */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 md:p-10 text-white shadow-xl shadow-indigo-100">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute right-20 bottom-0 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase">
            <Zap size={12} className="text-yellow-300 animate-bounce" />
            Hệ sinh thái giáo dục số toàn diện
          </div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
            Hãy trải nghiệm và góp ý về tác giả nhé.
          </h2>
          <p className="text-sm md:text-base text-indigo-100 font-medium max-w-2xl leading-relaxed">
            Nền tảng tối ưu hóa công tác quản lý, giảng dạy và kiểm tra đánh giá dành riêng cho Giáo viên. 
            Tất cả các chức năng được thiết kế trực quan, vận hành mượt mà ngay trên thanh menu bên trái của Thầy Cô.
          </p>
        </div>
      </div>



      {/* Grid danh sách các ứng dụng */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Tổng hợp các ứng dụng hệ thống</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Click các tính năng tương ứng ở cột bên trái hoặc nút điều hướng để bắt đầu làm việc</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {smartEduApps.map((app, index) => {
            const Icon = app.icon;
            return (
              <div 
                key={index} 
                className={`bg-white rounded-2xl border border-slate-100 p-4 flex flex-col justify-between hover:shadow-xl hover:border-indigo-100 transition-all duration-300 shadow-sm ${app.shadow} relative overflow-hidden group`}
              >
                {/* Khối Badge góc phải */}
                <span className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-slate-50 text-slate-500 rounded-md group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  {app.badge}
                </span>

                <div className="space-y-2.5">
                {/* Header Card: Icon & Tiêu đề nằm cùng 1 hàng */}
<div className="flex items-center gap-3">
  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${app.color} flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0`}>
    <Icon size={20} />
  </div>
  <div className="flex items-center gap-2 flex-wrap pr-12">
    <h4 className="text-base font-bold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
      {app.title}
    </h4>
    {/* Thông báo Dùng thử miễn phí bên cạnh chữ Kiểm tra bản quyền khi tắt bản quyền (false) */}
    {app.isLicenseCheck && data.enableCopyrightCheck === false && (
      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-700 rounded-md shrink-0 border border-amber-200">
        Dùng thử miễn phí
      </span>
    )}
  </div>
</div>

<p className="text-xs text-slate-500 leading-relaxed font-medium mt-2">
  {app.description}
</p>
                  {/* Danh sách nhãn tính năng con */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {app.features.map((feat, fIdx) => (
                      <span key={fIdx} className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Phần Nút nhấn Hành động */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs font-bold text-indigo-600">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-slate-500 text-[11px] font-medium italic">Hệ thống sẵn sàng</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                  </div>

                  {/* Xử lý các nút điều hướng */}
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {app.customLinks ? (
  /* Danh sách nút tùy chỉnh (Thẻ QR...) */
  app.customLinks.map((btn, bIdx) => (
    <button
      key={bIdx}
      onClick={() => window.open(btn.url, '_blank')}
      className="animate-pulse hover:animate-none flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white font-extrabold text-[11px] bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 shadow-md shadow-rose-200 transition-all duration-300 transform hover:scale-105 active:scale-95 shrink-0"
    >
      <Sparkles size={13} className="text-yellow-200" />
      <span>{btn.label}</span>
      <ExternalLink size={12} />
    </button>
  ))
) : app.isLicenseCheck ? (
  /* Nếu là vip và còn hạn sử dụng -> Nút 'Cấp độ Vip'. Nếu không phải Vip -> Nút 'ĐK Vip' */
  data.licenseStatus === 'vip' ? (
    <button 
      onClick={handleVerifyLicense}
      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl transition-all shrink-0 font-extrabold text-xs shadow-md shadow-emerald-100"
      title="Bản quyền VIP - Nhấp để kiểm tra lại"
    >
      <ShieldCheck size={14} />
      <span>Cấp độ Vip</span>
    </button>
  ) : (
    <div className="flex items-center gap-1.5 shrink-0">
      <button 
        onClick={() => setShowQrModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 rounded-xl transition-all shrink-0 font-extrabold text-xs shadow-md shadow-amber-200"
      >
        <span>ĐK Vip</span>
        <ArrowRight size={13} />
      </button>
      <button 
        onClick={handleVerifyLicense}
        className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all text-xs font-bold"
        title="Nhấp để xác minh bản quyền đã đăng ký"
      >
        Tài khoản
      </button>
    </div>
  )
) : app.isExternal ? (
  /* Nút Mở ứng dụng thông thường */
  <button 
    onClick={() => window.open(app.link, '_blank')}
    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shrink-0"
  >
    Mở ứng dụng <ArrowRight size={12} />
  </button>
) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Khối Ghi chú chân trang an toàn & Chuyên nghiệp */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex gap-3 items-center">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-700">Dữ liệu an toàn</h5>
            <p className="text-[11px] text-slate-400 font-medium">Lưu trữ bảo mật trên Google Drive</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex gap-3 items-center">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-slate-100">
            <GitBranch size={20} />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-700">Đồng bộ tức thì</h5>
            <p className="text-[11px] text-slate-400 font-medium">Cập nhật hai chiều với Google Sheets</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex gap-3 items-center">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-500 shadow-sm border border-slate-100">
            <Sparkles size={20} />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-700">Giao diện thông minh</h5>
            <p className="text-[11px] text-slate-400 font-medium">Trải nghiệm mượt mà, thân thiện</p>
          </div>
          </div>
        </div>
      
          {/* Khối Mạng xã hội & Tác giả - Đặt tách biệt dưới cùng */}
      <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        
        {/* Khối Mạng xã hội bên góc trái */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-900 text-sm">Kết nối với chúng tôi</h4>
          <div className="flex flex-wrap gap-3">
            <a href="https://www.facebook.com/hoctoanthayha.bg"
              target="_blank" 
              rel="noopener noreferrer"
              className="w-12 h-12 bg-[#1877F2] text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-blue-100">
              <Facebook className="w-6 h-6" />
            </a>
            <a href="https://www.youtube.com/@giaovienvn" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-12 h-12 bg-[#FF0000] text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-red-100">
              <Youtube className="w-6 h-6" />
            </a>
            <a href="https://x.com/Math_teacher_Ha" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-12 h-12 bg-[#1DA1F2] text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-blue-100">
              <Twitter className="w-6 h-6" />
            </a>
            <a href="#" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-12 h-12 bg-[#0088CC] text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-blue-100">
              <Send className="w-6 h-6" />
            </a>
            <a href="https://zalo.me/g/nlvywc450" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-12 h-12 bg-[#0068FF] text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-blue-100 font-bold italic text-xl">
              Z
            </a>
          </div>
        </div>

        {/* Khối Thông tin Tác giả bên góc phải */}
        <div className="text-left md:text-right space-y-1 text-slate-500 text-xs">
          <p className="font-bold text-slate-800 text-sm">Nguyễn Văn Hà</p>
          <p className="font-medium">THPT Yên Dũng số 2 - Bắc Ninh</p>
        </div>

      </div>
      {/* --- MODAL QUÉT MÃ QR NÂNG CẤP PRO --- */}
<AnimatePresence>
  {showQrModal && (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl relative border border-slate-100"
      >
        {/* Nút đóng */}
        <button 
          onClick={() => setShowQrModal(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Zap className="w-6 h-6 fill-yellow-500" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-1">Nâng cấp tài khoản VIP</h3>
        <p className="text-xs text-slate-500 mb-4">
          Mã QR đã bao gồm chính xác số tiền và nội dung chuyển khoản theo IDGV của thầy/cô.
        </p>

        {/* Mã QR Sinh Tự Động (VietQR) */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 inline-block mb-4 shadow-inner">
          <img 
            src={`https://img.vietqr.io/image/MB-0240198389999-compact2.png?amount=199000&addInfo=${encodeURIComponent(`SEVQR BQ${data?.idgv || ""}`)}&accountName=${encodeURIComponent("NGUYEN VAN HA")}`} 
            alt="Mã QR Chuyển khoản" 
            className="w-60 h-60 object-contain rounded-xl"
          />
        </div>

        {/* Thông tin xác nhận */}
        <div className="bg-amber-50/80 rounded-2xl p-3.5 text-left text-xs space-y-1.5 border border-amber-200/60 text-amber-900">
          <div className="flex justify-between">
            <span className="text-amber-700">Tài khoản IDGV:</span>
            <span className="font-bold">{data?.idgv || ""}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-700">Nội dung CK:</span>
            <span className="font-bold text-blue-700 font-mono">SEVQR BQ{data?.idgv || ""}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-700">Chủ tài khoản:</span>
            <span className="font-semibold">NGUYEN VAN HA</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-700">Hỗ trợ nhanh:</span>
            <span className="font-semibold">0988.948.882</span>
          </div>
        </div>

        <button 
          onClick={() => setShowQrModal(false)}
          className="w-full mt-5 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all text-sm"
        >
          <div className="flex flex-col gap-1">
  <span className="text-amber-700">Hệ thống sẽ tự động nâng cấp VIP cho thầy cô</span>
  <span className="font-semibold">Cảm ơn thầy cô đã tin tưởng!</span>
</div>
         
        </button>
      </motion.div>
    </div>
  )}
</AnimatePresence>

    </div>
  );
};

export default Dashboard;
