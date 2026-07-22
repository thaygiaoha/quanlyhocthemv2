import React, { useState } from 'react';
import { Search, Users, School, CreditCard, CalendarCheck, Trash2, Loader2, X, Lock } from 'lucide-react';
import { AppData } from '../types';

interface ListSectionProps {
  data: AppData;  
  onUpdate: (data: AppData) => void;
  onRefreshData?: () => Promise<void>;
}

const ListSection: React.FC<ListSectionProps> = ({ data }) => {
  const [selectedClass, setSelectedClass] = useState<string>('Lop12'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Quản lý trạng thái đang xóa học sinh nào (bằng key định danh)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // Trạng thái mở modal xóa học sinh
  const [isChecking, setIsChecking] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthorizedV, setIsAuthorizedV] = useState(false);
  const [password, setPassword] = useState('');

  const currentStudents = data.sheets[selectedClass]?.students || [];
  const filteredStudents = currentStudents.filter(s => {
    const searchLower = searchTerm.toLowerCase().trim();
    const matchName = s.name && String(s.name).toLowerCase().includes(searchLower);
    const matchCode = s.code && String(s.code).toLowerCase().includes(searchLower);
    const matchClass = s.class && String(s.class).toLowerCase().includes(searchLower);
    const matchSchool = s.school && String(s.school).toLowerCase().includes(searchLower);
    return matchName || matchCode || matchClass || matchSchool;
  });
// Xác minh admin (Sửa lần 2)
   const handleAuthV = async () => {
  if (!password.trim()) {
    alert('Vui lòng nhập mật khẩu!');
    return;
  }
  
  setIsChecking(true);
  try {
    const key = String(password).toLowerCase().trim();
    if (key === "16868688") {       
      setIsAuthorizedV(true);
      alert('Xác thực thành công!');       
      // Thêm logic chuyển hướng hoặc set login state của bạn ở đây (nếu có)
    } else {
      alert('Sai mật khẩu rồi nhé bạn! (^__^)');
    }   
  } catch (error) {
    console.error("Lỗi xác thực:", error);
    alert('Đã xảy ra lỗi trong quá trình xác thực.');
  } finally {
    // block finally này luôn chạy, giúp đảm bảo tắt trạng thái loading bất kể đúng/sai/lỗi
    setIsChecking(false); 
  }
};


  const handleResetClass = async () => {
    const classNameFormatted = selectedClass.replace("Lop", "Lớp ");
    // 1. Hiện hộp thoại bắt nhập mật khẩu
    const inputPassword = window.prompt("VUI LÒNG NHẬP MẬT KHẨU ADMIN Ô C2 ĐỂ XÁC THỰC QUYỀN RESET:");
    if (inputPassword === null) return; 
    if (!inputPassword.trim()) {
      alert("Mật khẩu không được để trống!");
      return;
    }

    // 2. Cảnh báo xác nhận lần cuối trước khi xóa sạch 
    
    const confirm = window.confirm(`CẢNH BÁO: Hành động này sẽ XÓA SẠCH học sinh và lịch sử điểm danh của ${classNameFormatted} (Chỉ giữ lại hàng tiêu đề). Bạn chắc chắn chứ?`);
    if (!confirm) return;

    setIsResetting(true);
    try {
      if (data.sheetLink) {
        const response = await fetch(data.sheetLink, {
          method: 'POST',
          body: JSON.stringify({
            action: 'resetClass',
            className: selectedClass,
            password: inputPassword
          })
        });
        const result = await response.json();
        alert(result.message);
        
        // Kích hoạt load lại trang để cập nhật giao diện trống
        window.location.reload();
      } else {
        alert("Không tìm thấy liên kết Google Sheets!");
      }
    } catch (err) {
      alert("Lỗi xảy ra trong quá trình xóa dữ liệu lớp học.");
    } finally {
      setIsResetting(false);
    }
  };

  // 2207sua2: Hàm xử lý xóa một học sinh chuẩn hóa, tách biệt logic API và đồng bộ Cloud
  const handleDeleteStudent = async (studentName: string, phoneNumber: string, studentCode: string) => {
    const inputPassword = window.prompt(`NHẬP MẬT KHẨU ADMIN Ô C2 ĐỂ XÓA HỌC SINH: ${studentName.toUpperCase()}`);
    if (inputPassword === null) return;
    if (!inputPassword.trim()) {
      alert("Mật khẩu không được để trống!");
      return;
    }

    const confirmDel = window.confirm(`Bạn có chắc chắn muốn xóa học sinh [ ${studentName} ] ra khỏi lớp học này?`);
    if (!confirmDel) return;

    // Ưu tiên dùng code để quản lý trạng thái loading của nút bấm cho đồng bộ
    const uniqueKey = studentCode ? studentCode.trim() : ''; // 1807Sua
    setIsDeleting(uniqueKey);

    let isSuccess = false;

    try {
      if (data.sheetLink) {
        const response = await fetch(data.sheetLink, {
          method: 'POST',
          body: JSON.stringify({
            action: 'deleteStudent',
            className: selectedClass,
            studentName: studentName,
            phoneNumber: phoneNumber,
            studentCode: studentCode || '', // Truyền thêm mã học sinh để bên GAS đối chiếu chính xác dòng cần xóa
            password: inputPassword
          })
        });
        const result = await response.json();
        alert(result.message);
        if (result.status === 200) {
          isSuccess = true;
        }
      } else {
        alert("Không tìm thấy liên kết Google Sheets!");
      }
    } catch (err) {
      console.error("Lỗi xóa học sinh:", err);
      alert("Lỗi xảy ra trong quá trình xóa học sinh.");
    } finally {
      setIsDeleting(null);
    }

    // 2207them2: Tách riêng bước làm mới dữ liệu sau khi xóa thành công để tránh báo lỗi giả
    if (isSuccess) {
      try {
        if (onRefreshData) {
          await onRefreshData();
        } else if (onUpdate) {
          const updatedSheets = { ...data.sheets };
          if (updatedSheets[selectedClass]) {
            const newStudents = updatedSheets[selectedClass].students
              .filter(s => (s.code || '').trim() !== (studentCode || '').trim() && s.name !== studentName)
              .map((s, idx) => ({ ...s, stt: idx + 1 }));
            updatedSheets[selectedClass] = {
              ...updatedSheets[selectedClass],
              students: newStudents,
              studentCount: newStudents.length
            };
            onUpdate({ ...data, sheets: updatedSheets });
          }
        }
      } catch (refreshErr) {
        console.error("Lỗi cập nhật giao diện sau khi xóa:", refreshErr);
      }
    }
  };

  // Lấy đơn giá học phí của lớp đang chọn
  const classFee = data.fees.find(f => f.className === selectedClass)?.fee || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Thanh chọn lớp và tìm kiếm */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {Object.keys(data.sheets)
            .filter(cls => cls.startsWith("Lop")) 
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) 
            .map(cls => {
              const studentCount = data.sheets[cls]?.studentCount || 0;
              return (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                    selectedClass === cls 
                    ? 'bg-indigo-600 text-white shadow-md border-indigo-600' 
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {cls.replace("Lop", "Lớp ")} 
                  <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${
                    selectedClass === cls ? 'bg-white/20' : 'bg-slate-300 text-slate-700'
                  }`}>
                    {studentCount}
                  </span>
                </button>
              );
            })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* NÚT XÓA HỌC SINH */}
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
            title="Chọn xóa một hoặc vài học sinh khỏi lớp"
          >
            <Trash2 size={16} />
            Xóa HS
          </button>  

          {/* NÚT RESET LỚP HỌC (Đã tích hợp hiệu ứng xoay tròn và đổi chữ trạng thái) */}
          <button
            type="button"
            onClick={handleResetClass}
            disabled={isResetting || !data.sheetLink}
            className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60 shadow-sm min-w-[140px]"
            title={`Xóa sạch học sinh lớp ${selectedClass.replace("Lop", "")}`}
          >
            {isResetting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang reset...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Reset lớp học</span>
              </>
            )}
          </button>

          {/* Ô Tìm kiếm */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Tìm... kiếm học sinh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Danh sách học sinh dạng Grid Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.length > 0 ? filteredStudents.map((student) => {
          const attendedCount = student.attendance ? student.attendance.filter(v => v === 1).length : 0;
          const displayAmount = attendedCount * classFee;
          
          // Đồng bộ Key của thẻ div bọc ngoài bằng code học sinh
          const cardKey = student.code ? student.code.trim() : '';

          return (
            <div key={cardKey} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-indigo-500">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                  <Users size={24} />
                </div>
                <div className="text-right">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">{student.class}</span>
                  {student.code && (
                    <span className="block text-[11px] text-indigo-500 font-semibold mt-0.5">Mã: {student.code}</span>
                  )}
                </div>
              </div>
              
              <h4 className="text-lg font-bold text-slate-800 mb-1">{student.stt}.{student.name}</h4>
              <p className="text-sm text-slate-500 flex items-center gap-1 mb-4">
                <School size={14} /> {student.school || "Chưa cập nhật trường"}
              </p>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4 mt-4">
                <div>
                  <p className="text-[10px] text-emerald-600 uppercase font-bold mb-1 flex items-center gap-1">
                    <CalendarCheck size={12} className="text-emerald-500" /> Số buổi học
                  </p>
                  <p className="font-bold text-slate-700">{attendedCount} buổi</p>
                </div>
                <div>
                  <p className="text-[10px] text-amber-600 uppercase font-bold mb-1 flex items-center gap-1">
                    <CreditCard size={12} className="text-amber-500" /> Học phí
                  </p>
                  <p className="font-bold text-indigo-600">{formatCurrency(displayAmount)}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-dashed border-slate-100">
                <div className="flex items-center justify-center gap-1 text-amber-600 font-bold text-xs bg-amber-50 py-2 rounded-lg border border-amber-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  CHỜ THANH TOÁN
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
            <Users size={48} className="mx-auto mb-4 opacity-10" />
            <p className="font-medium">Lớp hiện đang trống hoặc không tìm thấy kết quả</p>
          </div>
        )}
      </div>

      {/* POPUP MODAL CHỌN VÀ XÓA TỪNG HỌC SINH */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Xóa Học Sinh Từng </h3>
                <p className="text-xs text-slate-500">Danh sách học sinh lớp {selectedClass.replace("Lop", " ")}</p>
              </div>
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Danh sách học sinh rút gọn trong Modal */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1 min-h-[300px]">
              {currentStudents.length > 0 ? (
                currentStudents.map((student) => {
                  // uniqueKey của từng hàng trong modal được định danh bằng code học sinh
                  const uniqueKey = student.code ? student.code.trim() : '';
                  return (
                    <div 
                      key={uniqueKey}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-bold text-slate-800 text-sm truncate">
                          {student.stt}. {student.name}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Lớp: {student.class || "---"}</span>
                          <span>•</span>
                          <span className="text-indigo-600 font-semibold">Mã: {student.code || "---"}</span> 
                        </p>
                      </div>

                      <button
                        type="button"
                        // Truyền chính xác mã code (student.code) vào tham số thứ 3 của hàm xóa
                        onClick={() => handleDeleteStudent(student.name, student.phoneNumber, student.code || '')}
                        disabled={isDeleting !== null}
                        className="text-rose-600 hover:bg-rose-50 p-2 rounded-xl border border-transparent hover:border-rose-100 transition-colors disabled:opacity-40"
                        title={`Xóa học sinh ${student.name}`}
                      >
                        {isDeleting === uniqueKey ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-sm text-slate-400 py-10">Không có dữ liệu học sinh trong lớp này.</p>
              )}
            </div>
            
            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 rounded-b-2xl border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all"
              >
                Đóng danh sách
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListSection;
