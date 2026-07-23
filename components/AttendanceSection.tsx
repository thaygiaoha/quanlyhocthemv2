import React, { useState } from 'react';
import { CheckSquare, Lock, Search, CheckCircle2, XCircle, CloudUpload, Loader2, Calendar, Eye, RefreshCw } from 'lucide-react'; // 1807Sua
//import { CheckSquare, Lock, Save, Search, CheckCircle2, XCircle, CloudUpload, Loader2, Calendar } from 'lucide-react';
import { AppData } from '../types';
import { calculateTotal, syncAttendanceToSheet } from '../services/storage';
import { verifyAdminPassword } from './verifyadmin';

interface AttendanceSectionProps {
  data: AppData;
  onUpdate: (data: AppData) => void;
  onRefreshData: () => Promise<void>;
  //checkPassword: (pw: string) => boolean;
}

const AttendanceSection: React.FC<AttendanceSectionProps> = ({ data, onUpdate, onRefreshData }) => {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [attendanceMap, setAttendanceMap] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showDetailedTable, setShowDetailedTable] = useState(false); //1807Them
    // 1. Thêm state lưu ngày chọn (Mặc định lấy ngày hiện tại định dạng YYYY-MM-DD)
// Giữ nguyên định dạng YYYY-MM-DD ở state để các component input[type="date"] (nếu có) hoạt động chính xác
const [selectedDate, setSelectedDate] = useState<string>(() => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

// Hàm hỗ trợ format YYYY-MM-DD sang dd/mm/yy trước khi gửi đi
const formatDateToDDMMYY = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  
  // Lấy 2 số cuối của năm bằng slice(-2)
  const shortYear = year.slice(-2); 
  
  return `${day}/${month}/${shortYear}`;
};
const handleAuth = async () => {
  if (!password.trim()) {
    alert('Vui lòng nhập mật khẩu!');
    return;
  }
  setIsChecking(true);
  try {
    if (data.sheetLink) {
      // Gọi hàm và hứng trọn Object trả về
      const result = await verifyAdminPassword(data.sheetLink, password);
      
      if (result.success) {
        setIsAuthorized(true); // Mở cửa vào hệ thống!
        alert(result.message); // Hiện "Xác thực thành công!" từ GAS trả về
      } else {
        // Hiện thông báo lỗi từ GAS trả về (ví dụ: "Mật khẩu Admin không chính xác!")
        alert(result.message || 'Mật khẩu Admin không chính xác hoặc lỗi kết nối!');
      }
    } else {
      alert("Không tìm thấy liên kết Google Sheets!");
    }
  } catch (err) {
    alert("Có lỗi xảy ra trong quá trình xác thực.");
  } finally {
    setIsChecking(false); 
  }
};
  const handleSelectClass = (className: string) => {
  setSelectedClass(className);
  setShowDetailedTable(false); // 1807Them: Tự động ẩn bảng chi tiết khi thầy chuyển lớp mới
  const initialMap: { [key: string]: boolean } = {};
  data.sheets[className]?.students.forEach(s => {
    // Ưu tiên dùng code, nếu không có mới dùng tổ hợp s.phoneNumber + s.name để dự phòng
    const studentKey = s.code ? s.code.trim() : ''; // 1807Sua
    initialMap[studentKey] = true; // Mặc định là có mặt
  });
  setAttendanceMap(initialMap);
};

  const toggleAttendance = (key: string) => {
    setAttendanceMap(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReset = async (days: number) => {
    if (!selectedClass) return;
    
    if (window.confirm(`Bạn có chắc chắn muốn RESET ${days} ngày điểm danh gần đây nhất của lớp ${selectedClass.replace("Lop", "")}? Dữ liệu trên Cloud sẽ bị xóa tương ứng.`)) {
      setSyncing(true);
      try {
        if (data.sheetLink) {
          const response = await fetch(data.sheetLink, {
            method: 'POST',
            body: JSON.stringify({
              action: 'resetAttendance',
              className: selectedClass,
              daysToReset: days // Gửi số ngày lên GAS
            })
          });
          const result = await response.json();
          alert(result.message);
        }

        // Đưa giao diện hiện tại tạm thời về vắng mặt để tích lại
        const resetMap: { [key: string]: boolean } = {};
        data.sheets[selectedClass]?.students.forEach(s => {
          resetMap[s.code ? s.code.trim() : ''] = false; // 1807Sua
        });
        setAttendanceMap(resetMap);

      } catch (err) {
        alert('Lỗi khi reset dữ liệu trên Cloud. Vui lòng thử lại.');
      } finally {
        setSyncing(false);
      }
    }
  };
  // 2007Them: Hàm reset lịch sử giao dịch học thêm từ transactionkd sang luutransaction
  const handleResetTransactionKD = async () => {
    if (window.confirm("CẢNH BÁO (2007Them): Thầy có chắc chắn muốn Reset lịch sử giao dịch học thêm? Hệ thống sẽ chuyển toàn bộ giao dịch từ sheet(transactionkd) sang sheet(luutransaction) và xóa sạch sheet(transactionkd)!")) {
      setSyncing(true);
      try {
        if (data.sheetLink) {
          const response = await fetch(data.sheetLink, {
            method: 'POST',
            body: JSON.stringify({
              action: 'resetTransactionKD',
              password: password // Gửi kèm mật khẩu để xác thực trên Apps Script
            })
          });
          const result = await response.json();
          alert(result.message);
          // Tải lại dữ liệu sau khi reset
          await onRefreshData();
        } else {
          alert("Không tìm thấy liên kết Google Sheets!");
        }
      } catch (err) {
        alert("Lỗi khi thực hiện reset lịch sử giao dịch học thêm.");
      } finally {
        setSyncing(false);
      }
    }
  };
  const handleSave = async (syncCloud: boolean = false) => {
    if (!selectedClass) return;

    const newData = { ...data };
    const classSheet = newData.sheets[selectedClass];
    // Tìm cấu hình học phí cho lớp này (VD: Lop10.1)
    const feeConfig = data.fees.find(f => f.className === selectedClass);
    const currentFee = feeConfig ? feeConfig.fee : 0;
    const formattedDate = formatDateToDDMMYY(selectedDate);

    const studentsToSync = classSheet.students.map(student => {
    const studentKey = student.code ? student.code.trim() : ''; // 1807Sua
      const isPresent = attendanceMap[studentKey];
      const val = isPresent ? 1 : 0;
      
      const nextIdx = student.attendance.findIndex(v => v === null);
      if (nextIdx !== -1) {
        student.attendance[nextIdx] = val;
      } else {
        student.attendance[9] = val;
      }
      
      student.totalAmount = calculateTotal(student.attendance, currentFee);

      return {
        name: student.name,
        phoneNumber: student.phoneNumber,
        isPresent: isPresent,
        code: student.code || '',
        totalAmount: student.totalAmount,
        date: formattedDate 
      };
    });

    onUpdate(newData);

    if (syncCloud && data.sheetLink) {
      setSyncing(true);
      try {
        // Gửi chính xác selectedClass (Ví dụ: "Lop10.1") lên Script
        await syncAttendanceToSheet(data.sheetLink, selectedClass, studentsToSync);
        alert(`Đã lưu và điểm danh lớp "${selectedClass}" thành công!`);        
      } catch (err) {
        alert('Lỗi khi đồng bộ Cloud. Vui lòng thử lại.');
      } finally {
        setSyncing(false);
      }
    } else {
      alert('Đã lưu điểm danh cục bộ!');
    }
    
    setSelectedClass(selectedClass);
  };

  if (!isAuthorized) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-md max-w-md mx-auto border border-slate-100 flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <Lock size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Yêu cầu xác thực</h2>
        <p className="text-slate-500 text-center mb-6">Nhập mật khẩu Admin ô C2!</p>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nhập mật khẩu..."
          onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none mb-4"
        />
        <button 
  onClick={handleAuth} 
  disabled={isChecking}
  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
>
  {isChecking ? 'Đang xác thực...' : 'Xác nhận'}
</button>
      </div>
    );
  }

  // Lọc danh sách học sinh theo tìm kiếm
  const currentStudents = data.sheets[selectedClass]?.students || [];
  const filteredStudents = currentStudents.filter(s => {
  const nameStr = s.name ? String(s.name).toLowerCase() : '';
  const classStr = s.class ? String(s.class).toLowerCase() : '';
  const search = searchTerm.toLowerCase();  
  return nameStr.includes(search) || classStr.includes(search);
});

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 text-indigo-600">
          <CheckSquare /> Chọn lớp điểm danh hôm nay
        </h3>
        
        <div className="flex flex-wrap gap-3">
          {Object.keys(data.sheets)
            .filter(name => name.startsWith("Lop")) 
            .sort((a, b) => a.localeCompare(b, undefined, {numeric: true})) 
            .map(className => (
              <button
                key={className}
                onClick={() => handleSelectClass(className)}
                className={`px-6 py-3 rounded-xl font-bold transition-all border ${
                  selectedClass === className 
                  ? 'bg-indigo-600 text-white shadow-lg scale-105' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'
                }`}
              >
                {className.replace("Lop", "Lớp ")}
                <span className="ml-2 text-xs opacity-60">({data.sheets[className].students.length})</span>
              </button>
            ))}
        </div>
      </div>

      {selectedClass && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div>
              <h3 className="text-xl font-bold text-slate-800">{selectedClass.replace("Lop", "Lớp ")}</h3>
              <p className="text-sm text-slate-500">Sĩ số: {currentStudents.length} </p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm học sinh trong lớp..."
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm"
                />
              </div>
             {/* 2004Sua: Thay thế nút Refresh bằng nút Reset lịch sử giao dịch học thêm */}
              <button   
                onClick={handleResetTransactionKD}
                disabled={syncing}
                className="bg-rose-50 text-rose-600 px-4 py-2.5 rounded-xl font-bold hover:bg-rose-100 flex items-center gap-2 transition-all border border-rose-200"
                title="Reset lịch sử giao dịch học thêm"
              >
                {syncing ? <Loader2 size={14} className="animate-spin text-rose-500" /> : <RefreshCw size={14} />} 
                ResetTrans
              </button>
              
              {/* Ô CHỌN NGÀY LINH HOẠT TRƯỚC NÚT LƯU */}
              <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500">
                <Calendar size={18} className="text-indigo-500 mr-2" />
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="outline-none bg-transparent text-sm font-bold text-slate-700 cursor-pointer"
                />
              </div>

{/* Nút Lưu & Đồng bộ hiện tại của thầy */}
<button 
  onClick={() => handleSave(true)}
                  disabled={syncing || !data.sheetLink}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2 transition-all shadow-md shadow-emerald-100 disabled:opacity-50"
              >
                {syncing ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={18} />} 
                Save
              </button>
              {/* 1807Them: Nút xem điểm danh chi tiết từ cột A đến Q của thầy */}
<button 
  type="button"
  onClick={() => setShowDetailedTable(!showDetailedTable)}
  className={`px-5 py-2.5 rounded-xl font-extrabold flex items-center gap-2 transition-all border ${
    showDetailedTable 
    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-inner' 
    : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-100 active:scale-95'
  }`}
>
  <Eye size={16} />
  {showDetailedTable ? "Ẩn " : "Review"}
</button>
             {/* CỤM NÚT RESET THEO SỐ NGÀY LINH HOẠT */}
<div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
  <span className="text-xs font-bold text-slate-500 px-2">Reset:</span>
  <button 
    type="button"
    onClick={() => handleReset(1)}
    disabled={syncing}
    className="bg-white text-rose-600 hover:bg-rose-50 px-3 py-1.5 text-xs rounded-lg font-extrabold shadow-sm border border-slate-200/60 transition-all disabled:opacity-50"
  >
    1 Ngày
  </button>
  <button 
    type="button"
    onClick={() => handleReset(2)}
    disabled={syncing}
    className="bg-white text-rose-700 hover:bg-rose-100 px-3 py-1.5 text-xs rounded-lg font-extrabold shadow-sm border border-slate-200/60 transition-all disabled:opacity-50"
  >
    2 Ngày 
  </button>
</div>
            </div>
          </div>
{/* 1807Them: Bảng hiển thị thông tin điểm danh chi tiết từ cột A đến Q của lớp học */}
          {showDetailedTable && (() => {
            const classSheet = data.sheets[selectedClass];
            const headers = classSheet?.headers || [];
            
            // Hàm phân tích ngày từ header
            const parseHeaderDate = (header: string): { isDate: boolean; time: number; label: string } => {
              if (!header) return { isDate: false, time: Infinity, label: "" };
              const trimmed = header.trim();
              if (trimmed.startsWith("Ngày") || trimmed === "") {
                return { isDate: false, time: Infinity, label: "" };
              }
              // Kiểm tra xem header có khớp định dạng ngày (dd/mm/yy hoặc dd/mm/yyyy hoặc dd/mm) hay không
              const matchFull = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
              if (matchFull) {
                const day = parseInt(matchFull[1], 10);
                const month = parseInt(matchFull[2], 10);
                const year = parseInt(matchFull[3], 10);
                const fullYear = year < 100 ? 2000 + year : year;
                const date = new Date(fullYear, month - 1, day);
                return { 
                  isDate: true, 
                  time: date.getTime(), 
                  label: `${matchFull[1].padStart(2, '0')}/${matchFull[2].padStart(2, '0')}` 
                };
              }

              const matchShort = trimmed.match(/^(\d{1,2})\/(\d{1,2})/);
              if (matchShort) {
                const day = parseInt(matchShort[1], 10);
                const month = parseInt(matchShort[2], 10);
                const date = new Date(2026, month - 1, day);
                return { 
                  isDate: true, 
                  time: date.getTime(), 
                  label: `${matchShort[1].padStart(2, '0')}/${matchShort[2].padStart(2, '0')}` 
                };
              }
              // Trả về isDate: false nếu không phải ngày (ví dụ: B.1, B.2, Buổi 1...)
              return { isDate: false, time: Infinity, label: trimmed };
            };

            const columns = [...Array(10)].map((_, i) => {
              const headerVal = headers[i] || "";
              const parsed = parseHeaderDate(headerVal);
              return {
                originalIndex: i,
                isDate: parsed.isDate,
                time: parsed.time,
                label: parsed.label,
              };
            });

            // Lọc cột: CHỈ giữ lại các cột thực sự có dữ liệu điểm danh (có ít nhất 1 học sinh được tích 1 hoặc 0)
            const activeColumns = columns.filter(col => {
              return currentStudents.some(s => s.attendance && s.attendance[col.originalIndex] !== null);
            });

            // Sắp xếp cột: cột có ngày xếp lên đầu theo thứ tự tăng dần thời gian (cũ hơn -> mới hơn)
            const sortedColumns = [...activeColumns].sort((a, b) => {
              if (a.isDate && b.isDate) {
                return a.time - b.time; // Cũ trước, mới sau
              }
              if (a.isDate) return -1;
              if (b.isDate) return 1;
              return a.originalIndex - b.originalIndex;
            });

            return (
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 animate-in slide-in-from-top-4 duration-300">
                <div className="mb-4 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Bảng Điểm Danh Chi Tiết (Cột A - Q)
                    </h4>
                  </div>
                  <div className="flex gap-4 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9px] flex items-center justify-center rounded">✓</span> Có mặt</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-rose-100 border border-rose-200 text-rose-700 text-[9px] flex items-center justify-center rounded">✗</span> Vắng mặt</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-100 border border-slate-200 text-slate-400 text-[9px] flex items-center justify-center rounded">-</span> Chưa học</span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm max-h-[480px] scrollbar-thin scrollbar-thumb-slate-200">
                  <table className="w-full text-left border-collapse min-w-[1250px]">
                    <thead className="sticky top-0 bg-indigo-600 text-white text-xs uppercase tracking-wider font-extrabold z-10">
                      <tr>
                        <th className="px-4 py-3.5 border-b border-indigo-700 text-center w-10">STT</th>
                        <th className="px-5 py-3.5 border-b border-indigo-700 w-52 min-w-[208px]">Họ và Tên</th>
                        <th className="px-4 py-3.5 border-b border-indigo-700 text-center w-12">Lớp</th>                        
                        <th className="px-4 py-3.5 border-b border-indigo-700 text-center w-12">Mã HS</th>
                        {sortedColumns.map((col, colIdx) => (
                          <th key={col.originalIndex} className="px-2 py-2 border-b border-indigo-700 text-center w-16 min-w-[64px]">
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className="text-[11px] font-black text-white tracking-tight">{col.label}</span>
                              <span className="text-[9px] text-indigo-100 font-extrabold bg-indigo-800/80 px-1.5 py-0.5 rounded shadow-sm border border-indigo-500/30">
                                B.{colIdx + 1}
                              </span>
                            </div>
                          </th>
                        ))}
                        <th className="px-5 py-3.5 border-b border-indigo-700 text-right w-36">Học Phí</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentStudents.length > 0 ? (
                        currentStudents.map((s, idx) => (
                          <tr key={s.code || idx} className="hover:bg-indigo-50/20 transition-colors text-xs">
                            <td className="px-4 py-3 font-mono text-slate-400 text-center font-bold">
                              {s.stt < 10 ? `0${s.stt}` : s.stt}
                            </td>
                            <td className="px-5 py-3 font-bold text-slate-800 w-52 min-w-[208px]">{s.name}</td>
                            <td className="px-4 py-3 text-slate-600 font-medium">{s.class}</td>                            
                            <td className="px-4 py-3 font-mono font-black text-indigo-600">{s.code}</td>
                            {sortedColumns.map((col) => {
                              const val = s.attendance && s.attendance[col.originalIndex];
                              let cellBg = "bg-slate-50 text-slate-300 border-slate-200/60";
                              let symbol = "-";
                              if (val === 1) {
                                cellBg = "bg-emerald-50 text-emerald-600 border-emerald-200 font-bold";
                                symbol = "✓";
                              } else if (val === 0) {
                                cellBg = "bg-rose-50 text-rose-500 border-rose-200 font-bold";
                                symbol = "✗";
                              }
                              return (
                                <td key={col.originalIndex} className="px-2 py-3 text-center">
                                  <div className={`w-7 h-7 mx-auto flex items-center justify-center rounded-lg border text-xs ${cellBg}`}>
                                    {symbol}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="px-5 py-3 text-right font-mono font-black text-amber-600 bg-amber-50/20">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(s.totalAmount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7 + sortedColumns.length} className="px-6 py-12 text-center text-slate-400 italic">
                            Không có học sinh trong lớp học này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">STT</th>
                  <th className="px-6 py-4">Họ và Tên</th>
                  <th className="px-6 py-4">Lớp/Trường</th>
                  <th className="px-6 py-4">Mã học sinh</th>
                  <th className="px-6 py-4 text-center">Trạng thái điểm danh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => {
                   const key = student.code ? student.code.trim() : ''; // 1807Sua
                  const isPresent = attendanceMap[key];                  
                  return (
                    <tr key={key} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 text-slate-400 text-sm">{idx + 1}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{student.name}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700">{student.class}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-medium">{student.school}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">{student.code}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <button 
  onClick={() => toggleAttendance(key)}
  className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition-all border-2 ${
    isPresent 
    ? 'text-emerald-600 bg-emerald-50 border-emerald-100 shadow-sm shadow-emerald-50' 
    : 'text-rose-600 bg-rose-50 border-rose-100 shadow-sm shadow-rose-50 animate-in fade-in duration-200'
  }`}
>
  {isPresent ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
  {isPresent ? "CÓ MẶT" : "VẮNG MẶT"}
</button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic bg-white">
                      Không tìm thấy học sinh nào trong lớp này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceSection;
