import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import {
  QrCode,
  Search,
  Users,
  CreditCard,
  CheckCircle2,
  Download,
  Printer,
  Save,
  CheckSquare,
  Square,
  Grid,
  FileSpreadsheet,
  CalendarCheck,
  RefreshCw,
  X,
  AlertCircle,
  Lock,
  FileText
} from 'lucide-react';
import { AppData, Student } from '../types';
import { verifyAdminPassword } from './verifyadmin';

interface QRCalculatorProps {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

// Danh sách các ngân hàng phổ biến tại Việt Nam hỗ trợ VietQR (sửa hộ - Thầy Hà)
const POPULAR_BANKS = [
  { code: 'Vietinbank', name: 'Vietinbank (Công Thương)' },
  { code: 'MBBank', name: 'MB Bank (Quân Đội)' },
  { code: 'Vietcombank', name: 'Vietcombank (Ngoại Thương)' },
  { code: 'Techcombank', name: 'Techcombank (Kỹ Thương)' },
  { code: 'BIDV', name: 'BIDV (Đầu Tư & Phát Triển)' },
  { code: 'Agribank', name: 'Agribank (Nông Nghiệp)' },
  { code: 'TPBank', name: 'TPBank (Tiên Phong)' },
  { code: 'VPBank', name: 'VPBank (Việt Nam Thịnh Vượng)' },
  { code: 'ACB', name: 'ACB (Á Châu)' },
  { code: 'Sacombank', name: 'Sacombank (Sài Gòn Thương Tín)' },
  { code: 'VIB', name: 'VIB (Quốc Tế)' },
  { code: 'SHB', name: 'SHB (Sài Gòn - Hà Nội)' },
  { code: 'VNPTMoney', name: 'VNPT Fintech' },
  { code: 'Oceanbank', name: 'Ngân hàng TM TNHH MTV Đại Dương' },
  { code: 'DongABank', name: 'Ngân hàng TMCP Đông Á' },
  { code: 'MOMO', name: 'Ví điện tử Momo' },
  { code: 'VETC', name: 'Ví điện tử VETC' },
  { code: 'ZaloPay', name: 'Ví điện tử Zalo' },
  { code: 'VIETTELPAY', name: 'Ví điện tử Viettel Pay' }
];

const QRCalculator: React.FC<QRCalculatorProps> = ({ data, onUpdate }) => {
  // --- QUẢN LÝ TRẠNG THÁI CHỌN LỚP & TÌM KIẾM ---
  const [selectedLanNop, setSelectedLanNop] = useState('L1'); // Mặc định chọn L1
  const [selectedClass, setSelectedClass] = useState<string>('Lop12');
  const [searchTerm, setSearchTerm] = useState('');

  // --- QUẢN LÝ XÁC THỰC ADMIN (Sửa đổi theo yêu cầu bảo mật cao) ---
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthorizedV, setIsAuthorizedV] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [password, setPassword] = useState('');

  // --- XÁC THỰC KHI TẠO QR CÁ NHÂN ---
  const [isIndividualVerified, setIsIndividualVerified] = useState(false);
  const [individualPassword, setIndividualPassword] = useState('');
  const [isCheckingIndividual, setIsCheckingIndividual] = useState(false);

  // --- XÁC THỰC KHI TẠO QR HÀNG LOẠT ---
  const [isBulkVerified, setIsBulkVerified] = useState(false);
  const [bulkPassword, setBulkPassword] = useState('');
  const [isCheckingBulk, setIsCheckingBulk] = useState(false);

  // Xác minh admin chỉnh sửa ngân hàng
  const handleAuth = async () => {
    if (!password.trim()) {
      alert('Vui lòng nhập mật khẩu Admin Ô C2!');
      return;
    }
    setIsChecking(true);
    try {
      if (data.sheetLink) {
        const result = await verifyAdminPassword(data.sheetLink, password);
        if (result.success) {
          setIsAuthorized(true);
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
  // Xác minh quyền vào xem
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



  // Xác thực tạo QR cá nhân
  const handleAuthIndividual = async () => {
    if (!individualPassword.trim()) {
      alert('Vui lòng nhập mật khẩu Admin!');
      return;
    }
    setIsCheckingIndividual(true);
    try {
      if (data.sheetLink) {
        const result = await verifyAdminPassword(data.sheetLink, individualPassword);
        if (result.success) {
          setIsIndividualVerified(true);
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
      setIsCheckingIndividual(false);
    }
  };

  // Xác thực tạo QR hàng loạt
  const handleAuthBulk = async () => {
    if (!bulkPassword.trim()) {
      alert('Vui lòng nhập mật khẩu Admin!');
      return;
    }
    setIsCheckingBulk(true);
    try {
      if (data.sheetLink) {
        const result = await verifyAdminPassword(data.sheetLink, bulkPassword);
        if (result.success) {
          setIsBulkVerified(true);
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
      setIsCheckingBulk(false);
    }
  };



  // --- TÍNH TOÁN TIỀN HỌC CHI TIẾT (Khai báo dạng function để Hoisting an toàn) ---
  function getStudentAttendedCount(student: Student) {
    return student.attendance ? student.attendance.filter(v => v === 1).length : 0;
  }

  // CODE MỚI: Lấy trực tiếp số tiền đã tính từ Google Sheets về
  const getStudentAmount = (student: Student) => {
    return Number(student.totalAmount) || 0;
  };
  // --- THÔNG TIN TÀI KHOẢN NGÂN HÀNG (Sử dụng dữ liệu cấu hình hoặc mặc định) ---
  const [bankId, setBankId] = useState(data.bankId || 'Vietinbank');
  const [bankAccountNo, setBankAccountNo] = useState(data.bankAccountNo || '104887594225');
  const [bankAccountName, setBankAccountName] = useState(data.bankAccountName || 'HKD HA THAO');
  const [isEditingBank, setIsEditingBank] = useState(false);

  // Đồng bộ cấu hình tài khoản khi dữ liệu cha thay đổi
  useEffect(() => {
    if (data.bankId) {
      // Nếu từ Sheets trả về là CTG thì tự quy đổi về Vietinbank cho đúng với danh sách POPULAR_BANKS
      setBankId(data.bankId === 'CTG' ? 'Vietinbank' : data.bankId);
    }
    if (data.bankAccountNo) setBankAccountNo(data.bankAccountNo);
    if (data.bankAccountName) setBankAccountName(data.bankAccountName);
  }, [data.bankId, data.bankAccountNo, data.bankAccountName]);

  // --- QUẢN LÝ CHỌN HỌC SINH & SỐ TIỀN ---
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [selectedStudentsForBulk, setSelectedStudentsForBulk] = useState<Set<string>>(new Set());
  const [rightPanelMode, setRightPanelMode] = useState<'individual' | 'bulk'>('individual');

  // --- CẤU HÌNH TẠO HÀNG LOẠT ---
  const [bulkAmountBasis, setBulkAmountBasis] = useState<'attendance' | 'fixed' | 'custom'>('attendance');
  const [bulkCustomAmount, setBulkCustomAmount] = useState<number>(0);

  // --- LẤY DANH SÁCH HỌC SINH CỦA LỚP ĐANG CHỌN ---
  const currentStudents = data.sheets[selectedClass]?.students || [];
  const classFee = data.fees.find(f => f.className === selectedClass)?.fee || 0;

  // Cập nhật số tiền nộp hàng loạt mặc định khi chuyển lớp
  useEffect(() => {
    setBulkCustomAmount(classFee || 60000);
  }, [classFee]);

  // Lọc học sinh theo từ khóa tìm kiếm (Tên, Mã HS, Số điện thoại)
  const filteredStudents = currentStudents.filter(s => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return true;
    const matchName = s.name && String(s.name).toLowerCase().includes(searchLower);
    const matchCode = s.code && String(s.code).toLowerCase().includes(searchLower);
    const matchPhone = s.phoneNumber && String(s.phoneNumber).includes(searchLower);
    const matchSchool = s.school && String(s.school).includes(searchLower);
    return matchName || matchCode || matchPhone || matchSchool;
  });

  // Tự động chọn học sinh đầu tiên khi đổi lớp hoặc tìm kiếm để giao diện không trống trải
  useEffect(() => {
    if (filteredStudents.length > 0) {
      setSelectedStudent(filteredStudents[0]);
    } else {
      setSelectedStudent(null);
    }
    // Reset lựa chọn hàng loạt của lớp cũ khi đổi lớp
    setSelectedStudentsForBulk(new Set());
    setRightPanelMode('individual');
    setIsBulkVerified(false);
    setBulkPassword('');
  }, [selectedClass]);

  // Tự động cập nhật số tiền nộp mặc định cho học sinh được chọn
  useEffect(() => {
    if (selectedStudent) {
      const attendedAmount = getStudentAmount(selectedStudent);
      const initialAmount = attendedAmount > 0
        ? attendedAmount
        : (selectedStudent.totalAmount > 0 ? selectedStudent.totalAmount : classFee);
      setCustomAmount(initialAmount);
    } else {
      setCustomAmount(0);
    }
    // RESET xác thực cá nhân khi thay đổi học sinh để bắt buộc nhập mật khẩu lại
    setIsIndividualVerified(false);
    setIndividualPassword('');
  }, [selectedStudent?.code, selectedStudent?.name, selectedClass, classFee]);

  // --- LƯU CẤU HÌNH NGÂN HÀNG VÀO HỆ THỐNG ---
  const handleSaveBankSettings = () => {
    if (!bankAccountNo.trim() || !bankAccountName.trim()) {
      alert("Vui lòng điền đầy đủ Số tài khoản và Tên chủ tài khoản!");
      return;
    }
    const updatedData = {
      ...data,
      bankId,
      bankAccountNo: bankAccountNo.trim(),
      bankAccountName: bankAccountName.trim().toUpperCase()
    };
    onUpdate(updatedData);
    setIsEditingBank(false);
    setIsAuthorized(false);
    setPassword('');
    alert("Đã cập nhật và lưu cấu hình tài khoản ngân hàng thành công! 💾");

  };

  // --- XỬ LÝ CHỌN CHECKBOX HÀNG LOẠT ---
  const handleToggleSelectStudent = (studentCode: string) => {
    const newSelected = new Set(selectedStudentsForBulk);
    if (newSelected.has(studentCode)) {
      newSelected.delete(studentCode);
    } else {
      newSelected.add(studentCode);
    }
    setSelectedStudentsForBulk(newSelected);
  };

  const handleSelectAllFiltered = () => {
    const allChecked = filteredStudents.every(s => s.code && selectedStudentsForBulk.has(s.code));
    const newSelected = new Set(selectedStudentsForBulk);

    filteredStudents.forEach(s => {
      if (s.code) {
        if (allChecked) {
          newSelected.delete(s.code);
        } else {
          newSelected.add(s.code);
        }
      }
    });
    setSelectedStudentsForBulk(newSelected);
  };

  // --- TẠO URL VIETQR ĐỘNG ---
  const generateQrUrl = (student: Student, amount: number) => {
    const code = student.code || "";
    
    // Nếu là mã Học Thêm (HT) thì lấy selectedLanNop, nếu là Chủ Nhiệm (CN) thì bỏ trống ""
    const lanNopHienTai = code.toUpperCase().startsWith("HT") ? selectedLanNop : "";

    // Ghép chuỗi nội dung (dùng .trim() để xóa khoảng trắng thừa nếu lanNopHienTai bị rỗng)
    const content = `SEVQR ${code} ${lanNopHienTai} nop hoc phi`.replace(/\s+/g, ' ').trim();
    
    const cleanAmount = String(amount || "").replace(/\D/g, "");
    return `https://img.vietqr.io/image/${bankId}-${bankAccountNo}-compact2.png?amount=${cleanAmount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(bankAccountName)}`;    
  };

  // --- IN TOÀN BỘ MÃ QR HÀNG LOẠT ---
  const handlePrintAllQR = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Trạng thái tải QR lẻ và tải hàng loạt
  const [downloadingSingle, setDownloadingSingle] = useState(false);
  const [downloadingBulk, setDownloadingBulk] = useState(false);
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState(0);

  const [downloadingSinglePdf, setDownloadingSinglePdf] = useState(false);
  const [downloadingBulkPdf, setDownloadingBulkPdf] = useState(false);
  const [bulkPdfProgress, setBulkPdfProgress] = useState(0);

  // Hàm phụ lấy tên file PDF dạng: mã HS. Họ tên không dâu.pdf
  const getPdfFileName = (student: Student) => {
    const rawCode = student.code ? student.code.trim() : "CHUA_CO_MA";
    const safeNameNoAccents = student.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return `${rawCode}. ${safeNameNoAccents}.pdf`;
  };

  // Hàm sinh mã PDF dạng Blob cho học sinh
  const generatePdfBlobForStudent = async (student: Student, amount: number, qrUrl: string): Promise<Blob> => {
    // Tải ảnh QR code và chuyển sang base64
    const res = await fetch(qrUrl);
    if (!res.ok) throw new Error("Không thể kết nối đến máy chủ VietQR để lấy ảnh");
    const blob = await res.blob();
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Tạo đối tượng jsPDF (A4 dọc: 210 x 297 mm)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const safeName = student.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const safeBankName = bankAccountName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    // 1. Vẽ dải màu trang trí phía trên (Top accent line)
    doc.setFillColor(79, 70, 229); // màu Indigo #4f46e5 (giống theme app)
    doc.rect(0, 0, 210, 8, 'F');

    // 2. Tiêu đề trường học / Thương hiệu Thầy Hà
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59); // màu xám đen slate-800
    doc.text("SMARTEDU PRO - THAY NGUYEN VAN HA", 15, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Lop hoc them Thay Ha - Phone: 0988.948.882`, 15, 27);
    doc.text(`Address: Xuan Phu - Tan Tien - Bac Ninh`, 15, 32);

    // Đường gạch ngang phân cách
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(15, 36, 195, 36);

    // 3. Tiêu đề phiếu thông báo học phí
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 27, 75); // indigo-950
    doc.text("PHIEU THONG BAO HOC PHI & MA QR", 105, 48, { align: 'center' });

    // 4. Khung thông tin học sinh (Student Info Box)
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(248, 250, 252); // slate-50 (nền nhẹ)
    doc.roundedRect(15, 56, 180, 48, 3, 3, 'FD');

    // Điền thông tin học sinh vào khung
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("THONG TIN HOC VIEN:", 22, 63);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // slate-900

    doc.text(`Ho va ten hoc sinh:`, 22, 71);
    doc.setFont('helvetica', 'bold');
    doc.text(safeName.toUpperCase(), 65, 71);

    doc.setFont('helvetica', 'normal');
    doc.text(`Ma hoc sinh:`, 22, 78);
    doc.setFont('helvetica', 'bold');
    doc.text(student.code || "---", 65, 78);

    doc.setFont('helvetica', 'normal');
    doc.text(`Lop hoc them:`, 22, 85);
    doc.setFont('helvetica', 'bold');
    doc.text(student.class || selectedClass.replace("Lop", "Lop "), 65, 85);

    doc.setFont('helvetica', 'normal');
    doc.text(`So buoi di hoc:`, 22, 92);
    doc.setFont('helvetica', 'bold');
    doc.text(`${getStudentAttendedCount(student)} buoi`, 65, 92);

    // Cột bên phải trong khung thông tin - Số tiền cần nộp nổi bật
    doc.setDrawColor(199, 210, 254); // indigo-200
    doc.setFillColor(238, 242, 255); // indigo-50
    doc.roundedRect(120, 60, 68, 40, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text("SO TIEN CAN NOP", 154, 67, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(67, 56, 202); // indigo-700
    const formattedAmount = `${amount.toLocaleString('vi-VN')} VND`;
    doc.text(formattedAmount, 154, 78, { align: 'center' });

    // Trạng thái chờ quét mã
    // 1. Vẽ chấm tròn trạng thái màu Indigo (thay cho dấu chấm tròn nhấp nháy trên Web)
    //doc.setFillColor(79, 70, 229); // Màu indigo-600
    // Vẽ hình tròn: doc.circle(x, y, bán_kính, 'F' để lấp đầy màu)
    // Tọa độ x tầm 128 (được căn chỉnh lùi lại để nhường chỗ cho chữ)
    //doc.circle(124, 87.5, 1, 'F'); 

    // 2. Viết chữ Trạng thái lùi sang bên cạnh chấm tròn
    //doc.setFont('helvetica', 'normal');
    //doc.setFontSize(8);
    //doc.setTextColor(100, 116, 139); // slate-500
    //doc.text("Trang thai: Cho chuyen khoan", 154, 88, { align: 'center' }); // Bỏ align center để căn lề trái đi cùng chấm tròn
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Trang thai: Cho chuyen khoan", 154, 88, { align: 'center' });

    // 5. Khung vẽ mã QR (QR Code Frame)
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(55, 112, 100, 114, 4, 4, 'FD');

    // Chèn ảnh VietQR vào chính giữa
    doc.addImage(base64Data, 'PNG', 62, 118, 86, 86);

    // Dòng chú thích dưới mã QR
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text("MA QR QUET DE THANH TOAN TU DONG", 105, 218, { align: 'center' });

    // 6. Chú thích & Hướng dẫn thanh toán cuối trang
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.setLineWidth(0.3);
    doc.line(15, 234, 195, 234);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // slate-700
    const infoContent = `${student.code || ""} ${selectedLanNop || ""} nop hoc phi`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .substring(0, 15) + " nop hoc phi";
    doc.text(`Noi dung chuyen khoan bat buoc:  ${infoContent.toUpperCase()}`, 105, 242, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Huong dan: Phu huynh dung ung dung Ngan hang (Mobile Banking) quet ma QR nay.", 105, 250, { align: 'center' });
    doc.text("He thong se tu dong ghi nhan so tien va nguoi nop ma khong can nhap thu cong.", 105, 255, { align: 'center' });

    doc.setFont('helvetica', 'oblique');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text("Xin tran trong cam on Quy Phu huynh hoc sinh!", 105, 268, { align: 'center' });

    // Dấu ấn bảo mật SmartEdu Pro ở chân trang
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("Phat trien boi SmartEdu Pro - Ho tro Thay co quan ly thong minh", 105, 282, { align: 'center' });

    return doc.output('blob');
  };

  // Hàm tải lẻ 1 ảnh QR
  const handleDownloadSingle = async (student: Student, amount: number) => {
    setDownloadingSingle(true);
    try {
      const url = generateQrUrl(student, amount);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Network response was not ok");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const safeName = student.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_');
      a.download = `QR_${selectedClass}_${safeName}_${amount}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Lỗi khi tải ảnh QR lẻ:", err);
      alert("Hệ thống chuyển hướng tải ảnh dự phòng. Vui lòng bấm chuột phải chọn 'Lưu hình ảnh...' hoặc giữ ảnh để tải về.");
      window.open(generateQrUrl(student, amount), '_blank');
    } finally {
      setDownloadingSingle(false);
    }
  };

  // Hàm tải lẻ file PDF
  const handleDownloadSinglePdf = async (student: Student, amount: number) => {
    setDownloadingSinglePdf(true);
    try {
      const url = generateQrUrl(student, amount);
      const pdfBlob = await generatePdfBlobForStudent(student, amount, url);
      const blobUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = getPdfFileName(student);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Lỗi khi tải PDF lẻ:", err);
      alert("Không thể tải file PDF. Vui lòng kiểm tra lại kết nối mạng.");
    } finally {
      setDownloadingSinglePdf(false);
    }
  };

  // Hàm tải toàn bộ QR hàng loạt (ZIP)
  const handleDownloadBulk = async () => {
    if (selectedStudentsForBulk.size === 0) {
      alert("Vui lòng chọn ít nhất 1 học sinh trước khi tải hàng loạt!");
      return;
    }

    setDownloadingBulk(true);
    setBulkDownloadProgress(0);
    try {
      const zip = new JSZip();
      let count = 0;
      
      const studentsToDownload = currentStudents.filter(s => s.code && selectedStudentsForBulk.has(s.code));

      for (const student of studentsToDownload) {
        // Tính số tiền theo lựa chọn của người dùng
        let amount = 0;
        if (bulkAmountBasis === 'attendance') {
          amount = getStudentAmount(student);
        } else if (bulkAmountBasis === 'fixed') {
          amount = classFee;
        } else {
          amount = bulkCustomAmount;
        }

        if (amount <= 0) continue;

        try {
          const url = generateQrUrl(student, amount);
          const res = await fetch(url);
          if (!res.ok) throw new Error("Fetch error");
          const blob = await res.blob();
          
          const safeName = student.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '_');
          const fileName = `${student.stt || count + 1}_${safeName}_${amount}.png`;
          zip.file(fileName, blob);
        } catch (e) {
          console.error(`Lỗi khi tải QR cho ${student.name}:`, e);
        }
        count++;
        setBulkDownloadProgress(Math.round((count / studentsToDownload.length) * 100));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const blobUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Danh_Sach_Ma_QR_Hoc_Phi_${selectedClass}_${studentsToDownload.length}_HS.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      alert("Đã tạo và tải xuống tệp ZIP chứa toàn bộ mã QR của lớp thành công! 🎉");
    } catch (err) {
      console.error("Lỗi khi tải hàng loạt ZIP:", err);
      alert("Có lỗi xảy ra khi nén hàng loạt mã QR.");
    } finally {
      setDownloadingBulk(false);
      setBulkDownloadProgress(0);
    }
  };

  // Hàm tải toàn bộ PDF hàng loạt dạng ZIP
  const handleDownloadBulkPdf = async () => {
    if (selectedStudentsForBulk.size === 0) {
      alert("Vui lòng chọn ít nhất 1 học sinh trước khi tải hàng loạt PDF!");
      return;
    }

    setDownloadingBulkPdf(true);
    setBulkPdfProgress(0);
    try {
      const zip = new JSZip();
      let count = 0;

      const studentsToDownload = currentStudents.filter(s => s.code && selectedStudentsForBulk.has(s.code));

      for (const student of studentsToDownload) {
        // Tính số tiền theo lựa chọn của người dùng
        let amount = 0;
        if (bulkAmountBasis === 'attendance') {
          amount = getStudentAmount(student);
        } else if (bulkAmountBasis === 'fixed') {
          amount = classFee;
        } else {
          amount = bulkCustomAmount;
        }

        if (amount <= 0) continue;

        try {
          const url = generateQrUrl(student, amount);
          const pdfBlob = await generatePdfBlobForStudent(student, amount, url);
          const fileName = getPdfFileName(student);
          zip.file(fileName, pdfBlob);
        } catch (e) {
          console.error(`Lỗi khi tạo PDF cho ${student.name}:`, e);
        }
        count++;
        setBulkPdfProgress(Math.round((count / studentsToDownload.length) * 100));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const blobUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Danh_Sach_Phieu_QR_PDF_${selectedClass}_${studentsToDownload.length}_HS.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      alert("Đã tạo và tải xuống tệp ZIP chứa toàn bộ phiếu báo học phí dạng PDF thành công! 🎉");
    } catch (err) {
      console.error("Lỗi khi tải hàng loạt ZIP PDF:", err);
      alert("Có lỗi xảy ra khi nén hàng loạt PDF.");
    } finally {
      setDownloadingBulkPdf(false);
      setBulkPdfProgress(0);
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
      {/* THÔNG TIN HƯỚNG DẪN */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mb-1">
            <span className="w-2.5 h-5 bg-indigo-600 rounded-sm inline-block"></span>
            Hệ Thống Tạo Mã QR Thu Học Phí Thông Minh
          </h3>
          <p className="text-xs text-slate-500">
            Mã QR tự động tính theo số buổi điểm danh của học sinh lớp học thêm. Hỗ trợ quét chuyển khoản chính xác tuyệt đối.
          </p>
        </div>
        <div className="flex gap-2">
          {Object.keys(data.sheets)
            .filter(cls => cls.startsWith("Lop"))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .map(cls => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${selectedClass === cls
                    ? 'bg-indigo-600 text-white shadow-md border-indigo-600'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
              >
                {cls.replace("Lop", "Lớp ")}
              </button>
            ))}
        </div>
      </div>

      {/* GIAO DIỆN CHÍNH: CHIA LÀM HAI BÊN (BÊN TRÁI & BÊN PHẢI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ================= BÊN TRÁI: DANH SÁCH HỌC SINH (Simplified List Section) ================= */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h4 className="text-sm font-black text-slate-700 flex items-center gap-1.5">
              <Users size={16} className="text-indigo-600" />
              Danh Sách Học Sinh ({filteredStudents.length} HS)
            </h4>

            {/* Tìm kiếm */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Tìm tên, mã, SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Công cụ chọn hàng loạt */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
            {/* Nút Chọn tất cả */}
            <button
              onClick={handleSelectAllFiltered}
              className="flex items-center gap-1.5 font-bold text-slate-600 hover:text-indigo-600 transition-colors shrink-0"
            >
              {filteredStudents.length > 0 && filteredStudents.every(s => s.code && selectedStudentsForBulk.has(s.code)) ? (
                <CheckSquare size={16} className="text-indigo-600" />
              ) : (
                <Square size={16} />
              )}
              Chọn tất cả lớp {selectedClass.replace("Lop", "")}
            </button>

            {/* BỔ SUNG: Dropdown chọn Lần nộp sổ chọn */}
            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm w-full sm:w-auto">
              <span className="font-semibold text-slate-500 whitespace-nowrap">Lần nộp:</span>
              <select
                value={selectedLanNop}
                onChange={(e) => setSelectedLanNop(e.target.value)}
                className="bg-transparent font-bold text-indigo-700 outline-none cursor-pointer py-0.5 pr-1 min-w-[65px]"
              >
                {Array.from({ length: 12 }, (_, i) => `L${i + 1}`).map((lan) => (
                  <option key={lan} value={lan} className="text-slate-800 font-medium">
                    {lan}
                  </option>
                ))}
              </select>
            </div>

            {/* Nút tạo QR hàng loạt (Cho nhiều HS) */}
            <button
              onClick={() => {
                if (selectedStudentsForBulk.size === 0) {
                  alert("Vui lòng tích chọn ít nhất 1 học sinh ở danh sách bên dưới trước khi tạo QR hàng loạt!");
                  return;
                }
                setIsBulkVerified(false);
                setBulkPassword('');
                setRightPanelMode('bulk');
              }}
              className="w-full sm:w-auto justify-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
            >
              <Grid size={13} />
              Tạo QR Hàng Loạt ({selectedStudentsForBulk.size} HS)
            </button>
          </div>

          {/* Bảng danh sách học sinh rút gọn */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                  <th className="p-3 w-10 text-center">Chọn</th>
                  <th className="p-3 w-10 text-center">STT</th>
                  <th className="p-3">Họ và Tên</th>
                  <th className="p-3 text-center">Lớp</th>
                  <th className="p-3 text-center">Mã HS</th>
                  <th className="p-3 text-center">Số buổi</th>
                  <th className="p-3 text-right">Số tiền</th>
                  <th className="p-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
                    const studentCode = student.code || '';
                    const attendedCount = getStudentAttendedCount(student);
                    const amount = getStudentAmount(student);
                    const isChecked = selectedStudentsForBulk.has(studentCode);
                    const isSelectedSingle = selectedStudent && selectedStudent.code === student.code;

                    return (
                      <tr
                        key={studentCode || student.name + student.stt}
                        className={`hover:bg-slate-50/50 transition-colors ${isSelectedSingle ? 'bg-indigo-50/40 font-bold' : ''
                          }`}
                      >
                        <td className="p-3 text-center">
                          {studentCode ? (
                            <button
                              onClick={() => handleToggleSelectStudent(studentCode)}
                              className="text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                              {isChecked ? (
                                <CheckSquare size={16} className="text-indigo-600" />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-400">
                          {String(student.stt).padStart(2, '0')}
                        </td>
                        <td className="p-3 font-bold text-slate-800 truncate max-w-[140px]">
                          {student.name}
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-500">
                          {student.class}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-500">
                          {studentCode || "---"}
                        </td>
                        <td className="p-3 text-center font-bold">
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {attendedCount}b
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-indigo-600">
                          {formatCurrency(amount)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setRightPanelMode('individual');
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-black border transition-all ${isSelectedSingle
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                              }`}
                          >
                            Tạo QR
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400 font-medium">
                      Lớp này chưa có học sinh hoặc không tìm thấy kết quả phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= BÊN PHẢI: THÔNG TIN NGÂN HÀNG & MÃ QR ================= */}
        <div className="lg:col-span-5 space-y-6">

          {/* 1. KHU VỰC CẤU HÌNH TÀI KHOẢN NGÂN HÀNG (Configurable Bank Info) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard size={14} className="text-emerald-500" />
                Cấu hình Nhận tiền
              </h4>
              <button
                onClick={() => {
                  // Nếu đang mở mà bấm đóng, reset luôn trạng thái xác thực để lần sau phải nhập lại
                  if (isEditingBank) {
                    setIsAuthorized(false);
                    setPassword(''); // Xóa mật khẩu cũ trong ô input
                  }
                  setIsEditingBank(!isEditingBank);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
              >
                {isEditingBank ? 'Đóng' : 'Sửa tài khoản'}
              </button>
            </div>

            {isEditingBank ? (
              !isAuthorized ? (
                /* Sửa lần 2: Chỉ yêu cầu mật khẩu khi bấm vào chức năng sửa đổi */
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 text-xs font-bold flex items-center gap-1.5">
                    <Lock size={14} />
                    <span>Nhập mật khẩu Admin Ô C2 để chỉnh sửa cấu hình ngân hàng</span>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu Admin..."
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleAuth}
                    disabled={isChecking}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                  >
                    {isChecking ? "Đang xác thực..." : "Xác nhận mật khẩu"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Ngân hàng</label>
                    <select
                      value={bankId}
                      onChange={(e) => setBankId(e.target.value)}
                      className="w-full p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
                    >
                      {POPULAR_BANKS.map(b => (
                        <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Số tài khoản</label>
                    <input
                      type="text"
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                      placeholder="Nhập số tài khoản..."
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveBankSettings()}
                      className="w-full p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tên chủ tài khoản</label>
                    <input
                      type="text"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      placeholder="Nhập tên không dấu..."
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveBankSettings()}
                      className="w-full p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                    />
                  </div>
                  <button
                    onClick={handleSaveBankSettings}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1 transition-all"
                  >
                    <Save size={12} />
                    Lưu thông tin tài khoản
                  </button>
                </div>
              )
            ) : (
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="block text-[9px] text-red-700 font-bold uppercase">Ngân hàng</span>
                  <span className="font-extrabold text-slate-700">{bankId}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-red-700 font-bold uppercase">Số tài khoản</span>
                  <span className="font-extrabold text-slate-700 font-mono">{bankAccountNo}</span>
                </div>
                <div className="col-span-1">
                  <span className="block text-[9px] text-red-700 font-bold uppercase">Chủ tài khoản</span>
                  <span className="font-extrabold text-slate-700 truncate block uppercase">{bankAccountName}</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. KHU VỰC HIỂN THỊ MÃ QR CHUYỂN KHOẢN */}
          {rightPanelMode === 'individual' ? (
            /* CHẾ ĐỘ QR CÁ NHÂN */
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
              {selectedStudent ? (
                <>
                  <div className="w-full text-left border-b border-slate-100 pb-3">
                    <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-md mb-1.5 uppercase">
                      Học sinh đang chọn
                    </span>
                    <h5 className="text-base font-black text-slate-800">
                      {selectedStudent.stt}. {selectedStudent.name}
                    </h5>
                    <div className="flex gap-4 text-xs font-bold text-slate-500 mt-1">
                      <span>Lớp: <b className="text-slate-700">{selectedStudent.class}</b></span>
                      <span>Mã HS: <b className="text-emerald-600">{selectedStudent.code || "Chưa có"}</b></span>
                    </div>
                  </div>

                  {/* THÔNG TIN SỐ TIỀN & SỐ BUỔI */}
                  <div className="grid grid-cols-2 gap-4 w-full bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-left">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <CalendarCheck size={10} className="text-emerald-500" /> Số buổi đi học
                      </span>
                      <span className="text-sm font-black text-slate-700">{getStudentAttendedCount(selectedStudent)} buổi</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Học phí theo buổi</span>
                      <span className="text-sm font-black text-indigo-600">{formatCurrency(getStudentAmount(selectedStudent))}</span>
                    </div>
                  </div>

                  {/* NHẬP SỐ TIỀN NỘP THỰC TẾ (ĐỂ TẠO MÃ QR ĐỘNG) */}
                  <div className="w-full text-left space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase">Số tiền nộp thực tế (đ)</label>
                    <input
                      type="number"
                      value={customAmount || ''}
                      onChange={(e) => setCustomAmount(Number(e.target.value))}
                      placeholder="Nhập số tiền..."
                      className="w-full p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="block text-[10px] text-slate-400 font-medium italic">
                      Mặc định lấy từ học phí hoặc có thể sửa đổi theo ý muốn.
                    </span>
                  </div>

                  {/* PHẦN HIỂN THỊ QR CHỈ XUẤT HIỆN KHI ĐÃ XÁC THỰC CÁ NHÂN */}
                  {!isIndividualVerified ? (
                    <div className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 text-left animate-in fade-in duration-200">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Lock size={14} className="text-indigo-600 animate-bounce" />
                        <span>Xác thực Admin để tạo mã QR</span>
                      </div>
                      <input
                        type="password"
                        value={individualPassword}
                        onChange={(e) => setIndividualPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAuthIndividual();
                        }}
                        placeholder="Nhập mật khẩu Admin Ô C2..."
                        className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={handleAuthIndividual}
                        disabled={isCheckingIndividual}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                      >
                        {isCheckingIndividual ? "Đang xác thực..." : "Tạo Mã QR"}
                      </button>
                    </div>
                  ) : (
                    <>
                     {/* ẢNH QR CODE */}
              {customAmount > 0 ? (
              <div className="relative p-2 bg-white border border-slate-200/80 rounded-2xl shadow-md transition-all duration-200 hover:shadow-lg overflow-hidden flex items-center justify-center">
    <img
      src={generateQrUrl(selectedStudent, customAmount)}
      alt="Mã QR Chuyển Khoản Học Phí"
      className="w-52 h-52 object-contain transition-transform" /* Thay object-cover thành object-contain, bỏ scale-105 */
      referrerPolicy="no-referrer"
    />
    <div className="absolute inset-0 border-2 border-indigo-50/30 rounded-2xl pointer-events-none"></div>
  </div>
) : (
  <div className="p-6 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 text-xs font-bold flex flex-col items-center gap-2 w-full">
    <AlertCircle size={20} />
    <span>Vui lòng nhập số tiền lớn hơn 0đ để hệ thống tạo mã QR chuyển khoản!</span>
  </div>
)}

                      {/* THÔNG TIN CHUYỂN KHOẢN CHI TIẾT */}
          {customAmount > 0 && (
            <div className="w-full text-xs space-y-2 border-t border-slate-50 pt-3">
              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-400 font-bold whitespace-nowrap">Nội dung chuyển khoản:</span>
                <span className="font-extrabold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded break-all text-right">
                  {(() => {
                    const code = selectedStudent.code || "";
                    const lanNopHienTai = code.toUpperCase().startsWith("HT") ? selectedLanNop : "";
                    return `SEVQR ${code} ${lanNopHienTai} nop hoc phi`.replace(/\s+/g, ' ').trim();
                  })()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Trạng thái:</span>
                <span className="font-bold text-indigo-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                  ⏳ Chờ phụ huynh quét mã
                </span>
              </div>

                          {/* TIỆN ÍCH IN/HƯỚNG DẪN */}
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => {
                                const printWindow = window.open('', '_blank');
                                if (printWindow) {
                                  printWindow.document.write(`
                                    <html>
                                      <head>
                                        <title>In Mã QR Học Phí - ${selectedStudent.name}</title>
                                        <style>
                                          body { font-family: sans-serif; text-align: center; padding: 40px; }
                                          .card { border: 2px solid #ccc; border-radius: 20px; padding: 30px; display: inline-block; width: 400px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                                          .title { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
                                          .subtitle { font-size: 14px; color: #666; margin-bottom: 20px; }
                                          .qr { width: 250px; height: 250px; margin-bottom: 20px; }
                                          .details { text-align: left; background: #f9f9f9; padding: 15px; border-radius: 10px; font-size: 14px; }
                                          .details div { margin-bottom: 8px; }
                                          .details b { color: #333; }
                                        </style>
                                      </head>
                                      <body>
                                        <div class="card">
                                          <div class="title">SMARTEDU - MÃ QR HỌC PHÍ</div>
                                          <div class="subtitle">Lớp học thêm Thầy Hà</div>
                                          <img class="qr" src="${generateQrUrl(selectedStudent, customAmount)}" />
                                          <div class="details">
                                            <div>Học sinh: <b>${selectedStudent.name}</b> (Lớp ${selectedStudent.class})</div>
                                            <div>Mã học sinh: <b>${selectedStudent.code || 'Chưa có'}</b></div>
                                            <div>Số buổi học: <b>${getStudentAttendedCount(selectedStudent)} buổi</b></div>
                                            <div>Số tiền nộp: <b>${formatCurrency(customAmount)}</b></div>
                                            <div>Nội dung CK: <b>SEVQR ${(selectedStudent.code || selectedStudent.name || 'Hoc sinh')
                                      .normalize('NFD')
                                      .replace(/[\u0300-\u036f]/g, '')
                                      .replace(/đ/g, 'd')
                                      .replace(/Đ/g, 'D')
                                      .replace(/[^a-zA-Z0-9\s]/g, '')
                                      .substring(0, 15)} ${lanNopHienTai} nop hoc phi</b></div>
                                            <hr style="border: 0; border-top: 1px dashed #ccc; margin: 10px 0;" />
                                            <div style="font-size:11px; color:#777; text-align:center;">Phụ huynh quét mã trên ứng dụng ngân hàng để nộp tiền tự động</div>
                                          </div>
                                        </div>
                                        <script>window.onload = function() { window.print(); }</script>
                                      </body>
                                    </html>
                                  `);
                                  printWindow.document.close();
                                }
                              }}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] border border-slate-200"
                            >
                              <Printer size={13} />
                              In phiếu lẻ
                            </button>

                            <button
                              onClick={() => handleDownloadSingle(selectedStudent, customAmount)}
                              disabled={downloadingSingle}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] border border-emerald-600 shadow-sm disabled:opacity-50 active:scale-95"
                            >
                              <Download size={13} />
                              {downloadingSingle ? "Đang tải..." : "Tải ảnh QR"}
                            </button>
                          </div>

                          <button
                            onClick={() => handleDownloadSinglePdf(selectedStudent, customAmount)}
                            disabled={downloadingSinglePdf}
                            className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs shadow-md shadow-indigo-100 disabled:opacity-50 active:scale-95"
                          >
                            <FileText size={14} />
                            {downloadingSinglePdf ? "Đang tạo PDF..." : "Tải Phiếu Học Phí PDF"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <QrCode size={48} className="opacity-20 mb-3 animate-pulse text-indigo-500" />
                  <p className="font-bold text-xs max-w-[200px]">Thầy vui lòng nhấn nút "Tạo QR" ở dòng học sinh tương ứng</p>
                </div>
              )}
            </div>
          ) : (
            /* ================= CHẾ ĐỘ QR HÀNG LOẠT (BULK PORTFOLIO) ================= */
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Grid size={14} className="text-indigo-600 animate-spin" style={{ animationDuration: '4s' }} />
                    Mã QR Hàng Loạt ({selectedStudentsForBulk.size} HS)
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Sẵn sàng in hoặc chụp màn hình hàng loạt</p>
                </div>
                <button
                  onClick={() => setRightPanelMode('individual')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* LỰA CHỌN PHƯƠNG THỨC TÍNH SỐ TIỀN TRONG IN HÀNG LOẠT VÀ HIỂN THỊ */}
              {!isBulkVerified ? (
                <div className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 text-left animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Lock size={14} className="text-indigo-600 animate-bounce" />
                    <span>Xác thực Admin để tạo QR hàng loạt</span>
                  </div>
                  <input
                    type="password"
                    value={bulkPassword}
                    onChange={(e) => setBulkPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAuthBulk();
                    }}
                    placeholder="Nhập mật khẩu Admin Ô C2..."
                    className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleAuthBulk}
                    disabled={isCheckingBulk}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                  >
                    {isCheckingBulk ? "Đang xác thực..." : "Xác thực & Tạo QR"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3 text-xs">
                    <span className="block text-[9px] text-slate-400 font-black uppercase">Cơ sở tính số tiền:</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setBulkAmountBasis('attendance')}
                        className={`py-1.5 px-2 rounded-lg font-bold border transition-all text-center text-[10px] ${bulkAmountBasis === 'attendance'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        Theo số buổi
                      </button>
                      <button
                        onClick={() => setBulkAmountBasis('fixed')}
                        className={`py-1.5 px-2 rounded-lg font-bold border transition-all text-center text-[10px] ${bulkAmountBasis === 'fixed'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        Cố định {formatCurrency(classFee)}
                      </button>
                      <button
                        onClick={() => setBulkAmountBasis('custom')}
                        className={`py-1.5 px-2 rounded-lg font-bold border transition-all text-center text-[10px] ${bulkAmountBasis === 'custom'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        Tự nhập số tiền
                      </button>
                    </div>

                    {bulkAmountBasis === 'custom' && (
                      <div className="space-y-1 animate-in fade-in duration-200">
                        <label className="block text-[9px] text-slate-400 font-bold uppercase">Nhập số tiền nộp hàng loạt (đ)</label>
                        <input
                          type="number"
                          value={bulkCustomAmount || ''}
                          onChange={(e) => setBulkCustomAmount(Number(e.target.value))}
                          placeholder="Ví dụ: 500000..."
                          className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* KHU VỰC CHỨA IN/ĐỒNG BỘ */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handlePrintAllQR}
                        className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 text-xs active:scale-95"
                      >
                        <Printer size={14} />
                        In Tất Cả QR ({selectedStudentsForBulk.size})
                      </button>
                      <button
                        onClick={handleDownloadBulk}
                        disabled={downloadingBulk}
                        className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 text-xs active:scale-95 disabled:opacity-50"
                      >
                        <Download size={14} />
                        {downloadingBulk ? `Đang tải (${bulkDownloadProgress}%)` : "Tải tất cả (ZIP)"}
                      </button>
                    </div>

                    <button
                      onClick={handleDownloadBulkPdf}
                      disabled={downloadingBulkPdf}
                      className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 text-xs active:scale-95 disabled:opacity-50"
                    >
                      <FileText size={14} />
                      {downloadingBulkPdf ? `Đang nén PDF (${bulkPdfProgress}%)` : `Tải tất cả phiếu PDF (ZIP) (${selectedStudentsForBulk.size} HS)`}
                    </button>
                  </div>

                  {/* DANH SÁCH CUỘN MÃ QR KHÁCH HÀNG */}
                  <div id="print-area" className="space-y-4 max-h-[450px] overflow-y-auto pr-2 print:max-h-none print:overflow-visible">
                    {/* CSS đặc trị in ấn tích hợp trực tiếp để Thầy Hà sử dụng hoàn hảo */}
                    <style>{`
                      @media print {
                        body {
                          background: white !important;
                          color: black !important;
                        }
                        /* Ẩn mọi thứ trừ vùng in */
                        aside, header, main > header, .lg\\:col-span-7, .bg-white\\:first-child, button, select, input, .flex\\:first-child {
                          display: none !important;
                        }
                        main {
                          padding: 0 !important;
                          margin: 0 !important;
                        }
                        .max-w-7xl {
                          max-width: 100% !important;
                        }
                        .grid {
                          display: block !important;
                        }
                        .lg\\:col-span-5 {
                          width: 100% !important;
                          display: block !important;
                        }
                        #print-area {
                          display: grid !important;
                          grid-template-columns: repeat(2, 1fr) !important;
                          gap: 20px !important;
                          max-height: none !important;
                          overflow: visible !important;
                        }
                        .print-card {
                          page-break-inside: avoid !important;
                          border: 1px solid #ddd !important;
                          box-shadow: none !important;
                          border-radius: 12px !important;
                          padding: 15px !important;
                          background: white !important;
                        }
                      }
                    `}</style>

                    {currentStudents
                      .filter(s => s.code && selectedStudentsForBulk.has(s.code))
                      .map((student) => {
                        const attendedCount = getStudentAttendedCount(student);

                        // Tính số tiền theo lựa chọn của người dùng
                        let amount = 0;
                        if (bulkAmountBasis === 'attendance') {
                          amount = getStudentAmount(student);
                        } else if (bulkAmountBasis === 'fixed') {
                          amount = classFee;
                        } else {
                          amount = bulkCustomAmount;
                        }

                        if (amount === 0) return null; // Không hiển thị phiếu nếu học phí bằng 0

                        return (
                          <div
                            key={student.code}
                            className="print-card bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center text-center space-y-3"
                          >
                            <div className="w-full text-left border-b border-slate-200/60 pb-2 flex justify-between items-start">
                              <div>
                                <span className="font-extrabold text-slate-800 text-xs block">{student.stt}. {student.name}</span>
                                <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Lớp: {student.class} | Mã: {student.code}</span>
                              </div>
                              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                                {formatCurrency(amount)}
                              </span>
                            </div>

                            <img
                              src={generateQrUrl(student, amount)}
                              alt={`QR ${student.name}`}
                              className="w-36 h-36 object-contain bg-white p-1 rounded-lg border shadow-sm"
                              referrerPolicy="no-referrer"
                            />

                            <div className="w-full text-[9px] text-left text-slate-500 space-y-1 bg-white p-3 rounded border border-slate-100">
                              <div>Số buổi: <b className="text-slate-700">{attendedCount} buổi</b></div>
                              <div className="truncate">Nội dung CK: <b className="text-slate-700 font-mono">SEVQR {student.code || ""} {student.class || ""} ${lanNopHienTai} nop hoc phi</b></div>
                              <div className="truncate">Chủ TK: <b className="text-slate-700 font-mono">{bankAccountName} </b></div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default QRCalculator;
