
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Plus, FileSpreadsheet, Lock, Loader2, Download, Trash2 } from 'lucide-react';
import { AppData, Student } from '../types';
import { extractGradeFromClassName } from '../services/storage';
import { verifyAdminPassword } from './verifyadmin';

interface ImportSectionProps {
  data: AppData;
  onUpdate: (data: AppData) => void;
  //onRefreshData: () => Promise<void>;  
}

const ImportSection: React.FC<ImportSectionProps> = ({ data, onUpdate }) => {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [manualStudent, setManualStudent] = useState({
    name: 'Nguyễn Văn Hà Pro', class: '12A1', school: 'THPT Yên Dũng số 2', phoneNumber: '0988948882', note: '', code: 'HT1201' 
  });
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
 const handleClearData = () => {
  if (window.confirm("XÓA TOÀN BỘ học sinh?")) {
    const newData = { ...data };
    
    // Chỉ giữ lại tên lớp, xóa sạch mảng students
    Object.keys(newData.sheets).forEach(key => {
      newData.sheets[key].students = [];
    });
    onUpdate(newData);
    alert("Đã làm sạch danh sách nhưng vẫn giữ các lớp hiện tại!");    
  }
};
  const downloadTemplate = () => {
    const templateData = [
      { "STT": 1, "Họ và Tên": "Nguyễn Văn Hà Pro", "Lớp": "12A1", "Trường": "THPT Yên Dũng số 2", "Số điện thoại": "0988948882", "Lớp phụ": '', "Mã HS": 'HT1201' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachHocSinh");
    XLSX.writeFile(workbook, "Mau_Danh_Sach_Hoc_Sinh.xlsx");
  };
  const syncToCloud = async (students: any[]) => {
    if (!data.sheetLink) return;
    setSyncing(true);
    try {
      // SỬA: Bỏ mode: 'no-cors' và đổi Content-Type sang text/plain để né CORS của GAS
      const response = await fetch(data.sheetLink, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: "importStudents",
          data: students
        })
      });

      // Đọc thông báo phản hồi từ GAS gửi về
      const result = await response.json();

      
      // Nếu GAS ném ra thông báo lỗi (Lớp đầy 48 HS hoặc lỗi định dạng)
      // SỬA TẠI ĐÂY: Check chuẩn theo result.success hoặc ép result.message về chuỗi để kiểm tra
    if (!response.ok || !result.success || String(result.message).includes("Lỗi") || String(result.message).includes("giới hạn")) {
      alert(result.message || "Có lỗi xảy ra khi đồng bộ Cloud!");
      return;
    }
      alert("Đồng bộ danh sách học sinh lên Cloud thành công!");      
    } catch (err) {
      alert('Lỗi kết nối đồng bộ Cloud: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const processExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    const bstr = evt.target?.result;
    const wb = XLSX.read(bstr, { type: 'binary' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 'A' }) as any[];

    const updatedSheets = { ...data.sheets }; 
    const flatList: any[] = [];
    //let localAddedCount = 0; // Đếm số mống thực sự được nạp thêm vào máy

    jsonData.slice(1).forEach((row: any) => {
      const studentName = String(row['B'] || '').trim();
      // Thay vì viết: if (!studentName || studentName.includes("68686868"))
// Sửa thành ép kiểu chuỗi an toàn:
if (!studentName || String(studentName).includes("68686868")) return;

      const studentClass = String(row['C'] || '').trim();
      const noteValue = String(row['F'] || '').trim(); // Lớp phụ để điều hướng
      const studentCode = String(row['G'] || '').trim(); // Mã HS
      
      let gradeKey = noteValue !== "" ? noteValue : extractGradeFromClassName(studentClass);

      // Nếu lớp chưa có trong danh sách Local, tạo ngăn chứa mới
      if (!updatedSheets[gradeKey]) {
        updatedSheets[gradeKey] = { className: gradeKey, students: [] };
      }

      // --- 💥 LỌC TRÙNG NGAY TRÊN REACT THEO MÃ HỌC SINH ---
      const isDuplicate = updatedSheets[gradeKey].students.some(
        (s: any) => String(s.code).toLowerCase().trim() === studentCode.toLowerCase()
      );

      // Nếu mã học sinh này đã có trên máy rồi thì bỏ qua không nạp trùng nữa
      if (isDuplicate && studentCode !== "") return;

      // Khống chế trần 100 học sinh ngay trên giao diện Web để đồng bộ với GAS
      if (updatedSheets[gradeKey].students.length >= 100) return;

      const newStudent: Student = {
        stt: updatedSheets[gradeKey].students.length + 1, // Đánh số thứ tự nối tiếp chuẩn chỉ
        name: studentName,
        class: studentClass,
        school: String(row['D'] || '').trim(),
        phoneNumber: String(row['E'] || '').trim(),
        note: noteValue,
        code: studentCode || ('HS' + Date.now().toString().slice(-4)), // Phòng hờ nếu thiếu mã
        attendance: Array(10).fill(null),
        totalAmount: 0
      };

      updatedSheets[gradeKey].students.push(newStudent);
      
      // Đẩy vào mảng gửi lên Cloud kèm biến note để lệnh GAS phân loại Sheet
      flatList.push({
        name: newStudent.name,
        class: newStudent.class,
        school: newStudent.school,
        phoneNumber: newStudent.phoneNumber,
        note: newStudent.note, 
        code: newStudent.code
      });
    });
    
    // Cập nhật AppData mới và lưu thẳng vào LocalStorage
    const newData = { ...data, sheets: updatedSheets };
    localStorage.setItem('hocphi_data', JSON.stringify(newData));
    onUpdate(newData);

    // Hỏi đồng bộ Cloud
    if (data.sheetLink && window.confirm(`Đã nhận học sinh mới vào máy. Cập nhật Cloud ngay không thầy?`)) {
      await syncToCloud(flatList);
    }
  };
  
  reader.readAsBinaryString(file);
  e.target.value = '';
};
  // Thêm học sinh thủ công
const handleManualAdd = async () => {
  setManualStudent({ name: 'Nguyễn Văn Hà Pro', class: '12A1', school: 'THPT Yên Dũng số 2', phoneNumber: '0988948882', note: '', code: 'HT1201' });
  if (!manualStudent.name || !manualStudent.class || !manualStudent.code) {
    alert('Vui lòng nhập tên, lớp và mã học sinh!');
    return;
  }

  const noteValue = (manualStudent.note || "").trim();
  const gradeKey = noteValue !== "" ? noteValue : extractGradeFromClassName(manualStudent.class);

  const newData = { ...data };
  
  if (!newData.sheets[gradeKey]) {
    newData.sheets[gradeKey] = { className: gradeKey, students: [] };
  }
  // 1807Them: Kiểm tra trùng mã học sinh cục bộ trước khi thêm thủ công
  const isDuplicate = newData.sheets[gradeKey].students.some(
    (s: Student) => String(s.code).toLowerCase().trim() === manualStudent.code.toLowerCase().trim()
  );
  if (isDuplicate) {
    alert(`Mã học sinh ${manualStudent.code} đã tồn tại trong lớp này rồi thầy nhé!`); // 1807Them
    return;
  }

  const newStudent: Student = {
    stt: newData.sheets[gradeKey].students.length + 1,
    name: manualStudent.name,
    class: manualStudent.class,
    school: manualStudent.school,
    phoneNumber: manualStudent.phoneNumber,
    note: manualStudent.note || '',
    code: manualStudent.code,
    attendance: Array(10).fill(null),
    totalAmount: 0
  };

  newData.sheets[gradeKey].students.push(newStudent);
  
  // Lưu vào LocalStorage của Web trước
  localStorage.setItem('hocphi_data', JSON.stringify(newData));   
  onUpdate(newData);

  // setManualStudent({ name: '', class: '', school: '', phoneNumber: '', note: '' });
  
  // ĐỒNG BỘ CLOUD THÔNG MINH: Chỉ gửi đúng 1 học sinh này lên nối đuôi
  if (data.sheetLink && window.confirm(`Đã thêm ${newStudent.name} vào máy. Đồng bộ lên Google Sheets ngay không thầy?`)) {
    setSyncing(true);
    try {
      // 1. SỬA: Bỏ hẳn mode: 'no-cors' để React đọc được trạng thái phản hồi từ Web App GAS
      const response = await fetch(data.sheetLink, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Dùng text/plain để né CORS của GAS rất mượt
        body: JSON.stringify({
          action: "addManualStudent",
          data: {
            ...newStudent,
            targetSheet: gradeKey
          }
        })
      });

      // 2. SỬA: Đọc nội dung phản hồi từ GAS gửi về
      // 2. SỬA: Chuyển sang đọc JSON từ GAS trả về thay vì đọc text()
      if (!response.ok) {
        alert("Lỗi kết nối Server mạng!");
        return;
      }

      const result = await response.json(); // Đọc dữ liệu JSON xịn từ GAS
      
      // Hiện thông báo trực tiếp từ GAS (Dù thành công hay thất bại vì vượt quá 48 HS)
      alert(result.message);

      if (!result.success) {
        // Nếu thất bại (ví dụ lớp đầy 48 người), có thể xử lý thêm logic tại đây nếu cần
        return;
      }
      
    } catch (err: any) {
      // 3. SỬA: Ép kiểu any cho err để gọi err.message không bị báo lỗi TypeScript
      alert("Lỗi kết nối mạng: " + err.message);
    } finally {
      setSyncing(false);
    }
  }
};

  if (!isAuthorized) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-md max-w-md mx-auto border border-slate-100 flex flex-col items-center">
        <Lock className="text-amber-500 mb-4" size={32} />
        <h2 className="text-xl font-bold text-slate-800 mb-6">Xác thực quyền nhập liệu</h2>
        <p className="text-slate-500 text-center mb-6">Mật khẩu Admin ô C2!</p>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu Admin..."
          onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none mb-4 focus:ring-2 focus:ring-indigo-500"
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100">
        <p className="text-sm text-red-800 italic font-medium">Lưu ý: Tất cả HS(kể cả HS cũ) chỉ ghi vào 1 sheet file mẫu và đủ thông tin nhé! Giới hạn mỗi lớp 100 HS</p>
        <button 
          onClick={handleClearData}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100 text-sm font-bold shadow-sm"
        >
          <Trash2 size={16} /> Làm sạch danh sách
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="text-indigo-500" /> Nhập từ Excel
            </h3>
            <button onClick={downloadTemplate} className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:text-indigo-800">
              <Download size={16} /> Tải mẫu Excel
            </button>
          </div>
          <div className="border-3 border-dashed border-slate-100 rounded-3xl p-10 flex flex-col items-center bg-slate-50/50 hover:bg-indigo-50/30 transition-all">
            {syncing ? (
              <Loader2 className="animate-spin text-indigo-500" size={40} />
            ) : (
              <>
                <div className="w-20 h-20 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                   <Upload size={40} />
                </div>
                <input type="file" accept=".xlsx, .xls" onChange={processExcel} className="hidden" id="excel-upload" />
                <label htmlFor="excel-upload" className="cursor-pointer bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Chọn tệp danh sách</label>
                <p className="text-xs text-slate-400 mt-4 font-medium">Hỗ trợ các khối: 1,2,...,11,12</p>

                {/* 💥 KHU VỰC THÊM MỚI: Hiện sĩ số hiện tại của các lớp */}
                <div className="mt-6 w-full border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-slate-500 mb-2 text-center">Sĩ số hiện tại trên Cloud:</p>
                  <div className="flex flex-wrap justify-center gap-2 max-h-[120px] overflow-y-auto px-2">
                    {data?.sheets && Object.keys(data.sheets)
                      .filter(cls => cls.startsWith("Lop"))
                      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                      .map(cls => {
                        const count = data.sheets[cls]?.studentCount || 0;
                        return (
                          <div 
                            key={cls} 
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              count >= 100 
                                ? 'bg-red-50 text-red-600 border-red-100' 
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {cls.replace("Lop", "Lớp ")}: <span className="font-bold">{count}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
    <Plus className="text-emerald-500" /> Thêm học sinh thủ công
  </h3>
  <div className="space-y-4">
    {/* Họ và tên */}
    <div>
       <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Họ và tên</label>
       <input 
        type="text" placeholder="Nguyễn Văn Hà Pro" value={manualStudent.name}
        onChange={(e) => setManualStudent({...manualStudent, name: e.target.value})}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50/50"
       />
    </div>

    <div className="grid grid-cols-3 gap-4">
      {/* Lớp */}
      <div>
         <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Lớp (VD: 12A1)</label>
         <input 
          type="text" placeholder="12A1" value={manualStudent.class}
          onChange={(e) => setManualStudent({...manualStudent, class: e.target.value})}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50/50"
         />
      </div>
      {/* Số điện thoại */}
      <div>
         <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Số điện thoại</label>
         <input 
          type="text" placeholder="0988948882" value={manualStudent.phoneNumber}
          onChange={(e) => setManualStudent({...manualStudent, phoneNumber: e.target.value})}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50/50"
         />
      </div>
       {/* Mã học sinh */}
      <div>
         <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Mã học sinh</label>
         <input 
          type="text" placeholder="HS01" value={manualStudent.code}
          onChange={(e) => setManualStudent({...manualStudent, code: e.target.value})}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50/50"
         />
      </div>
    </div>

    {/* Trường học */}
    <div>
      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Trường học</label>
      <input 
        type="text" placeholder="THPT Chuyên..." value={manualStudent.school}
        onChange={(e) => setManualStudent({...manualStudent, school: e.target.value})}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50/50"
      />
    </div>

   {/* PHẦN THÊM MỚI: Ghi chú / Nhóm lớp */}
    <div>
      <label className="text-xs font-bold text-indigo-500 uppercase mb-1 block flex justify-between">
        Ghi chú (Tên Sheet riêng để lưu.Hệ thống tự tạo nếu chưa có)
        <span className="text-[9px] text-slate-400 normal-case font-normal italic">* Ví dụ: Lop10.1</span>
      </label>
      <input 
        type="text" 
        placeholder="Để trống nếu thuộc sheet mặc định hệ thống admin" 
        value={manualStudent.note || ''}
        onChange={(e) => setManualStudent({...manualStudent, note: e.target.value})}
        className="w-full px-4 py-3 rounded-xl border border-indigo-100 focus:ring-2 focus:ring-indigo-500 outline-none bg-indigo-50/30 font-bold text-indigo-600 placeholder:font-normal"
      />
    </div>

    {/* 1. Sổ chọn danh sách trường */}
    <div className="pt-2">
      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Chọn trường học nhanh</label>
      <select 
        value={
          ["THPT Yên Dũng số 2", "THPT Yên Dũng số 1", "THPT Yên Dũng số 3", "THCS Xuân Phú"].includes(manualStudent.school) 
          ? manualStudent.school 
          : (manualStudent.school === "" ? "" : "other")
        }
        onChange={(e) => {
          const val = e.target.value;
          if (val === "other") {
            setManualStudent({...manualStudent, school: "Trường khác"}); 
          } else {
            setManualStudent({...manualStudent, school: val});
          }
        }}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50/50"
      >
        <option value="">-- Chọn trường của bạn --</option>
        <option value="THPT Yên Dũng số 2">THPT Yên Dũng số 2</option>
        <option value="THPT Yên Dũng số 1">THPT Yên Dũng số 1</option>
        <option value="THPT Yên Dũng số 3">THPT Yên Dũng số 3</option>
        <option value="THCS Xuân Phú">THCS Xuân Phú</option>
        <option value="other">Trường khác...</option>
      </select>
    </div>

    {/* 2. Ô nhập tay trường khác */}
    {(!["THPT Yên Dũng số 2", "THPT Yên Dũng số 1", "THPT Yên Dũng số 3", "THCS Xuân Phú", ""].includes(manualStudent.school) || manualStudent.school === "Trường khác") && (
      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
        <input 
          type="text" 
          placeholder="Nhập tên trường của bạn..." 
          value={manualStudent.school === "Trường khác" ? "" : manualStudent.school}
          onChange={(e) => setManualStudent({...manualStudent, school: e.target.value})}
          className="w-full px-4 py-3 rounded-xl border-2 border-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none bg-white shadow-inner"
          autoFocus
        />
        <p className="text-[10px] text-emerald-600 mt-1 ml-1 font-medium italic">* Thầy cô vui lòng nhập đầy đủ tên trường.</p>
      </div>
    )}

    {/* Nút bấm lưu học sinh */}
    <button 
      onClick={handleManualAdd} 
      className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 mt-2"
    >
      Thêm và cập nhật
    </button>
  </div> {/* Đóng space-y-4 */}
</div> {/* Đóng khung trắng bg-white p-6 */}
      </div> 
    </div>
  );
};

export default ImportSection;
