import React from 'react';
import jsPDF from 'jspdf';
import JSZip from 'jszip';

// 1. Hàm chuẩn hóa tên không dấu
export const safeName = (str: string): string => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// 2. Interface thông tin học sinh & cấu hình QR
export interface StudentQRInfo {
  name: string;
  code?: string;
  stt?: number | string;
  class?: string;
  attendedCount?: number;
}

export interface QRConfig {
  bankId?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  student: StudentQRInfo;
  amount: number;
  lan?: string | number; // L1, L2... hoặc Đợt thu
  type?: 'hocthem' | 'gvcn'; // Loại QR: học thêm hoặc GVCN
  customContent?: string;
}

// 3. Hàm sinh nội dung chuyển khoản (addInfo)
export const generateQrContent = (config: QRConfig): string => {
  if (config.customContent) {
    return config.customContent.replace(/\s+/g, ' ').trim();
  }

  const { student, lan, type } = config;
  const studentCode = student.code || student.stt || "";
  const sname = safeName(student.name || "");
  const isGVCN = type === 'gvcn' || String(studentCode).toUpperCase().startsWith("CN");

  let lanStr = "";
  if (lan !== undefined && lan !== null && String(lan).trim() !== "") {
    const rawLan = String(lan).trim();
    lanStr = rawLan.toUpperCase().startsWith("L") ? rawLan : `L${rawLan}`;
  }

  if (isGVCN) {
    // Với GVCN: SEVQR [Mã/STT] [Lần/Đợt] [Tên] nop tien
    const parts = ['SEVQR', studentCode, lanStr, sname, 'nop tien'].filter(Boolean);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  } else {
    // Với Học thêm: const sname = safeName(student.name || ""); const content = `SEVQR ${student.code || student.stt} L${lan} ${sname} nop tien `;
    const parts = ['SEVQR', studentCode, lanStr, sname, 'nop tien'].filter(Boolean);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }
};

// 4. Hàm sinh URL VietQR
export const generateQrUrl = (config: QRConfig): string => {
  const bankId = config.bankId || 'Vietinbank';
  const bankAccountNo = config.bankAccountNo || '104887594225';
  const bankAccountName = config.bankAccountName || 'NGUYEN VAN HA';
  const cleanAmount = String(config.amount || 0).replace(/\D/g, "");
  const content = generateQrContent(config);

  return `https://img.vietqr.io/image/${bankId}-${bankAccountNo}-compact2.png?amount=${cleanAmount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(bankAccountName)}`;
};

// Hàm tiện ích tạo QR Học Thêm
export const generateQrUrlHocThem = (
  bankId: string,
  bankAccountNo: string,
  bankAccountName: string,
  student: StudentQRInfo,
  amount: number,
  lan: string | number
): string => {
  return generateQrUrl({
    bankId,
    bankAccountNo,
    bankAccountName,
    student,
    amount,
    lan,
    type: 'hocthem'
  });
};

// Hàm tiện ích tạo QR GVCN
export const generateQrUrlGVCN = (
  bankId: string,
  bankAccountNo: string,
  bankAccountName: string,
  student: StudentQRInfo,
  amount: number,
  lan?: string | number
): string => {
  return generateQrUrl({
    bankId,
    bankAccountNo,
    bankAccountName,
    student,
    amount,
    lan,
    type: 'gvcn'
  });
};

// 5. Hàm đặt tên file PDF tiêu chuẩn
export const getPdfFileName = (student: StudentQRInfo, lan?: string | number): string => {
  const rawCode = student.code ? student.code.trim() : "CHUA_CO_MA";
  const safeNameNoAccents = safeName(student.name || "");
  const lanStr = lan ? String(lan).trim() : "L1";
  return `${rawCode}.${lanStr}.${safeNameNoAccents}.pdf`;
};

// 6. Hàm sinh file PDF dạng Blob
export const generatePdfBlobForStudent = async (
  config: QRConfig,
  qrUrl?: string
): Promise<Blob> => {
  const finalQrUrl = qrUrl || generateQrUrl(config);
  const bankAccountName = (config.bankAccountName || "NGUYEN VAN HA").toUpperCase();
  const student = config.student;
  const amount = config.amount || 0;
  const isGVCN = config.type === 'gvcn' || String(student.code || "").toUpperCase().startsWith("CN");

  // Tải ảnh QR code và chuyển sang base64
  const res = await fetch(finalQrUrl);
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

  const studentSafeName = safeName(student.name || "").toUpperCase();

  // 1. Dải màu trang trí phía trên
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 8, 'F');

  // 2. Tiêu đề trường học / Thương hiệu
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text("SMARTEDU PRO - THAY NGUYEN VAN HA", 15, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Dang ky lop hoc them Thay Ha - Phone: 0988.948.882", 15, 27);
  doc.text("Address: Xuan Phu - Tan Tien - Bac Ninh", 15, 32);

  // Đường gạch ngang
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, 36, 195, 36);

  // 3. Tiêu đề phiếu thông báo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 27, 75);
  const pdfTitle = isGVCN 
    ? "PHIEU THONG BAO QUY LOP & MA QR" 
    : "PHIEU THONG BAO HOC PHI & MA QR";
  doc.text(pdfTitle, 105, 48, { align: 'center' });

  // 4. Khung thông tin học sinh
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

  doc.text("Ho va ten hoc sinh:", 22, 71);
  doc.setFont('helvetica', 'bold');
  doc.text(studentSafeName, 65, 71);

  doc.setFont('helvetica', 'normal');
  doc.text("Ma hoc sinh:", 22, 78);
  doc.setFont('helvetica', 'bold');
  doc.text(student.code || "---", 65, 78);

  doc.setFont('helvetica', 'normal');
  doc.text("Lop:", 22, 85);
  doc.setFont('helvetica', 'bold');
  doc.text(student.class || "---", 65, 85);

  if (student.attendedCount !== undefined) {
    doc.setFont('helvetica', 'normal');
    doc.text("So buoi di hoc:", 22, 92);
    doc.setFont('helvetica', 'bold');
    doc.text(`${student.attendedCount} buoi`, 65, 92);
  }

  // Số tiền nổi bật
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
  const formattedAmount = `${amount.toLocaleString('vi-VN')} VND`;
  doc.text(formattedAmount, 154, 78, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Trang thai: Cho chuyen khoan", 154, 88, { align: 'center' });

  // 5. Khung vẽ mã QR
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(55, 112, 100, 114, 4, 4, 'FD');

  doc.addImage(base64Data, 'PNG', 62, 118, 86, 86);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229);
  doc.text("MA QR QUET DE THANH TOAN TU DONG", 105, 218, { align: 'center' });

  // 6. Chú thích cuối trang
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.3);
  doc.line(15, 234, 195, 234);

  const infoContent = generateQrContent(config);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Noi dung chuyen khoan bat buoc:  ${infoContent.toUpperCase()}`, 105, 242, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Huong dan: Phu huynh dung ung dung Ngan hang (Mobile Banking) quet ma QR nay.", 105, 250, { align: 'center' });
  doc.text("He thong se tu dong ghi nhan so tien va nguoi nop ma khong can nhap thu cong.", 105, 255, { align: 'center' });

  doc.setFont('helvetica', 'oblique');
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229);
  doc.text("Xin tran trong cam on Quy Phu huynh hoc sinh!", 105, 268, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Phat trien boi SmartEdu Pro - Ho tro Thay co quan ly thong minh", 105, 282, { align: 'center' });

  return doc.output('blob');
};

// 7. Hàm tải lẻ 1 ảnh QR
export const downloadSingleQrImage = async (
  config: QRConfig,
  fileNamePrefix: string = "QR"
): Promise<void> => {
  const url = generateQrUrl(config);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network response was not ok");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    const sName = safeName(config.student.name || "").replace(/\s+/g, "_");
    a.download = `${fileNamePrefix}_${config.student.code || config.student.stt || ""}_${sName}_${config.amount}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error("Lỗi khi tải ảnh QR:", err);
    window.open(url, '_blank');
  }
};

// 8. Hàm tải lẻ 1 file PDF
export const downloadSingleQrPdf = async (
  config: QRConfig
): Promise<void> => {
  const url = generateQrUrl(config);
  const pdfBlob = await generatePdfBlobForStudent(config, url);
  const blobUrl = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = getPdfFileName(config.student, config.lan);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
};

// 9. Hàm tải hàng loạt ảnh QR dạng ZIP
export const downloadBulkQrImages = async (
  items: QRConfig[],
  zipName: string = "Danh_Sach_Ma_QR.zip",
  onProgress?: (percent: number) => void
): Promise<void> => {
  if (items.length === 0) return;
  const zip = new JSZip();
  let count = 0;

  for (const config of items) {
    try {
      const url = generateQrUrl(config);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch error");
      const blob = await res.blob();
      const sName = safeName(config.student.name || "").replace(/\s+/g, "_");
      const fileName = `${config.student.stt || count + 1}_${config.student.code || ""}_${sName}_${config.amount}.png`;
      zip.file(fileName, blob);
    } catch (e) {
      console.error(`Lỗi tải QR cho ${config.student.name}:`, e);
    }
    count++;
    if (onProgress) {
      onProgress(Math.round((count / items.length) * 100));
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  const blobUrl = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
};

// 10. Hàm tải hàng loạt PDF dạng ZIP
export const downloadBulkQrPdfs = async (
  items: QRConfig[],
  zipName: string = "Danh_Sach_Phieu_QR_PDF.zip",
  onProgress?: (percent: number) => void
): Promise<void> => {
  if (items.length === 0) return;
  const zip = new JSZip();
  let count = 0;

  for (const config of items) {
    try {
      const url = generateQrUrl(config);
      const pdfBlob = await generatePdfBlobForStudent(config, url);
      const fileName = getPdfFileName(config.student, config.lan);
      zip.file(fileName, pdfBlob);
    } catch (e) {
      console.error(`Lỗi tạo PDF cho ${config.student.name}:`, e);
    }
    count++;
    if (onProgress) {
      onProgress(Math.round((count / items.length) * 100));
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  const blobUrl = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
};

// 11. Component React hiển thị mã QR
export interface QRCodeDisplayProps {
  config: QRConfig;
  className?: string;
  size?: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ config, className = "", size = 200 }) => {
  const qrUrl = generateQrUrl(config);

  return (
    <div className={`flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm border border-slate-100 ${className}`}>
      <img
        src={qrUrl}
        alt={`Mã QR ${config.student.name}`}
        width={size}
        height={size}
        className="rounded-lg object-contain"
        referrerPolicy="no-referrer"
      />
      <div className="mt-2 text-center text-xs text-slate-600 font-medium">
        <p className="font-bold text-slate-800">{config.student.name}</p>
        <p className="text-emerald-600 font-bold">{config.amount.toLocaleString('vi-VN')} VNĐ</p>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
