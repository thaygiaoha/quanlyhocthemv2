import React, { useState } from 'react';
import { Search, CheckCircle2, AlertCircle, Trash2, Loader2, Lock, QrCode, Copy, Download, X, CreditCard } from 'lucide-react';
import { AppData } from '../types';
import { allcheck } from '../src/utils/mathHelpers';
import { safeName } from './verifyadmin';

interface PaymentHistoryProps {
  data: AppData;
  onUpdate: (data: AppData) => void;
  onRefreshData?: () => Promise<void>; // Hàm tải lại dữ liệu từ component cha sau khi lưu thành công
}

const PaymentHistorySection: React.FC<PaymentHistoryProps> = ({ data, onUpdate, onRefreshData }) => {
  const [selectedClass, setSelectedClass] = useState<string>('Lop12');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPayMode, setIsPayMode] = useState(false);  
  const [isResetting, setIsResetting] = useState(false);
  const [lanPage, setLanPage] = useState(0);

  // --- STATE MODAL QR THANH TOÁN KHI CHƯA NỘP ---
  const [qrModalData, setQrModalData] = useState<{
    student: any;
    lan: number;
    amount: number;
    qrUrl: string;
    content: string;
    bankId: string;
    bankAccountNo: string;
    bankAccountName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // --- CÁC STATE CHO FORM GHI HỌC PHÍ ---
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [inputLan, setInputLan] = useState('L1');
  const [inputAmount, setInputAmount] = useState('600000');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthorizedV, setIsAuthorizedV] = useState(() => {
    return localStorage.getItem('is_authorized_v') === 'true' || data.enableCopyrightCheck === false || data.licenseStatus === 'vip';
  });
  const [password, setPassword] = useState('');
  
  const handleAuthV = async () => {
    if (!password.trim()) {
      alert('Vui lòng nhập mật khẩu!');
      return;
    }  
    setIsChecking(true);
    try {
      const key = String(password).toLowerCase().trim();
      const pwdC2 = String(data.passwordC2 || "").toLowerCase().trim();
      if (key === "16868688" || (pwdC2 && key === pwdC2)) {       
        setIsAuthorizedV(true);
        localStorage.setItem('is_authorized_v', 'true');
        alert('Xác thực thành công!');       
      } else {
        alert('Sai mật khẩu rồi nhé bạn! (^__^)');
      }   
    } catch (error) {
      console.error("Lỗi xác thực:", error);
      alert('Đã xảy ra lỗi trong quá trình xác thực.');
    } finally {
      setIsChecking(false); 
    }
  };


  // 1. Lấy danh sách học sinh gốc của lớp được chọn và dữ liệu lịch sử (Cột S đến AI)
  const currentSheet = data.sheets[selectedClass];
  const currentStudents = currentSheet?.students || [];
  const historyBlocks: any[] = (currentSheet as any)?.historyBlocks || [];

  // 2. Trích xuất dữ liệu từ sheet ThuTien đã nạp trong data
  const rawThuTien = data.sheets['ThuTien']?.students || []; 

  // Lọc riêng bản ghi của lớp hiện tại (hoặc khớp với học sinh trong lớp)
  const classNumber = selectedClass.replace('Lop', '');
  const classRecords = rawThuTien.filter((r: any) => {
    if (!r) return false;
    if (r.lop) {
      const match = String(r.lop).match(/^\d+/);
      const extractedClassNum = match ? match[0] : String(r.lop);
      if (String(extractedClassNum) === String(classNumber)) return true;
    }
    // Nếu r.lop không ghi rõ, đối chiếu xem học sinh có thuộc lớp này không
    return currentStudents.some((s: any) => 
      (s.code && r.code && allcheck(s.code, r.code)) || 
      (s.name && r.name && allcheck(s.name, r.name))
    );
  });

  // 3. 2307sua7: max lần bằng số đánh dấu lưu bên cột R của sheet(Lop...)
  const maxLan = (currentSheet as any)?.maxLan ?? (currentSheet as any)?.historyCount ?? historyBlocks.length ?? 0;

  // 2307them7: Dùng biến maxLan này vào hàm nhật ký nộp tiền. Nếu không có (maxLan === 0) thì không hiện nhật ký gì
  const currentLans = maxLan > 0 ? Array.from({ length: maxLan }, (_, i) => i + 1) : [];

  // 4. Lọc tìm kiếm học sinh theo Tên hoặc Mã HS (Code) để chính xác tuyệt đối
  const filteredStudents = currentStudents.filter(s => {
    const searchLower = searchTerm.toLowerCase().trim();
    const matchName = s.name && String(s.name).toLowerCase().includes(searchLower);
    const matchCode = s.code && String(s.code).toLowerCase().includes(searchLower);
    const matchClass = s.class && String(s.class).toLowerCase().includes(searchLower);
    const matchSchool = s.school && String(s.school).toLowerCase().includes(searchLower);
    return matchName || matchCode || matchClass || matchSchool;
  });

  const formatCurrency = (amount: any) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Mở modal hiển thị mã QR thanh toán khi phụ huynh / GV nhấn vào nút "Chưa nộp"
  const handleShowQrModal = (student: any, lan: number, customAmount?: number) => {
    // Tìm số tiền ở lịch sử (Cột AI của đợt nộp tương ứng)
    const block = historyBlocks.find((b: any) => b.lan === lan);
    const histStudent = block?.students?.find((s: any) => allcheck(s.code, student.code));
    
    // Ưu tiên số tiền từ cột AI, nếu không có lấy từ customAmount hoặc student.totalAmount hoặc mặc định
    const amount = histStudent?.totalAmount || customAmount || student.totalAmount || 600000;
    const cleanAmount = Math.round(Number(amount) || 600000);

    const bankId = data.bankId || 'Vietinbank';
    const bankAccountNo = data.bankAccountNo || '104887594225';
    const bankAccountName = data.bankAccountName || 'NGUYEN VAN HA';
    const sname = safeName(student.name || "");
    const content = `SEVQR ${student.code || student.stt} L${lan} ${sname} nop tien `;

    const qrUrl = `https://img.vietqr.io/image/${bankId}-${bankAccountNo}-compact2.png?amount=${cleanAmount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(bankAccountName)}`;

    setQrModalData({
      student,
      lan,
      amount: cleanAmount,
      qrUrl,
      content,
      bankId,
      bankAccountNo,
      bankAccountName
    });
    setCopied(false);
  };
const LAN_PER_PAGE = 6;

const visibleLans = currentLans.slice(
  lanPage * LAN_PER_PAGE,
  (lanPage + 1) * LAN_PER_PAGE
);

  // --- CÁC HÀM XỬ LÝ CHỨC NĂNG ---
  const handleOpenPayForm = (student: any) => {
  const paddedStt = String(student.stt).padStart(2, '0');
  const fullRawName = `${paddedStt}.${student.name}`; 
  
  setSelectedStudent({
    stt: paddedStt,
    name: student.name,
    fullRawName: fullRawName,
    classDetail: student.class,
    code: student.code // Lưu code để submit gửi lên
  });
  
  setInputLan('L1'); // Đưa đợt nộp về mặc định L1 khi đổi học sinh
  
  const existRecord = classRecords.find((r: any) => {
    // Sửa: Đối chiếu theo r.code và student.code
    return allcheck(r.lanNop ,inputLan) && allcheck(r.code, student.code);
  });
  const sotien = existRecord ? String(existRecord.soTien) : '600000';
  setInputAmount(sotien);
};

  const handleLanChange = (lannop: string) => {
    setInputLan(lannop);    
    if (selectedStudent) {
      const existRecord = classRecords.find((r: any) => {
        return allcheck(r.lanNop ,lannop) && allcheck(r.code, selectedStudent.code);          
      });
    const sotien = existRecord ? String(existRecord.soTien) : '600000';
    setInputAmount(sotien);
    }
  };

  const handleSavePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !inputAmount || !adminPassword) {
      alert("Vui lòng nhập đầy đủ Số tiền và Mật khẩu cấu hình!");
      return;
    }

    const isExist = classRecords.some((r: any) => {
      return allcheck(r.lanNop ,inputLan) && allcheck(r.code, selectedStudent.code); 
    });

    if (isExist) {
      const confirmOverride = window.confirm(
        `Học sinh [${selectedStudent.name}] đã có dữ liệu đóng tiền ở [${inputLan.replace('L', 'Lần ')}].\n\nThầy có chắc chắn muốn GHI ĐÈ hệ thống để đổi số tiền không?`
      );
      if (!confirmOverride) return;
    }
     const existRecord = classRecords.find((r: any) => {
        return allcheck(r.lanNop ,inputLan) && allcheck(r.code, selectedStudent.code);         
      });
      const sotien = existRecord ? String(existRecord.soTien) : '600000'; 

    setIsSubmitting(true);
    try {
      const response = await fetch(data.sheetLink, { 
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'addPayment',
          stt: selectedStudent.stt,
          name: selectedStudent.fullRawName, 
          lop: selectedStudent.classDetail || classNumber || "99A",
          lanNop: inputLan,
          soTien: Number(inputAmount),
          code: selectedStudent.code,
          password: adminPassword
        })
      });     
      const resJson = await response.json();
      if (resJson.status === 200 || resJson.success) {
        alert(resJson.message || 'Cập nhật học phí thành công!');
        setSelectedStudent(null);
        setInputAmount('600000');
        setAdminPassword('');        
        if (onRefreshData) {
          await onRefreshData();
        }
      } else {
        alert('Lỗi: ' + (resJson.message || 'Cập nhật thất bại'));
      }
    } catch (error) {
      console.error(error);
      alert('Không thể kết nối đến hệ thống Sheet!');
    } finally {
      setIsSubmitting(false);
    }
  };
  // Xóa dữ liệu nộp tiền của lớp
  const handleResetTienhoc = async () => {
    const classNameFormatted = selectedClass.replace("Lop", "Lớp ");
  // 1. Hiện hộp thoại bắt nhập mật khẩu
    const inputPassword = window.prompt("VUI LÒNG NHẬP MẬT KHẨU ADMIN Ô C2 ĐỂ XÁC THỰC QUYỀN RESET:");
    if (inputPassword === null) return; // Bấm hủy
    if (!inputPassword.trim()) {
      alert("Mật khẩu không được để trống!");
      return;
    }

    // 2. Cảnh báo xác nhận lần cuối trước khi xóa sạch   
    
    const confirm1 = window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn RESET TOÀN BỘ tiền học của lớp ${classNameFormatted}?. Bạn chắc chắn chứ?`);
    if (!confirm1) return; 
   

    setIsResetting(true);
    try {
      if (data.sheetLink) {
        const response = await fetch(data.sheetLink, {
          method: 'POST',
          body: JSON.stringify({
            action: 'resetTienhoc',
            className: selectedClass,
            password: inputPassword            
          })
        });
        const result = await response.json();
        alert(result.message);  
        if (onRefreshData) {
          await onRefreshData();
        }
             
      } else {
        alert("Không tìm thấy liên kết Google Sheets!");
      }
    } catch (err) {
      alert("Lỗi xảy ra trong quá trình xóa dữ liệu lớp học.");
    } finally {
      setIsResetting(false);
    }
  };
if (!isAuthorizedV) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-md max-w-md mx-auto border border-slate-100 flex flex-col items-center">
        <Lock className="text-amber-500 mb-4" size={32} />
        <h2 className="text-xl font-bold text-slate-800 mb-6">Xác thực quyền vào hệ thống</h2>
        <p className="text-slate-500 text-center mb-6">Mật khẩu vào 16...88!</p>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu để vào hệ thống..."
          onKeyDown={(e) => e.key === 'Enter' && handleAuthV()}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none mb-4 focus:ring-2 focus:ring-indigo-500"
        />
        <button 
  onClick={handleAuthV} 
  disabled={isChecking}
  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
>
  {isChecking ? 'Đang xác thực...' : 'Xác nhận'}
</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Thanh công cụ: Chọn lớp & Tìm kiếm */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-1.5 flex-wrap">
          {Object.keys(data.sheets)
            .filter(cls => cls.startsWith("Lop"))
            .sort((a, b) => {
              const numA = parseInt(a.replace("Lop", ""), 10) || 0;
              const numB = parseInt(b.replace("Lop", ""), 10) || 0;
              return numA - numB;
            })
            .map(cls => (
              <button
                key={cls}
                type="button"
                onClick={() => {
                  setSelectedClass(cls);
                  setIsPayMode(false);
                  setSelectedStudent(null);
                   setLanPage(0);
                }}
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold transition-all ${
                  allcheck(selectedClass ,cls) && !isPayMode
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cls.replace("Lop", "Lớp ")}
              </button>
            ))}

          {/* NÚT ĐỔI CHẾ ĐỘ */}
          <button
            type="button"
            onClick={() => {
              setIsPayMode(!isPayMode);
              setSelectedStudent(null);
              setLanPage(0); // thêm
            }}
            className={`ml-2 px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold transition-all border ${
              isPayMode 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            💼 {isPayMode ? "Xem Nhật Ký Tổng" : "Update Nộp tiền"}
          </button>
          {/* Sửa đoạn nút Reset tiền học: ẩn hoàn toàn nếu isPublic = true */}
  <button
    type="button"
    onClick={handleResetTienhoc}
    disabled={isResetting || !data.sheetLink}
    className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 shadow-sm"
    title={`Xóa sạch học sinh lớp ${selectedClass.replace("Lop", "")}`}
  >
    {isResetting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
    Reset tiền học
  </button>

        </div>
        {currentLans.length > LAN_PER_PAGE && (
        <div className="flex items-center gap-2">
  <button
    disabled={lanPage === 0}
    onClick={() => setLanPage(p => p - 1)}
    className="px-3 py-1 rounded-lg bg-slate-100 disabled:opacity-40"
  >
    ◀ Trước
  </button>

  <span className="text-sm font-bold">
    Lần {lanPage * 6 + 1} - {Math.min((lanPage + 1) * 6, maxLan)}
  </span>

  <button
    disabled={(lanPage + 1) * 6 >= currentLans.length}
    onClick={() => setLanPage(p => p + 1)}
    className="px-3 py-1 rounded-lg bg-slate-100 disabled:opacity-40"
  >
    Sau ▶
  </button>
</div>
      )}
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Tìm kiếm học sinh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>
      {/* HIỂN THỊ CHẾ ĐỘ GIỮA HAI BẢNG */}
      {isPayMode ? (
        /* CHẾ ĐỘ 1: CẬP NHẬT GHI ĐÈ HỌC PHÍ */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-5 bg-emerald-600 rounded-sm inline-block"></span>
            Chế độ cập nhật & Ghi đè Học phí - Lớp {classNumber}
          </h3>

          {/* Form thao tác ghi tiền */}
          {selectedStudent && (
            <form onSubmit={handleSavePaymentSubmit} className="bg-slate-50 p-4 rounded-xl grid grid-cols-2 md:grid-cols-6 gap-3 items-end border border-slate-200 animate-in slide-in-from-top duration-200">
              <input type="text" name="username" autoComplete="username" value={selectedStudent.fullRawName} readOnly className="hidden" />
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Học sinh chọn</label>
                <div className="p-2 bg-white rounded-lg border text-sm font-bold text-slate-700 truncate shadow-sm">
                  {selectedStudent.stt} - {selectedStudent.name} - {selectedStudent.code}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Lần nộp học phí</label>
                <select
                  value={inputLan}
                  onChange={(e) => handleLanChange(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border text-sm font-bold text-slate-700 focus:outline-none shadow-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => `L${i + 1}`).map(lan => (
                    <option key={lan} value={lan}>Lần {lan.replace('L', '')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Số tiền (VND)</label>
                <input
                  type="number"
                  placeholder="Ví dụ: 150000"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border text-sm font-bold focus:outline-none focus:border-emerald-500 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-red-500 uppercase mb-1">Mật khẩu Admin Ô C2</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="***"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border text-sm focus:outline-none focus:border-red-500 shadow-sm"
                />
              </div>
              <div className="col-span-2 md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition-colors disabled:bg-slate-300 shadow-sm"
                >
                  {isSubmitting ? 'Đang lưu...' : '💾 Lưu'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-sm rounded-lg transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          )}

          {/* Bảng danh sách học sinh */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 w-16 text-center">STT</th>
                  <th className="p-4 w-48 text-left">Họ và Tên</th>
                  <th className="p-4 w-20 text-center">Lớp</th>
                  <th className="p-4 w-20 text-center">Mã HS</th>
                  <th className="p-4 w-32 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
                    const studentSttStr = String(student.stt).padStart(2, '0');
                    const isCurrentSelected = selectedStudent && allcheck(selectedStudent.stt ,studentSttStr);
                    return (
                      <tr 
                        key={student.code} 
                        className={`transition-colors ${isCurrentSelected ? 'bg-emerald-50/50 font-medium' : 'hover:bg-slate-50/70'}`}
                      >
                        <td className="p-4 text-center font-mono font-bold text-slate-400">
                          {studentSttStr}
                        </td>
                        <td className="p-4 w-48 text-left font-bold text-slate-800">
                          {student.name}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-500">
                          {student.class}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-500">
                          {student.code}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenPayForm(student)}
                            className="px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all shadow-sm"
                          >
                            ✏️ Sửa / Ghi tiền
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">Không tìm thấy học sinh nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : currentLans.length === 0 ? (
        /* 2307sua7 / 2307them7: THÔNG BÁO THIẾU CỘT ĐÁNH DẤU LƯU R BÊN GOOGLE SHEET */
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-8 text-center shadow-sm my-4">
          <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-2xl shadow-sm border border-amber-200">
            📋
          </div>
          <h4 className="text-base font-extrabold text-slate-800 mb-1">
            Lớp {classNumber} chưa có đợt thu tiền nào
          </h4>
          <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
            Dữ liệu các đợt thu tiền (được lưu ở cột R đến AI trên Google Sheet) hiện chưa có.
            Khi Thầy/Cô điểm danh đủ 10 buổi hoặc thực hiện lưu nhật ký trên Google Sheet, đợt thu mới sẽ tự động xuất hiện tại đây.
          </p>
        </div>
      ) : (
        /* CHẾ ĐỘ XEM 2: BẢNG NHẬT KÝ NỘP TIỀN GỐC (KHI ĐÃ CÓ ĐỢT THU TIỀN) */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 w-10 text-center">STT</th>
                  <th className="p-4 w-55 text-center">Họ và Tên</th>
                  <th className="p-4 w-10 text-center">Lớp</th>
                  <th className="p-4 w-14 text-center">Mã HS</th>
                  {visibleLans.map(lan => (
                    <th key={lan} className="p-4 text-center min-w-[120px]">Lần {lan}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
                    const studentSttStr = String(student.stt);
                    const studentCodeStr = String(student.code);

                    return (
                      <tr key={student.code} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 w-10 font-mono font-bold text-slate-400 text-center">{studentSttStr}</td>
                        <td className="p-4 w-55 font-bold text-slate-800">{student.name}</td>
                        <td className="p-4 w-10 font-mono font-bold text-slate-400 text-center">{student.class}</td>
                        <td className="p-4 w-10 font-mono font-bold text-slate-400 text-center">{studentCodeStr}</td>
                        
                        {visibleLans.map(lan => {
                          const record = classRecords.find((r: any) => {
                            if (!r) return false;
                            const matchLan = r.lanNop === `L${lan}` || r.lanNop === `L0${lan}` || r.lanNop === String(lan) || allcheck(r.lanNop, `L${lan}`);
                            const matchStudent = (r.code && student.code && allcheck(r.code, student.code)) ||
                                                 (r.name && student.name && allcheck(r.name, student.name));
                            return matchLan && matchStudent;
                          });

                          // Lấy số tiền từ cột AI trong khối lịch sử S-AI (đợt nộp tương ứng)
                          const block = historyBlocks.find((b: any) => b.lan === lan);
                          const histStudent = block?.students?.find((s: any) => allcheck(s.code, student.code));
                          const amountForLan = histStudent?.totalAmount || student.totalAmount || 600000;

                          return (
                            <td key={lan} className="p-3 text-center">
                              {record ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="text-emerald-600 font-extrabold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                                    <CheckCircle2 size={13} />
                                    {formatCurrency(record.soTien || amountForLan)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 mt-0.5 font-mono">{record.date}</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleShowQrModal(student, lan, amountForLan)}
                                  className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 font-extrabold text-xs px-2.5 py-1 rounded-lg border border-red-200 inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                                  title="Phụ huynh / GV nhấp vào đây để hiển thị mã QR chuyển khoản"
                                >
                                  <AlertCircle size={14} className="text-red-600" />
                                  <span>Nộp ngay</span>
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4 + currentLans.length} className="p-8 text-center text-slate-400 font-medium">
                      Không tìm thấy học sinh phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL MÃ QR THANH TOÁN CHO PHỤ HUYNH / GV NỘP HỌC PHÍ */}
      {qrModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <QrCode className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Quét Mã QR Nộp Học Phí</h3>
                  <p className="text-xs text-blue-100 font-medium">Lần {qrModalData.lan} - Lớp {qrModalData.student.class || selectedClass}</p>
                </div>
              </div>
              <button
                onClick={() => setQrModalData(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Thông tin học sinh */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Học sinh</div>
                  <div className="font-extrabold text-slate-800 text-base">{qrModalData.student.name}</div>
                  <div className="text-xs text-slate-500 font-mono">Mã HS: {qrModalData.student.code || qrModalData.student.stt}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số tiền nộp</div>
                  <div className="font-black text-emerald-600 text-lg">{formatCurrency(qrModalData.amount)}</div>
                </div>
              </div>

              {/* Ảnh Mã QR VietQR */}
              <div className="flex flex-col items-center justify-center bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                  <img
                    src={qrModalData.qrUrl}
                    alt="Mã QR Chuyển khoản"
                    className="w-56 h-56 object-contain rounded-lg"
                  />
                </div>
                <p className="text-xs text-slate-500 font-medium mt-3 text-center">
                  Quét mã QR bằng ứng dụng Ngân hàng hoặc Ví điện tử
                </p>
              </div>

              {/* Thông tin Chuyển khoản & Nội dung */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-medium">Ngân hàng:</span>
                  <span className="font-bold text-slate-800">{qrModalData.bankId}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-medium">Số tài khoản:</span>
                  <span className="font-bold font-mono text-slate-800">{qrModalData.bankAccountNo}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-medium">Chủ tài khoản:</span>
                  <span className="font-bold text-slate-800">{qrModalData.bankAccountName}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-blue-50/80 rounded-xl border border-blue-100">
                  <span className="text-blue-600 font-medium">Nội dung CK:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-blue-800">{qrModalData.content}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(qrModalData.content);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                      title="Sao chép nội dung chuyển khoản"
                    >
                      {copied ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <a
                href={qrModalData.qrUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={`QR_HocPhi_${qrModalData.student.code || ""}_L${qrModalData.lan}_${qrModalData.student.name}.png`}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={14} />
                Tải QR về
              </a>
              <button
                onClick={() => setQrModalData(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentHistorySection;
