import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Sparkles, 
  BrainCircuit, 
  FileSpreadsheet, 
  Upload, 
  Zap, 
  Loader2, 
  Download, 
  Trash2, 
  Search, 
  User, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Printer, 
  Copy, 
  FileText,
  Calendar,
  Layers,
  Award,
  BookOpen
} from 'lucide-react';
import { AppData } from '../types';
import { 
  GeminiStudentData, 
  analyzeSingleStudent, 
  analyzeClassGeneral 
} from '../services/geminiService';

interface GeminiSectionProps {
  data: AppData;
}

// Bộ phân giải Markdown đơn giản, an toàn và trực quan cho giao diện tiếng Việt
const CustomMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  return (
    <div className="space-y-4 text-slate-700">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        // Xử lý tiêu đề chính ### hoặc #, ##
        if (trimmed.startsWith('###') || trimmed.startsWith('##') || trimmed.startsWith('#')) {
          const title = trimmed.replace(/^#+\s*/, '');
          return (
            <h4 key={index} className="text-lg font-bold text-indigo-950 border-b border-indigo-100 pb-2 mt-6 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></span>
              {title}
            </h4>
          );
        }

        // Xử lý list item -
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const content = trimmed.replace(/^[-*]\s*/, '');
          return (
            <div key={index} className="flex items-start gap-2 pl-4 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
              <span className="text-sm md:text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: formatBold(content) }} />
            </div>
          );
        }

        // Dòng rỗng
        if (trimmed === '') {
          return <div key={index} className="h-2" />;
        }

        // Dòng văn bản bình thường
        return (
          <p key={index} className="text-sm md:text-base leading-relaxed text-justify" 
             dangerouslySetInnerHTML={{ __html: formatBold(trimmed) }} />
        );
      })}
    </div>
  );
};

// Định dạng thẻ **bold** trong chuỗi
const formatBold = (text: string): string => {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-900">$1</strong>');
};

const GeminiSection: React.FC<GeminiSectionProps> = ({ data }) => {
  const [model, setModel] = useState<string>('gemini-3.5-flash');
  const [students, setStudents] = useState<GeminiStudentData[]>([]);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  // Lưu trữ kết quả phân tích theo từng học viên để tránh tải lại vô ích
  const [individualReviews, setIndividualReviews] = useState<{ [key: string]: string }>({});
  const [reviewLoading, setReviewLoading] = useState<{ [key: string]: boolean }>({});
  
  // Báo cáo tổng hợp toàn bộ lớp
  const [classReport, setClassReport] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<GeminiStudentData | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mẫu file Excel đầy đủ thông tin hỗ trợ Thầy Cô import
  const downloadTemplate = () => {
    const templateData = [
      {
        "STT": 1,
        "Họ và Tên": "Nguyễn Văn Hà Pro",
        "Lớp": "12A1",
        "Mã HS": "HS1201",
        "Số buổi": 9,
        "Điểm bài 1": 8.5,
        "Điểm bài 2": 9.0,
        "Điểm bài 3": 8.0,
        "Điểm bài 4": null,
        "Điểm bài 5": null,
        "Điểm bài 6": null
      },
      {
        "STT": 2,
        "Họ và Tên": "Lê Mai Chi",
        "Lớp": "11B2",
        "Mã HS": "HS1102",
        "Số buổi": 5,
        "Điểm bài 1": 5.0,
        "Điểm bài 2": 6.5,
        "Điểm bài 3": 7.0,
        "Điểm bài 4": 7.5,
        "Điểm bài 5": null,
        "Điểm bài 6": null
      },
      {
        "STT": 3,
        "Họ và Tên": "Phạm Quốc Bảo",
        "Lớp": "10C1",
        "Mã HS": "HS1003",
        "Số buổi": 3,
        "Điểm bài 1": 4.5,
        "Điểm bài 2": 5.0,
        "Điểm bài 3": null,
        "Điểm bài 4": null,
        "Điểm bài 5": null,
        "Điểm bài 6": null
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachHocSinh_Gemini");
    XLSX.writeFile(workbook, "Mau_Danh_Sach_Phan_Tich_Gemini.xlsx");
  };

  // Chuẩn hoá và mapping cột linh hoạt
  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dataBytes = e.target?.result;
        const workbook = XLSX.read(dataBytes, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonRows.length === 0) {
          alert("File Excel trống hoặc không đúng định dạng!");
          return;
        }

        const parsed: GeminiStudentData[] = jsonRows.map((row, idx) => {
          // Trích xuất linh hoạt dựa trên so khớp tiêu đề cột không phân biệt chữ hoa/thường, khoảng trắng
          const findVal = (prefixes: string[]) => {
            const foundKey = Object.keys(row).find(key => 
              prefixes.some(p => key.toLowerCase().trim().replace(/\s+/g, '').includes(p.toLowerCase().replace(/\s+/g, '')))
            );
            return foundKey ? row[foundKey] : null;
          };

          const stt = Number(findVal(['stt', 'sothutu'])) || (idx + 1);
          const name = String(findVal(['hoten', 'hovaten', 'tenhocsinh', 'ten']) || '').trim();
          const className = String(findVal(['lop', 'class']) || '').trim();
          const studentCode = String(findVal(['mahs', 'ma_hs', 'mahocsinh', 'maso', 'code']) || `HS${1000 + idx}`).trim();
          const sessions = Number(findVal(['sobuoi', 'buoi', 'sobuoihoc', 'dihoc'])) || 0;

          // Đọc 6 bài kiểm tra
          const grades: { [key: string]: number | null } = {};
          for (let i = 1; i <= 6; i++) {
            const rawScore = findVal([`diembai${i}`, `bai${i}`, `test${i}`, `đợt${i}`]);
            const numScore = rawScore !== null && rawScore !== undefined && rawScore !== "" ? Number(rawScore) : null;
            grades[`Bài ${i}`] = (numScore !== null && !isNaN(numScore)) ? numScore : null;
          }

          return {
            stt,
            name: name || `Học sinh ẩn danh ${idx + 1}`,
            className: className || "Chưa rõ lớp",
            studentCode,
            sessions: Math.min(Math.max(sessions, 0), 10), // Giới hạn /10 buổi
            grades
          };
        }).filter(item => item.name !== "");

        setStudents(parsed);
        setIndividualReviews({});
        setClassReport(null);
        setSelectedStudent(null);
      } catch (err) {
        alert("Có lỗi xảy ra khi đọc file Excel: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Trình xử lý sự kiện Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseExcelFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Phân tích đơn lẻ học sinh bằng AI
  const handleAnalyzeSingle = async (student: GeminiStudentData) => {
    setReviewLoading(prev => ({ ...prev, [student.studentCode]: true }));
    try {
      const responseText = await analyzeSingleStudent(student, model);
      setIndividualReviews(prev => ({ ...prev, [student.studentCode]: responseText }));
      
      // Đồng thời cập nhật trạng thái học sinh được chọn để hiển thị modal chi tiết ngay lập tức
      setSelectedStudent(student);
    } catch (err) {
      alert("Lỗi phân tích: " + err.message);
    } finally {
      setReviewLoading(prev => ({ ...prev, [student.studentCode]: false }));
    }
  };

  // Phân tích tổng quan cả lớp
  const handleAnalyzeClass = async () => {
    if (students.length === 0) return;
    setLoading(true);
    setClassReport(null);
    try {
      const responseText = await analyzeClassGeneral(students, model);
      setClassReport(responseText);
    } catch (err) {
      alert("Lỗi khi tạo báo cáo cả lớp: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Lọc danh sách theo từ khóa tìm kiếm
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.className.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Tính trung bình chuyên cần và tỉ lệ thi bài
  const totalAttendanceRate = students.length > 0 
    ? (students.reduce((acc, s) => acc + s.sessions, 0) / students.length).toFixed(1) 
    : "0";

  // Đếm số bài kiểm tra có điểm (active grades)
  const getActiveGradesCount = (student: GeminiStudentData) => {
    return Object.values(student.grades).filter(v => v !== null && v !== undefined).length;
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã sao chép nhận xét của AI vào bộ nhớ tạm!");
  };

  const handlePrint = (studentName: string) => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* HEADER BANNER SANG TRỌNG */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 p-8 md:p-12 rounded-3xl text-white shadow-xl shadow-indigo-100">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative flex flex-col md:flex-row items-center gap-8 justify-between">
          <div className="flex-1 text-center md:text-left space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-yellow-300 border border-white/10">
              <Sparkles size={14} /> Công nghệ Generative AI tiên tiến
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Trợ Lý Trí Tuệ Nhân Tạo Gemini
            </h2>
            <p className="text-indigo-100 text-base md:text-lg max-w-2xl font-light">
              Dễ dàng tải lên file Excel điểm kiểm tra của học sinh. AI sẽ tự động phân tích tỷ lệ đi học, kết quả điểm 6 đợt thi, chỉ ra các chuyển biến và đưa ra lời khuyên giáo dục cá nhân hóa xuất sắc nhất.
            </p>
          </div>
          <div className="w-28 h-28 bg-white/15 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-inner shrink-0">
            <BrainCircuit size={56} className="text-yellow-200 animate-pulse" />
          </div>
        </div>
      </div>

      {/* THANH ĐIỀU KHIỂN & CẤU HÌNH */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full md:w-auto">
          <label className="text-sm font-bold text-slate-700 whitespace-nowrap flex items-center gap-2">
            <Layers size={18} className="text-indigo-600" /> Chọn mô hình Gemini:
          </label>
          <select 
            value={model} 
            onChange={(e) => setModel(e.target.value)}
            className="w-full md:w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="gemini-3.5-flash">💫 Gemini 3.5 Flash (Nhanh & Chuẩn)</option>
            <option value="gemini-3.1-pro-preview">🧠 Gemini 3.1 Pro (Phân tích chuyên sâu)</option>
            <option value="gemini-3.1-flash-lite">⚡ Gemini 3.1 Flash Lite (Siêu nhanh)</option>
          </select>
        </div>

        <button 
          onClick={downloadTemplate}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-5 py-2.5 rounded-xl font-bold border border-emerald-200/50 transition-all active:scale-95 text-sm"
        >
          <Download size={18} />
          Tải file mẫu Excel
        </button>
      </div>

      {/* ZONE NHẬP DỮ LIỆU EXCEL */}
      {students.length === 0 ? (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
            dragActive 
              ? "border-indigo-600 bg-indigo-50/50 scale-[1.01]" 
              : "border-slate-200 hover:border-indigo-400 bg-white"
          }`}
          onClick={onButtonClick}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 shadow-inner">
              <Upload size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Kéo thả file Excel vào đây</h3>
              <p className="text-sm text-slate-500 mt-2">
                Hoặc bấm để chọn file từ máy tính của bạn. Hệ thống hỗ trợ .xlsx và .xls
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Yêu cầu tiêu đề cột:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-500 font-mono">
                <div>• STT</div>
                <div>• Số buổi</div>
                <div>• Họ tên / Họ và Tên</div>
                <div>• Điểm bài 1 ... Bài 6</div>
                <div>• Lớp</div>
                <div>• Mã HS / Mã học sinh</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CỘT DANH SÁCH HỌC SINH ĐÃ IMPORT */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Thanh tìm kiếm & thống kê */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <FileSpreadsheet className="text-emerald-500" /> Danh sách đã nạp ({students.length} học sinh)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Trung bình chuyên cần lớp: <strong className="text-indigo-600">{totalAttendanceRate}/10 buổi</strong>
                  </p>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={handleAnalyzeClass}
                    disabled={loading}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-all active:scale-95"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                    Phân tích cả lớp
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm("Bạn có chắc muốn xóa danh sách hiện tại?")) {
                        setStudents([]);
                        setIndividualReviews({});
                        setClassReport(null);
                        setSelectedStudent(null);
                      }
                    }}
                    className="p-2.5 text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-xl transition-all"
                    title="Xóa danh sách"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Tìm kiếm */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Tìm học sinh theo tên, lớp, mã học sinh..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Bảng học viên dạng cuộn mượt */}
            <div className="overflow-y-auto flex-1">
              {filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <p>Không tìm thấy học sinh nào khớp với từ khóa tìm kiếm.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredStudents.map((student) => {
                    const parsedReview = individualReviews[student.studentCode];
                    const isReviewing = reviewLoading[student.studentCode];
                    const activeGradesCount = getActiveGradesCount(student);
                    
                    return (
                      <div 
                        key={student.studentCode} 
                        className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:bg-slate-50/80 cursor-pointer ${selectedStudent?.studentCode === student.studentCode ? 'bg-indigo-50/30' : ''}`}
                        onClick={() => setSelectedStudent(student)}
                      >
                        {/* Avatar & Thông tin cơ bản */}
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            student.sessions >= 8 ? 'bg-emerald-50 text-emerald-600' :
                            student.sessions >= 5 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            <User size={20} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-800 text-sm truncate">{student.name}</h4>
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600 shrink-0">
                                {student.className}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400 mt-1">
                              <span>Mã: <strong className="text-slate-600 font-medium">{student.studentCode}</strong></span>
                              <span>•</span>
                              <span>Chuyên cần: <strong className={`${
                                student.sessions >= 8 ? 'text-emerald-600' :
                                student.sessions >= 5 ? 'text-amber-600' : 'text-rose-600'
                              }`}>{student.sessions}/10 buổi</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Tổng quan Điểm số kiểm tra */}
                        <div className="flex flex-col items-end gap-1 shrink-0 w-full sm:w-auto">
                          <div className="flex gap-1">
                            {Object.entries(student.grades).map(([key, value]) => {
                              const hasScore = value !== null && value !== undefined;
                              return (
                                <span 
                                  key={key} 
                                  className={`w-7 h-7 rounded text-[10px] font-bold flex items-center justify-center border transition-all ${
                                    hasScore 
                                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                      : 'bg-slate-50 border-slate-100 text-slate-300'
                                  }`}
                                  title={`${key}: ${hasScore ? `${value}đ` : 'Chưa có'}`}
                                >
                                  {hasScore ? value : '-'}
                                </span>
                              );
                            })}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {activeGradesCount > 0 ? `Đã thi ${activeGradesCount}/6 bài` : "Chưa có điểm thi"}
                          </span>
                        </div>

                        {/* Nút Phân Tích */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                          {parsedReview ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                              <CheckCircle2 size={14} /> Đã phân tích
                            </span>
                          ) : null}

                          <button 
                            onClick={() => handleAnalyzeSingle(student)}
                            disabled={isReviewing}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                              isReviewing 
                                ? 'bg-slate-100 text-slate-400' 
                                : parsedReview 
                                ? 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600' 
                                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                            }`}
                          >
                            {isReviewing ? (
                              <>
                                <Loader2 className="animate-spin" size={14} />
                                Phân tích...
                              </>
                            ) : parsedReview ? (
                              <>
                                <Sparkles size={14} />
                                Xem lại
                              </>
                            ) : (
                              <>
                                <Sparkles size={14} />
                                Phân tích AI
                              </>
                            )}
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CỘT HIỂN THỊ KẾT QUẢ PHÂN TÍCH */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col max-h-[85vh]">
            
            {/* Phân tích chung lớp học */}
            {classReport && !selectedStudent && (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0">
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                    <BookOpen className="text-indigo-600" /> Báo Cáo Tổng Quan Cả Lớp
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleCopyText(classReport)}
                      className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                      title="Sao chép toàn bộ"
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      onClick={() => handlePrint("lop_hoc")}
                      className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                      title="In báo cáo"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="overflow-y-auto flex-1 pr-2">
                  <CustomMarkdownRenderer text={classReport} />
                </div>
              </div>
            )}

            {/* Chi tiết phân tích từng học sinh */}
            {selectedStudent ? (
              <div className="flex flex-col h-full" id="print-area">
                <div className="border-b border-slate-100 pb-4 mb-4 shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                      <Award className="text-yellow-500 animate-bounce" /> Phiếu Nhận Xét Học Viên
                    </h3>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => handleCopyText(individualReviews[selectedStudent.studentCode] || "Chưa có nội dung phân tích.")}
                        disabled={!individualReviews[selectedStudent.studentCode]}
                        className="p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 rounded-xl transition-all"
                        title="Sao chép nhận xét"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => handlePrint(selectedStudent.name)}
                        disabled={!individualReviews[selectedStudent.studentCode]}
                        className="p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 rounded-xl transition-all"
                        title="In phiếu nhận xét"
                      >
                        <Printer size={16} />
                      </button>
                      <button 
                        onClick={() => setSelectedStudent(null)}
                        className="p-2 text-xs font-bold text-slate-400 hover:bg-slate-100 rounded-xl transition-all"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>

                  {/* Thẻ định danh học sinh */}
                  <div className="mt-3 p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                      {selectedStudent.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-indigo-950 text-sm leading-tight">{selectedStudent.name}</h4>
                      <p className="text-[11px] text-indigo-600/80 font-medium mt-0.5">
                        Mã số: {selectedStudent.studentCode} • Lớp: {selectedStudent.className}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Nội dung kết quả phân tích học viên */}
                <div className="overflow-y-auto flex-1 pr-2">
                  {individualReviews[selectedStudent.studentCode] ? (
                    <CustomMarkdownRenderer text={individualReviews[selectedStudent.studentCode]} />
                  ) : reviewLoading[selectedStudent.studentCode] ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 space-y-4">
                      <Loader2 className="animate-spin text-indigo-600" size={36} />
                      <p className="text-sm font-medium">Gemini đang đọc số liệu & viết lời khuyên...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 space-y-4">
                      <AlertCircle className="opacity-30 text-indigo-600" size={40} />
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-700">Chưa có dữ liệu phân tích AI</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                          Bấm nút "Phân tích AI" tại dòng thông tin học sinh ở bảng bên trái để xem nhận xét chi tiết.
                        </p>
                      </div>
                      <button 
                        onClick={() => handleAnalyzeSingle(selectedStudent)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                      >
                        <Sparkles size={14} /> Phân tích học sinh này ngay
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : !classReport ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                <Sparkles size={48} className="mb-4 text-indigo-500/20 animate-pulse" />
                <h4 className="font-bold text-slate-700 text-sm">Trung Tâm Phân Tích Gemini</h4>
                <p className="text-xs text-slate-400 text-center max-w-xs mt-2 leading-relaxed">
                  Chọn một học viên trong danh sách hoặc bấm "Phân tích cả lớp" để tạo báo cáo tổng quan.
                </p>
              </div>
            ) : null}

          </div>

        </div>
      )}

      {/* CHÚ THÍCH PHÂN TÍCH */}
      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/60 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Chuyên cần /10</h4>
            <p className="text-xs text-slate-500 mt-1">
              Tính tỷ lệ học sinh đi học so với 10 buổi học được cấu hình trong bảng dữ liệu của Thầy Cô.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Điểm số đợt mới</h4>
            <p className="text-xs text-slate-500 mt-1">
              Chỉ những bài kiểm tra từ 1 đến 6 có điền số điểm thực tế mới được gửi lên để Gemini đánh giá và phân tích xu hướng.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <Printer size={20} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Học bạ & In ấn gọn gàng</h4>
            <p className="text-xs text-slate-500 mt-1">
              Cho phép xuất, in hoặc sao chép nhận xét riêng biệt từng học viên một cách nhanh chóng để thông báo trực tiếp cho Phụ huynh.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default GeminiSection;
