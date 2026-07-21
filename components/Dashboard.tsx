import React from 'react';
import { AppData } from '../types';
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
  Gamepad2, 
  RefreshCw,
  ExternalLink,
  Facebook, Youtube, Twitter, Send, UserPlus
} from 'lucide-react';

// 2107sua: Thêm prop onRefreshData và xử lý bản quyền
interface DashboardProps {
  data: AppData;  
  onUpdate: (data: AppData) => void;
  onRefreshData?: () => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onUpdate, onRefreshData }) => {
  const handleVerifyLicense = async () => {
    if (onRefreshData) {
      await onRefreshData();
    } else {
      alert("Chưa cấu hình liên kết Google Sheets để xác minh bản quyền!");
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

      {/* 2107them: Khối hiển thị trực quan trạng thái bản quyền Giáo viên */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg shrink-0 ${data.licenseStatus === 'vip' ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-100' : 'bg-gradient-to-tr from-amber-500 to-orange-600 shadow-amber-100'}`}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-extrabold text-slate-800">Trạng thái bản quyền Giáo viên</h4>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${data.licenseStatus === 'vip' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700 animate-pulse'}`}>
                {data.licenseStatus === 'vip' ? 'VIP - ĐÃ KÍCH HOẠT' : 'FREE - CHƯA KÍCH HOẠT'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {data.licenseStatus === 'vip' 
                ? `Kính chào giáo viên: ${data.fullname || data.idgv || 'Quý Thầy/Cô'} ${data.mon ? `(Bộ môn: ${data.mon})` : ''}. Hệ thống đã mở khóa toàn bộ tính năng!`
                : "Hệ thống đang chạy chế độ Xem thử (view-only). Đăng ký bản quyền và hoàn tất nộp phí (500,000đ) để sử dụng trọn đời."
              }
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto shrink-0 flex-wrap sm:flex-nowrap">
          <button 
            onClick={handleVerifyLicense}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all border border-slate-200 flex items-center justify-center gap-2 shadow-sm"
          >
            <RefreshCw size={14} /> Kiểm tra bản quyền
          </button>
          
          {data.licenseStatus !== 'vip' && (
            <a 
              href="https://smarteduv2.vercel.app?mode=register" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 transition-all text-center flex items-center justify-center gap-1.5 shadow-lg shadow-amber-100"
            >
              Đăng ký VIP <ArrowRight size={13} />
            </a>
          )}
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
  <h4 className="text-base font-bold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors pr-12">
    {app.title}
  </h4>
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
  /* Nút Kiểm tra bản quyền */
  <button 
    onClick={() => {
      const isCheckBanQuyen = true; // Biến điều kiện check bản quyền của thầy
      if (isCheckBanQuyen) {
        handleVerifyLicense(); // Gọi hàm xác minh bản quyền của thầy tại đây
      }
    }}
    className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-xl transition-all shrink-0 font-bold"
  >
    Xác minh ngay <ArrowRight size={12} />
  </button>
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

    </div>
  );
};

export default Dashboard;
