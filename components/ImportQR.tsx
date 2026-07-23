import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
// news2: Thêm thư viện jsPDF cho chức năng xuất PDF
import { jsPDF } from 'jspdf';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Printer, 
  Lock, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  QrCode,
  X,
  // news2: Thêm icon FileText
  FileText
} from 'lucide-react';
import { AppData } from '../types';
interface ImportQRProps {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

interface QRExcelItem {
  stt: number;
  name: string;
  className: string;
  amount: number;
  bankId: string;
  accountNo: string;
  bankName: string;
  accountName: string;
  content: string;
}

const ImportQR: React.FC<ImportQRProps> = ({ data, onUpdate }) => {
  // Sửa lần 2: Tự động xác thực nếu đã xác thực trước đó, hoặc ở chế độ Dùng thử hoặc tài khoản VIP
  const [isAuthorizedV, setIsAuthorizedV] = useState(() => {
    return localStorage.getItem('is_authorized_v') === 'true' || data.enableCopyrightCheck === false || data.licenseStatus === 'vip';
  });
  const [isChecking, setIsChecking] = useState(false);
  const [password, setPassword] = useState('');

  // Tự động cập nhật trạng thái xác thực khi data thay đổi
  React.useEffect(() => {
    if (data.enableCopyrightCheck === false || data.licenseStatus === 'vip') {
      setIsAuthorizedV(true);
    }
  }, [data.enableCopyrightCheck, data.licenseStatus]);
  
  // Trạng thái dữ liệu danh sách QR đã nhập từ file Excel
  const [qrItems, setQrItems] = useState<QRExcelItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<QRExcelItem | null>(null);

  // Chuẩn hóa tên ngân hàng VietQR
  const normalizeBankShortName = (input: string): string => {
    if (!input) return 'Vietinbank';
    const clean = input.trim().replace(/\s+/g, '');
    const lower = clean.toLowerCase();
    
    if (lower.includes('vietin') || lower === 'ctg' || lower === 'icb') return 'Vietinbank';
    if (lower.includes('mb') || lower === 'mbbank') return 'MB';
    if (lower.includes('vietcom') || lower === 'vcb') return 'Vietcombank';
    if (lower.includes('techcom') || lower === 'tcb') return 'Techcombank';
    if (lower.includes('bidv')) return 'BIDV';
    if (lower.includes('agri')) return 'Agribank';
    if (lower.includes('vp') || lower === 'vpb') return 'VPBank';
    if (lower.includes('tp') || lower === 'tpb') return 'TPBank';
    if (lower.includes('acb')) return 'ACB';
    if (lower.includes('sacon') || lower === 'stb') return 'Sacombank';
    if (lower.includes('shb')) return 'SHB';
    if (lower.includes('hd') || lower === 'hdb') return 'HDBank';
    if (lower.includes('vib')) return 'VIB';
    if (lower.includes('msb')) return 'MSB';
    
    return clean;
  };

  // Xác minh admin (Sửa lần 2)
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
        alert('Mật khẩu không đúng. Vui lòng nhập mật khẩu C2 hoặc 16868688.');
      }   
    } catch (error) {
      console.error("Lỗi xác thực:", error);
      alert('Đã xảy ra lỗi trong quá trình xác thực.');
    } finally {
      setIsChecking(false); 
    }
  };

  // Sửa lần 2: Tải file mẫu Excel chuẩn cột cho người dùng sử dụng thuận tiện nhất
  const downloadTemplate = () => {
    const templateData = [
      {
        "STT": 1,
        "Họ và Tên": "Nguyễn Văn Hà Pro",
        "Lớp": "12A1",
        "Số tiền": 600000,
        "BankID/Short Name": "Vietinbank",
        "Số TK": "104887594225",
        "Tên Ngân hàng": "Vietinbank",
        "Chủ TK(name)": "HO KINH DOANH HA THAO",
        "Nội dung CK": "HS1201 nop hoc phi"
      },
      {
        "STT": 2,
        "Họ và Tên": "Trần Hà My",
        "Lớp": "12A1",
        "Số tiền": 480000,
        "BankID/Short Name": "MB",
        "Số TK": "0240198389999",
        "Tên Ngân hàng": "MB Bank",
        "Chủ TK(name)": "NGUYEN VAN HA",
        "Nội dung CK": "HS1202 nop hoc phi"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachHocPhiQR");
    XLSX.writeFile(workbook, "Mau_Danh_Sach_QR_Hoc_Phi.xlsx");
  };

  // Sửa lần 2: Đọc file Excel tải lên và gán vào danh sách QRItems
  const processExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        if (!arrayBuffer) return;

        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 'A' }) as any[];

        if (!jsonData || jsonData.length <= 1) {
          alert("File Excel trống hoặc không có dòng dữ liệu!");
          return;
        }

        const parsedItems: QRExcelItem[] = [];

        // Đọc từng dòng (Bỏ dòng đầu tiêu đề)
        jsonData.slice(1).forEach((row: any, index: number) => {
          // Lấy dữ liệu theo vị trí cột chữ cái: A, B, C, D, E, F, G, H, I
          const stt = parseInt(String(row['A'] || ''), 10) || (index + 1);
          const name = String(row['B'] || '').trim();
          const className = String(row['C'] || '').trim();
          
          // Đọc số tiền an toàn, xử lý cả số tiền viết định dạng "600.000", "600,000" hoặc text
          let amount = 0;
          if (typeof row['D'] === 'number') {
            amount = row['D'];
          } else if (row['D'] !== undefined && row['D'] !== null) {
            const cleanStr = String(row['D']).replace(/[^0-9]/g, '');
            amount = parseInt(cleanStr, 10) || 0;
          }

          const bankIdRaw = String(row['E'] || '').trim();
          const bankId = bankIdRaw ? normalizeBankShortName(bankIdRaw) : 'Vietinbank';
          
          const accountNoRaw = String(row['F'] || '').trim();
          const accountNo = accountNoRaw.replace(/[^0-9a-zA-Z]/g, '') || '104887594225';

          const bankName = String(row['G'] || '').trim() || bankId;
          const accountName = String(row['H'] || '').trim() || 'HKD HA THAO';
          
          // Lấy giá trị cột I, xóa khoảng trắng thừa
          const rawI = String(row['I'] || '').trim();
          let content = '';
          if (rawI) {
            content = rawI.toUpperCase().startsWith('SEVQR') ? rawI : `SEVQR ${rawI}`;
          }

          if (!name) return; // Bỏ qua nếu không có tên học sinh

          parsedItems.push({
            stt,
            name,
            className,
            amount,
            bankId,
            accountNo,
            bankName,
            accountName,
            content
          });
        });

        if (parsedItems.length === 0) {
          alert("Không tìm thấy dòng dữ liệu hợp lệ trong file Excel!");
          return;
        }

        setQrItems(parsedItems);
        setSelectedItem(parsedItems[0]); // Mặc định chọn dòng đầu tiên
        alert(`Nạp thành công ${parsedItems.length} dòng dữ liệu từ Excel! 📊`);
      } catch (err) {
        alert("Lỗi phân tích file Excel. Vui lòng kiểm tra lại đúng cấu trúc file mẫu chuẩn!");
        console.error("Lỗi Excel import:", err);
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Xóa danh sách hiện tại
  const clearList = () => {
    if (window.confirm("Thầy có chắc chắn muốn xóa toàn bộ danh sách QR hiện tại không?")) {
      setQrItems([]);
      setSelectedItem(null);
    }
  };

  // Tạo đường dẫn ảnh QR VietQR động (Chuẩn cho phép tự nhập)
const generateQrUrl = (item: QRExcelItem) => {
  // Nếu content trống hoặc chỉ có 'SEVQR' thì BỎ addInfo để App ngân hàng không điền cứng
  const isDynamic = !item.content || item.content.trim() === 'SEVQR';
  const addInfoParam = isDynamic ? '' : `&addInfo=${encodeURIComponent(item.content)}`;
  return `https://img.vietqr.io/image/${item.bankId}-${item.accountNo}-compact2.png?amount=${item.amount}${addInfoParam}&accountName=${encodeURIComponent(item.accountName)}`;
};

  // Định dạng tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Trạng thái tải QR lẻ và tải hàng loạt
  const [downloadingSingle, setDownloadingSingle] = useState(false);
  const [downloadingBulk, setDownloadingBulk] = useState(false);
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState(0);

  // news2: Trạng thái cho việc tải PDF lẻ và PDF hàng loạt
  const [downloadingSinglePdf, setDownloadingSinglePdf] = useState(false);
  const [downloadingBulkPdf, setDownloadingBulkPdf] = useState(false);
  const [bulkPdfProgress, setBulkPdfProgress] = useState(0);

  // news2: Hàm trích xuất mã học sinh từ nội dung chuyển khoản hoặc số thứ tự STT
  const getStudentCode = (item: QRExcelItem) => {
    const parts = item.content.trim().split(/\s+/);
    if (parts.length > 0) {
      const firstWord = parts[0];
      if (/^[a-zA-Z0-9]+$/.test(firstWord)) {
        return firstWord;
      }
    }
    return `HS${item.stt}`;
  };

  // news2: Hàm lấy tên file PDF cho học sinh import từ Excel (Mã HS. Họ tên không dấu.pdf)
  const getPdfFileName = (item: QRExcelItem) => {
    const code = getStudentCode(item);
    const safeNameNoAccents = item.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return `${code}. ${safeNameNoAccents}.pdf`;
  };

  // news2: Hàm sinh mã PDF dạng Blob cho học sinh từ Excel
  const generatePdfBlobForExcelItem = async (item: QRExcelItem, qrUrl: string): Promise<Blob> => {
    const res = await fetch(qrUrl);
    if (!res.ok) throw new Error("Không thể kết nối đến máy chủ VietQR để lấy ảnh");
    const blob = await res.blob();
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const safeName = item.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const safeBankName = item.accountName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    // 1. Vẽ dải màu trang trí phía trên (Top accent line)
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 8, 'F');

    // 2. Tiêu đề trường học / Thương hiệu Thầy Hà
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text("SMARTEDU PRO - THAY NGUYEN VAN HA", 15, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Dang ky lop hoc them Thay Ha - Phone: 0988.948.882`, 15, 27);
    doc.text(`Address: Xuan Phu - Tan Tien - Bac Ninh`, 15, 32);

    // Đường gạch ngang phân cách
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 36, 195, 36);

    // 3. Tiêu đề phiếu thông báo học phí
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 27, 75);
    doc.text("PHIEU THONG BAO THU TIEN & MA QR", 105, 48, { align: 'center' });

    // 4. Khung thông tin học sinh (Student Info Box)
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 56, 180, 48, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("THONG TIN HOC VIEN:", 22, 63);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);

    doc.text(`Ho va ten hoc sinh:`, 22, 71);
    doc.setFont('helvetica', 'bold');
    doc.text(safeName.toUpperCase(), 65, 71);

    doc.setFont('helvetica', 'normal');
    doc.text(`Ma hoc sinh:`, 22, 78);
    doc.setFont('helvetica', 'bold');
    doc.text(getStudentCode(item), 65, 78);

    doc.setFont('helvetica', 'normal');
    doc.text(`Lop hoc:`, 22, 85);
    doc.setFont('helvetica', 'bold');
    doc.text(item.className || "---", 65, 85);

    doc.setFont('helvetica', 'normal');
    doc.text(`Noi dung CK:`, 22, 92);
    doc.setFont('helvetica', 'bold');
    doc.text(item.content.toUpperCase(), 65, 92);

    // Cột bên phải trong khung thông tin - Số tiền cần nộp nổi bật
    doc.setDrawColor(199, 210, 254);
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(120, 60, 68, 40, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text("SO TIEN CAN NOP", 154, 67, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(67, 56, 202);
    const formattedAmount = `${item.amount.toLocaleString('vi-VN')} VND`;
    doc.text(formattedAmount, 154, 78, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Trang thai: ⏳ Cho chuyen khoan", 154, 88, { align: 'center' });

    // 5. Khung vẽ mã QR (QR Code Frame)
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(55, 112, 100, 114, 4, 4, 'FD');

    doc.addImage(base64Data, 'PNG', 62, 118, 86, 86);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text("MA QR QUET DE THANH TOAN TU DONG", 105, 218, { align: 'center' });

    // 6. Chú thích & Hướng dẫn thanh toán cuối trang
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(15, 234, 195, 234);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const cleanContent = item.content
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9\s]/g, '');
    doc.text(`Noi dung chuyen khoan bat buoc:  ${cleanContent.toUpperCase()}`, 105, 242, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Huong dan: Phu huynh dung ung dung Ngan hang (Mobile Banking) quet ma QR nay.", 105, 250, { align: 'center' });
    doc.text("He thong se tu dong ghi nhan so tien va nguoi nop ma khong can nhap thu cong.", 105, 255, { align: 'center' });

    doc.setFont('helvetica', 'oblique');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text("Xin tran trong cam on Quy Phu huynh hoc sinh!", 105, 268, { align: 'center' });

    // Dấu ấn bảo mật SmartEdu Pro ở chân trang
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Phat trien boi SmartEdu Pro - Ho tro Thay co quan ly thong minh", 105, 282, { align: 'center' });

    return doc.output('blob');
  };

  // news2: Hàm xử lý tải PDF đơn lẻ
  const handleDownloadSinglePdf = async (item: QRExcelItem) => {
    setDownloadingSinglePdf(true);
    try {
      const url = generateQrUrl(item);
      const pdfBlob = await generatePdfBlobForExcelItem(item, url);
      const blobUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = getPdfFileName(item);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Lỗi khi tải PDF lẻ từ Excel:", err);
      alert("Không thể tải file PDF. Vui lòng kiểm tra lại kết nối mạng.");
    } finally {
      setDownloadingSinglePdf(false);
    }
  };

  // news2: Hàm xử lý tải hàng loạt PDF và nén thành tệp ZIP
  const handleDownloadBulkPdf = async () => {
    if (qrItems.length === 0) {
      alert("Không có học sinh nào trong danh sách!");
      return;
    }
    const itemsToDownload = qrItems.filter(item => item.amount > 0);
    if (itemsToDownload.length === 0) {
      alert("Không có học sinh nào có số tiền hợp lệ (> 0)!");
      return;
    }

    setDownloadingBulkPdf(true);
    setBulkPdfProgress(0);
    try {
      const zip = new JSZip();
      let count = 0;

      for (const item of itemsToDownload) {
        try {
          const url = generateQrUrl(item);
          const pdfBlob = await generatePdfBlobForExcelItem(item, url);
          const fileName = getPdfFileName(item);
          zip.file(fileName, pdfBlob);
        } catch (e) {
          console.error(`Lỗi khi tạo PDF cho ${item.name}:`, e);
        }
        count++;
        setBulkPdfProgress(Math.round((count / itemsToDownload.length) * 100));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const blobUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Danh_Sach_Phieu_QR_PDF_Excel_${qrItems.length}_HS.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      alert("Đã tạo và tải xuống tệp ZIP chứa toàn bộ phiếu báo học phí dạng PDF thành công! 🎉");
    } catch (err) {
      console.error("Lỗi khi tải hàng loạt ZIP PDF từ Excel:", err);
      alert("Có lỗi xảy ra khi nén hàng loạt PDF.");
    } finally {
      setDownloadingBulkPdf(false);
      setBulkPdfProgress(0);
    }
  };

  // Hàm tải lẻ 1 ảnh QR
  const handleDownloadSingle = async (item: QRExcelItem) => {
    setDownloadingSingle(true);
    try {
      const url = generateQrUrl(item);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Network response was not ok");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const safeName = item.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_');
      a.download = `QR_${item.stt}_${safeName}_${item.amount}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Lỗi khi tải ảnh QR lẻ:", err);
      alert("Hệ thống chuyển hướng tải ảnh dự phòng. Vui lòng bấm chuột phải chọn 'Lưu hình ảnh...' hoặc giữ ảnh để tải về.");
      window.open(generateQrUrl(item), '_blank');
    } finally {
      setDownloadingSingle(false);
    }
  };

  // Hàm tải toàn bộ QR hàng loạt (ZIP)
  const handleDownloadBulk = async () => {
    if (qrItems.length === 0) {
      alert("Không có mã QR nào để tải!");
      return;
    }
    const itemsToDownload = qrItems.filter(item => item.amount > 0);
    if (itemsToDownload.length === 0) {
      alert("Không có mã QR hợp lệ (số tiền > 0) để tải!");
      return;
    }

    setDownloadingBulk(true);
    setBulkDownloadProgress(0);
    try {
      const zip = new JSZip();
      let count = 0;

      for (const item of itemsToDownload) {
        try {
          const url = generateQrUrl(item);
          const res = await fetch(url);
          if (!res.ok) throw new Error("Fetch error");
          const blob = await res.blob();
          
          const safeName = item.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '_');
          const fileName = `${item.stt}_${safeName}_${item.amount}.png`;
          zip.file(fileName, blob);
        } catch (e) {
          console.error(`Lỗi khi tải QR cho ${item.name}:`, e);
        }
        count++;
        setBulkDownloadProgress(Math.round((count / itemsToDownload.length) * 100));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const blobUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Danh_Sach_Ma_QR_Hoc_Phi_${qrItems.length}_HS.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      alert("Đã tạo và tải xuống tệp ZIP chứa toàn bộ mã QR thành công! 🎉");
    } catch (err) {
      console.error("Lỗi khi tải hàng loạt ZIP:", err);
      alert("Có lỗi xảy ra khi nén hàng loạt mã QR.");
    } finally {
      setDownloadingBulk(false);
      setBulkDownloadProgress(0);
    }
  };

  // Lọc tìm kiếm trong danh sách tải lên
  const filteredItems = qrItems.filter(item => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return true;
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.className.toLowerCase().includes(searchLower) ||
      item.content.toLowerCase().includes(searchLower) ||
      item.accountNo.includes(searchLower)
    );
  });

  // Giao diện đòi password
  if (!isAuthorizedV) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-md max-w-md mx-auto border border-slate-100 flex flex-col items-center animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <Lock size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Yêu cầu xác thực</h2>
        <p className="text-slate-500 text-center mb-6">Mật khẩu vào 16...88!</p>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nhập mật khẩu..."
          onKeyDown={(e) => e.key === 'Enter' && handleAuthV()}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none mb-4"
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
      {/* TIÊU ĐỀ & KHU VỰC TẢI FILE MẪU */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mb-1">
            <span className="w-2.5 h-5 bg-indigo-600 rounded-sm inline-block"></span>
            Tạo Mã QR Nộp Tiền Nhanh Từ Excel
          </h3>
          <p className="text-xs text-slate-500">
            Tính năng độc lập giúp Thầy tải file Excel cấu hình sẵn bất kỳ để tạo loạt QR chuyển khoản chính xác.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 border border-slate-200"
          >
            <Download size={14} />
            Tải mẫu Excel 📊
          </button>
          
          <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md shadow-indigo-100">
            <Upload size={14} />
            Chọn file Excel
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={processExcel} 
              className="hidden" 
            />
          </label>
        </div>
      </div>

      {qrItems.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* PHẦN DANH SÁCH BÊN TRÁI */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <h4 className="text-sm font-black text-slate-700 flex items-center gap-1.5">
                <FileSpreadsheet size={16} className="text-indigo-600" />
                Danh Sách Nhập Khẩu ({qrItems.length} Dòng)
              </h4>

              {/* Tìm kiếm nhanh */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text"
                  placeholder="Tìm kiếm dòng Excel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">Tải file Excel khác hoặc xóa danh sách hiện có</span>
              <button
                onClick={clearList}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold rounded-lg flex items-center gap-1 transition-all active:scale-95"
              >
                <Trash2 size={13} />
                Xóa Danh Sách
              </button>
            </div>

            {/* BẢNG HIỂN THỊ DỮ LIỆU */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                    <th className="p-3 w-10 text-center">STT</th>
                    <th className="p-3">Học sinh / Lớp</th>
                    <th className="p-3">Tài khoản đích</th>
                    <th className="p-3 text-right">Số tiền</th>
                    <th className="p-3 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                  {filteredItems.map((item, idx) => {
                    const isSelected = selectedItem && selectedItem.stt === item.stt;
                    return (
                      <tr 
                        key={item.stt}
                        className={`hover:bg-slate-50/50 transition-colors ${
                          isSelected ? 'bg-indigo-50/40 font-bold' : ''
                        }`}
                      >
                        <td className="p-3 text-center font-mono font-bold text-slate-400">
                          {item.stt}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">Lớp: {item.className}</div>
                        </td>
                        <td className="p-3 text-[11px]">
                          <div className="font-bold text-slate-700 font-mono">{item.accountNo}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{item.bankId} - {item.accountName}</div>
                        </td>
                        <td className="p-3 text-right font-black text-indigo-600">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedItem(item)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                            }`}
                          >
                            Xem QR
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PHẦN HIỂN THỊ QR BÊN PHẢI */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
              {selectedItem ? (
                <>
                  <div className="w-full text-left border-b border-slate-100 pb-3">
                    <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-md mb-1.5 uppercase">
                      Học sinh đang chọn
                    </span>
                    <h5 className="text-base font-black text-slate-800">
                      {selectedItem.stt}. {selectedItem.name}
                    </h5>
                    <div className="flex gap-4 text-xs font-bold text-slate-500 mt-1">
                      <span>Lớp: <b className="text-slate-700">{selectedItem.className}</b></span>
                      <span>Mã/Nội dung: <b className="text-emerald-600">{selectedItem.content}</b></span>
                    </div>
                  </div>

                  {/* THÔNG TIN CHUYỂN KHOẢN */}
                  <div className="grid grid-cols-2 gap-4 w-full bg-slate-50 p-3 rounded-xl border border-slate-100 text-left text-xs">
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Ngân hàng nhận</span>
                      <span className="font-extrabold text-slate-700">{selectedItem.bankName} ({selectedItem.bankId})</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Số TK / Chủ TK</span>
                      <span className="font-extrabold text-slate-700 font-mono block">{selectedItem.accountNo}</span>
                      <span className="text-[10px] text-slate-400 block truncate uppercase">{selectedItem.accountName}</span>
                    </div>
                  </div>

                  <div className="w-full text-left p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-800">Số tiền nộp học phí</span>
                    <span className="text-base font-black text-indigo-600">{formatCurrency(selectedItem.amount)}</span>
                  </div>

                  {/* ẢNH QR CODE */}
{selectedItem.amount > 0 ? (
  <div className="flex flex-col items-center">
    <div className="relative p-3 bg-white border border-slate-200/80 rounded-2xl shadow-md">
      <img 
        src={generateQrUrl(selectedItem)} 
        alt="Mã QR Chuyển Khoản" 
        className="w-52 h-52 object-contain rounded-lg"
        referrerPolicy="no-referrer"
      />
    </div>

    {/* Nếu nội dung rỗng hoặc chỉ có SEVQR -> Hiện hướng dẫn bằng văn bản bên dưới */}
    {(!selectedItem.content || selectedItem.content.trim() === 'SEVQR') && (
      <p className="mt-2 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-center">
        📌 Khi quét QR,Nội dung CK bắt buộc: <span className="font-mono text-indigo-700">SEVQR BQ+Số ĐT (VD: SEVQR BQ0988948882)</span>
      </p>
    )}
  </div>
) : (
                    <div className="p-6 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 text-xs font-bold flex flex-col items-center gap-2">
                      <AlertCircle size={20} />
                      <span>Dữ liệu dòng này có số tiền bằng 0. Vui lòng kiểm tra lại!</span>
                    </div>
                  )}

                  {/* NÚT IN CHUYÊN DỤNG CHO DÒNG ĐƠN LẺ */}
                  {selectedItem.amount > 0 && (
                    <div className="w-full space-y-2">
                      <div className="w-full flex gap-2">
                        <button
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>In Phiếu QR Học Phí - ${selectedItem.name}</title>
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
                                      <div class="title">SMARTEDU - PHIẾU QR THANH TOÁN</div>
                                      <div class="subtitle">Thanh toán tự động 24/7</div>
                                      <img class="qr" src="${generateQrUrl(selectedItem)}" />
                                      <div class="details">
                                        <div>Người nộp: <b>${selectedItem.name}</b> (Lớp ${selectedItem.className})</div>
                                        <div>Số tiền: <b>${formatCurrency(selectedItem.amount)}</b></div>
                                        <div>Ngân hàng đích: <b>${selectedItem.bankName} (${selectedItem.bankId})</b></div>
                                        <div>Số tài khoản: <b>${selectedItem.accountNo}</b></div>
                                        <div>Chủ tài khoản: <b>${selectedItem.accountName}</b></div>
                                        <div>Nội dung CK: <b>${selectedItem.content}</b></div>
                                        <hr style="border: 0; border-top: 1px dashed #ccc; margin: 10px 0;" />
                                        <div style="font-size:11px; color:#777; text-align:center;">Vui lòng mở ứng dụng ngân hàng và quét mã để thanh toán tự động</div>
                                      </div>
                                    </div>
                                    <script>window.onload = function() { window.print(); }</script>
                                  </body>
                                </html>
                              `);
                              printWindow.document.close();
                            }
                          }}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 text-xs border border-slate-200"
                        >
                          <Printer size={13} />
                          In phiếu QR lẻ
                        </button>

                        <button
                          onClick={() => handleDownloadSingle(selectedItem)}
                          disabled={downloadingSingle}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 text-xs border border-emerald-600 shadow-sm disabled:opacity-50 active:scale-95"
                        >
                          <Download size={13} />
                          {downloadingSingle ? "Đang tải..." : "Tải ảnh QR lẻ"}
                        </button>
                      </div>

                      {/* news2: Nút Tải phiếu học phí dạng PDF lẻ */}
                      <button
                        onClick={() => handleDownloadSinglePdf(selectedItem)}
                        disabled={downloadingSinglePdf}
                        className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs shadow-md shadow-indigo-100 disabled:opacity-50 active:scale-95"
                      >
                        <FileText size={14} />
                        {downloadingSinglePdf ? "Đang tạo PDF..." : "Tải Phiếu Học Phí PDF"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <QrCode size={48} className="opacity-20 mb-3 text-indigo-500 animate-pulse" />
                  <p className="font-bold text-xs max-w-[200px]">Chọn một dòng để hiển thị và in mã QR lẻ của học sinh</p>
                </div>
              )}
            </div>

            {/* SỬA LẦN 2: THIẾT KẾ CHO PHÉP IN / TẢI LOẠT MÃ QR HÀNG LOẠT TRÊN CÙNG MỘT TRANG SẠCH SẼ */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="border-b border-slate-50 pb-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Printer size={14} className="text-indigo-600" />
                  In / Tải Xuống Hàng Loạt ({qrItems.length} QR)
                </h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Sắp xếp để in hàng loạt sạch đẹp, hỗ trợ lưu thành file PDF</p>
              </div>

              {/* news1: Thay đổi khu vực in/đồng bộ hàng loạt để thêm nút PDF hàng loạt */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => window.print()}
                    className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 text-xs active:scale-95"
                  >
                    <Printer size={15} />
                    In Tất Cả QR
                  </button>
                  <button
                    onClick={handleDownloadBulk}
                    disabled={downloadingBulk}
                    className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 text-xs active:scale-95 disabled:opacity-50"
                  >
                    <Download size={15} />
                    {downloadingBulk ? `Đang tải (${bulkDownloadProgress}%)` : "Tải tất cả (ZIP)"}
                  </button>
                </div>

                {/* news2: Nút Tải tất cả phiếu PDF dưới dạng ZIP cho Excel Import */}
                <button
                  onClick={handleDownloadBulkPdf}
                  disabled={downloadingBulkPdf}
                  className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 text-xs active:scale-95 disabled:opacity-50"
                >
                  <FileText size={14} />
                  {downloadingBulkPdf ? `Đang nén PDF (${bulkPdfProgress}%)` : `Tải tất cả phiếu PDF (ZIP) (${qrItems.filter(item => item.amount > 0).length} HS)`}
                </button>
              </div>

              <div id="print-area-excel" className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-50 print:p-6 print:overflow-y-auto">
                {/* Style chuyên biệt cho bản in hàng loạt từ danh sách Excel */}
                <style>{`
                  @media print {
                    body {
                      background: white !important;
                      color: black !important;
                    }
                    /* Ẩn hoàn toàn giao diện Web chính của phần mềm khi in */
                    #root, aside, header, main, .lg\\:col-span-12, .bg-slate-100, .space-y-6, button {
                      display: none !important;
                    }
                    /* Chỉ hiển thị duy nhất vùng print-area-excel này */
                    #print-area-excel {
                      display: grid !important;
                      grid-template-columns: repeat(2, 1fr) !important;
                      gap: 20px !important;
                      padding: 10px !important;
                      margin: 0 !important;
                    }
                    .excel-print-card {
                      page-break-inside: avoid !important;
                      border: 1px solid #ccc !important;
                      border-radius: 12px !important;
                      padding: 15px !important;
                      background: white !important;
                      display: flex !important;
                      flex-direction: column !important;
                      align-items: center !important;
                      text-align: center !important;
                    }
                  }
                `}</style>

                {qrItems.map((item) => {
                  if (item.amount <= 0) return null;
                  return (
                    <div 
                      key={item.stt} 
                      className="excel-print-card bg-white border border-slate-200 p-4 rounded-xl flex flex-col items-center text-center space-y-3"
                    >
                      <div className="w-full text-left border-b border-slate-200 pb-2 flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-slate-800 text-xs block">{item.stt}. {item.name}</span>
                          <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Lớp: {item.className}</span>
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>

                      <img 
                        src={generateQrUrl(item)} 
                        alt={`QR ${item.name}`} 
                        className="w-36 h-36 object-contain bg-white p-1 rounded-lg border shadow-sm"
                        referrerPolicy="no-referrer"
                      />

                      <div className="w-full text-[9px] text-left text-slate-500 space-y-1 bg-slate-50 p-2 rounded border border-slate-100">
                        <div>Ngân hàng: <b className="text-slate-700">{item.bankName}</b></div>
                        <div>Số TK: <b className="text-slate-700 font-mono">{item.accountNo}</b></div>
                        <div className="truncate">Nội dung CK: <b className="text-indigo-600 font-mono">{item.content}</b></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-slate-100">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h4 className="text-base font-black text-slate-800">Chưa tải tệp dữ liệu Excel lên</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Thầy vui lòng tải tệp mẫu Excel có các cột STT, Họ và Tên, Lớp, Số tiền, BankID, Số TK, Tên Ngân hàng, Chủ TK(name), Nội dung CK xuống để điền thông tin và tải lên đây.
            </p>
          </div>
          <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md shadow-indigo-100">
            <Upload size={14} />
            Chọn file Excel
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={processExcel} 
              className="hidden" 
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default ImportQR;
