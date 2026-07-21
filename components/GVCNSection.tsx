import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  Search, Users, Landmark, FileSpreadsheet, Lock, Loader2, Download, Trash2, 
  Plus, Edit, ArrowLeftRight, CheckCircle, RefreshCw, X, Save 
} from 'lucide-react';
import { AppData, Student } from '../types';
import { verifyAdminPassword } from './verifyadmin';

interface GVCNSectionProps {
  data: AppData;
  onUpdate: (data: AppData) => void;
  onRefreshData?: () => Promise<void>;
}

const GVCNSection: React.FC<GVCNSectionProps> = ({ data, onUpdate, onRefreshData }) => {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [adminPassword, setAdminPassword] = useState(''); // Lưu trữ mật khẩu để thực hiện các thao tác sau đó

  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // State cho Modal Thêm/Sửa học sinh
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formStudent, setFormStudent] = useState({
    name: '',
    class: '',
    code: '',
    totalAmount: 0,
    note: '',
    totalPaid: 0
  });

  // Lấy danh sách học sinh GVCN từ AppData
  const gvcnSheet = data.sheets['GVCN'];
  const studentsList: Student[] = gvcnSheet?.students || [];

  // Tìm kiếm, lọc danh sách
  const filteredStudents = studentsList.filter(s => {
    const searchLower = searchTerm.toLowerCase().trim();
    return (
      (s.name && String(s.name).toLowerCase().includes(searchLower)) ||
      (s.code && String(s.code).toLowerCase().includes(searchLower)) ||
      (s.class && String(s.class).toLowerCase().includes(searchLower)) ||
      (s.note && String(s.note).toLowerCase().includes(searchLower))
    );
  });

  // Tính toán thống kê
  const totalStudents = studentsList.length;
  const totalCollected = studentsList.reduce((sum, s) => sum + (s.totalPaid || 0), 0);
  const averageAmount = totalStudents > 0 ? Math.round(totalCollected / totalStudents) : 0;
  const withPaymentCount = studentsList.filter(s => (s.totalPaid || 0) > 0).length;

  // Xác thực mật khẩu
  const handleAuth = async () => {
    if (!password.trim()) {
      alert('Vui lòng nhập mật khẩu!');
      return;
    }
    setIsChecking(true);
    try {
      if (data.sheetLink) {
        const result = await verifyAdminPassword(data.sheetLink, password);
        if (result.success) {
          setIsAuthorized(true);
          setAdminPassword(password);
          alert(result.message);
        } else {
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

  // Tải mẫu Excel
  const downloadTemplate = () => {
    const templateData = [
      { "STT": 1, "Họ và Tên": "Nguyễn Văn Hà Pro", "Lớp": "12A1", "Mã HS": "CN1201", "Số tiền nộp": 150000, "Ghi chú": "Nộp quỹ lớp đợt 1", "Tổng nộp": "" }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachGVCN");
    XLSX.writeFile(workbook, "Mau_Danh_Sach_GVCN.xlsx");
  };

  // Nhập Excel thay thế hoàn toàn
  const processExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("CẢNH BÁO: Nhập danh sách mới từ Excel sẽ THAY THẾ TOÀN BỘ dữ liệu học sinh lớp GVCN hiện tại trên Google Sheets. Bạn có chắc chắn muốn tiếp tục?")) {
      e.target.value = '';
      return;
    }

    setSyncing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 'A' }) as any[];

        const importedStudents: any[] = [];
        jsonData.slice(1).forEach((row: any) => {
          const studentName = String(row['B'] || '').trim();
          if (!studentName || studentName.includes("68686868")) return;

          importedStudents.push({
            name: studentName,
            class: String(row['C'] || '').trim(),
            code: String(row['D'] || '').trim(),
            totalAmount: Number(row['E']) || 0,
            note: String(row['F'] || '').trim(),
            totalPaid: Number(row['G']) || Number(row['E']) || 0
          });
        });

        if (importedStudents.length === 0) {
          alert("Không tìm thấy dữ liệu học sinh hợp lệ trong tệp Excel!");
          setSyncing(false);
          return;
        }

        // Gọi API GAS để thay thế hoàn toàn
        if (data.sheetLink) {
          const response = await fetch(data.sheetLink, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: "importGVCN",
              data: importedStudents,
              password: adminPassword
            })
          });

          const result = await response.json();
          if (result.success) {
            alert(result.message || "Nhập danh sách GVCN thành công!");
            if (onRefreshData) {
              await onRefreshData();
            } else {
              window.location.reload();
            }
          } else {
            alert(result.message || "Lỗi khi lưu danh sách lên Google Sheets!");
          }
        } else {
          alert("Không tìm thấy liên kết Google Sheets!");
        }
      } catch (err: any) {
        alert("Lỗi xử lý Excel: " + err.message);
      } finally {
        setSyncing(false);
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Mở modal thêm mới
  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormStudent({
      name: '',
      class: '',
      code: '',
      totalAmount: 0,
      note: '',
      totalPaid: 0
    });
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormStudent({
      name: student.name || '',
      class: student.class || '',
      code: student.code || '',
      totalAmount: student.totalAmount || 0,
      note: student.note || '',
      totalPaid: student.totalPaid || 0
    });
    setIsModalOpen(true);
  };

  // Xử lý lưu form Thêm/Sửa
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudent.name.trim() || !formStudent.code.trim()) {
      alert("Vui lòng điền đầy đủ Họ tên và Mã học sinh!");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!data.sheetLink) {
        alert("Không tìm thấy liên kết Google Sheets!");
        setIsSubmitting(false);
        return;
      }

      let response;
      if (editingStudent) {
        // Cập nhật
        response = await fetch(data.sheetLink, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: "updateGVCNStudent",
            oldCode: editingStudent.code,
            student: {
              name: formStudent.name,
              class: formStudent.class,
              code: formStudent.code,
              totalAmount: Number(formStudent.totalAmount) || 0,
              note: formStudent.note,
              totalPaid: Number(formStudent.totalPaid) || 0
            },
            password: adminPassword
          })
        });
      } else {
        // Thêm mới
        response = await fetch(data.sheetLink, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: "addGVCNStudent",
            student: {
              name: formStudent.name,
              class: formStudent.class,
              code: formStudent.code,
              totalAmount: Number(formStudent.totalAmount) || 0,
              note: formStudent.note,
              totalPaid: Number(formStudent.totalPaid) || 0
            },
            password: adminPassword
          })
        });
      }

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        setIsModalOpen(false);
        if (onRefreshData) {
          await onRefreshData();
        } else {
          window.location.reload();
        }
      } else {
        alert(result.message || "Thao tác thất bại!");
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa học sinh
  const handleDeleteStudent = async (student: Student) => {
    const confirm = window.confirm(`Bạn có chắc chắn muốn xóa học sinh [ ${student.name} ] ra khỏi danh sách GVCN?`);
    if (!confirm) return;

    setIsSubmitting(true);
    try {
      if (data.sheetLink) {
        const response = await fetch(data.sheetLink, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: "deleteGVCNStudent",
            code: student.code,
            password: adminPassword
          })
        });

        const result = await response.json();
        if (result.success) {
          alert(result.message);
          if (onRefreshData) {
            await onRefreshData();
          } else {
            window.location.reload();
          }
        } else {
          alert(result.message || "Xóa học sinh thất bại!");
        }
      } else {
        alert("Không tìm thấy liên kết Google Sheets!");
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // resetgvcn: Reset cột Số tiền nộp (Cột E) về 0 để kiểm soát lần nộp mới, cột tổng nộp giữ nguyên
  const handleResetGVCN = async () => {
    const confirm = window.confirm(
      "CẢNH BÁO: Bạn có chắc chắn muốn resetgvcn? Hành động này sẽ XÓA TOÀN BỘ dữ liệu đúng 1 cột là cột số tiền nộp (cột E) của tất cả học sinh lớp GVCN để kiểm soát lần nộp mới (cột tổng nộp vẫn còn nguyên vẹn)!"
    );
    if (!confirm) return;

    setIsSubmitting(true);
    try {
      if (data.sheetLink) {
        const response = await fetch(data.sheetLink, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: "resetGVCN",
            password: adminPassword
          })
        });

        const result = await response.json();
        if (result.success) {
          alert(result.message);
          if (onRefreshData) {
            await onRefreshData();
          } else {
            window.location.reload();
          }
        } else {
          alert(result.message || "Reset cột Số tiền nộp thất bại!");
        }
      } else {
        alert("Không tìm thấy liên kết Google Sheets!");
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Giao diện khóa xác thực quyền
  if (!isAuthorized) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-md max-w-md mx-auto border border-slate-100 flex flex-col items-center">
        <Lock className="text-indigo-600 mb-4 animate-pulse" size={36} />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Hệ thống Lớp Chủ nhiệm</h2>
        <p className="text-xs text-slate-500 text-center mb-6">
          Nhập mật khẩu Admin ô C2!
        </p>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nhập mật khẩu Admin..."
          onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none mb-4 focus:ring-2 focus:ring-indigo-500 text-center font-bold text-slate-700 placeholder:font-normal"
        />
        <button 
          onClick={handleAuth} 
          disabled={isChecking}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isChecking ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Đang xác thực...</span>
            </>
          ) : (
            <span>Xác nhận truy cập</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Stat cards banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-bold uppercase">Sĩ số lớp</span>
            <span className="text-xl font-black text-slate-800">{totalStudents} học sinh</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Landmark size={24} />
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-bold uppercase">Tổng quỹ đã thu</span>
            <span className="text-xl font-black text-emerald-600">{formatCurrency(totalCollected)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ArrowLeftRight size={24} />
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-bold uppercase">Bình quân nộp</span>
            <span className="text-xl font-black text-slate-800">{formatCurrency(averageAmount)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-bold uppercase">Số HS đã đóng tiền</span>
            <span className="text-xl font-black text-amber-600">{withPaymentCount} / {totalStudents} HS</span>
          </div>
        </div>
      </div>

      {/* 2. Controls and Search */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={handleOpenAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm shadow-indigo-100"
          >
            <Plus size={16} />
            Thêm học sinh
          </button>

          <button
            onClick={downloadTemplate}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <Download size={16} />
            Mẫu Excel GVCN
          </button>

          <div className="relative">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={processExcel} 
              className="hidden" 
              id="gvcn-excel-upload" 
              disabled={syncing}
            />
            <label 
              htmlFor="gvcn-excel-upload" 
              className={`cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm ${syncing ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {syncing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={16} />
              )}
              Nhập Excel GVCN
            </label>
          </div>

          {/* resetgvcn: Nút Reset nộp tiền lớp chủ nhiệm */}
          <button
            onClick={handleResetGVCN}
            disabled={isSubmitting || syncing}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            title="Xóa cột số tiền nộp (cột E) của lớp GVCN"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Reset nộp tiền 
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-200 transition-all flex items-center justify-center shadow-sm"
              title="Làm mới dữ liệu từ Google Sheets"
            >
              <RefreshCw size={18} />
            </button>
          )}

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Tìm kiếm học sinh GVCN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* 3. Students Table / Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase">
                <th className="py-4 px-6 w-16 text-center">STT</th>
                <th className="py-4 px-6">Họ và Tên</th>
                <th className="py-4 px-6 w-28">Lớp</th>
                <th className="py-4 px-6 w-36">Mã HS (Quét QR)</th>
                <th className="py-4 px-6 text-right w-44">Lần nộp mới nhất</th>
                <th className="py-4 px-6">Ghi chú giao dịch</th>
                <th className="py-4 px-6 text-right w-44">Tổng nộp</th>
                <th className="py-4 px-6 w-28 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student, idx) => (
                  <tr key={student.code || idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-center font-mono text-xs text-slate-400">{student.stt || idx + 1}</td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-800">{student.name}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold font-mono">
                        {student.class || 'GVCN'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-xs font-bold font-mono">
                        {student.code || 'Chưa cấp'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className={`font-bold text-base ${student.totalAmount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {formatCurrency(student.totalAmount || 0)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500 max-w-xs truncate" title={student.note}>
                      {student.note || '---'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className={`font-bold text-base ${student.totalPaid && student.totalPaid > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {formatCurrency(student.totalPaid || 0)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(student)}
                          disabled={isSubmitting}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Sửa thông tin học sinh"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student)}
                          disabled={isSubmitting}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa khỏi danh sách"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-400">
                    <Users size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-medium">Chưa có học sinh lớp GVCN hoặc không tìm thấy kết quả phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1">Vui lòng nhập tệp Excel mẫu để nạp danh sách học sinh ban đầu</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL THÊM / SỬA HỌC SINH */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">
                {editingStudent ? 'Cập nhật học sinh GVCN' : 'Thêm mới học sinh GVCN'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 overflow-y-auto">
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Họ và tên *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={formStudent.name}
                  onChange={(e) => setFormStudent({...formStudent, name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Lớp học</label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: 12A1"
                    value={formStudent.class}
                    onChange={(e) => setFormStudent({...formStudent, class: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Mã học sinh *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ví dụ: CN1201"
                    disabled={!!editingStudent} // Không cho phép đổi mã học sinh khi đang sửa
                    value={formStudent.code}
                    onChange={(e) => setFormStudent({...formStudent, code: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Lần nộp mới nhất (VNĐ)</label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={formStudent.totalAmount || ''}
                    onChange={(e) => setFormStudent({...formStudent, totalAmount: Number(e.target.value) || 0})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Tổng nộp tích lũy (VNĐ)</label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={formStudent.totalPaid || ''}
                    onChange={(e) => setFormStudent({...formStudent, totalPaid: Number(e.target.value) || 0})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Ghi chú</label>
                <textarea 
                  placeholder="Ví dụ: Đã đóng tiền bảo hiểm thân thể, quỹ lớp kỳ 1..."
                  value={formStudent.note}
                  onChange={(e) => setFormStudent({...formStudent, note: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>Lưu thông tin</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default GVCNSection;
