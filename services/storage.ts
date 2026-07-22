
import { AppData, Student, FeeConfig } from '../types';

const STORAGE_KEY = 'quan_ly_hoc_them_data';
const MY_SHEET_LINK = 'https://script.google.com/macros/s/AKfycbwlglx696Wr0BCj8SMAvwh1hlfFg66uemInbxI2W0TdE96wY67eZx_AAxxD5RJnl04NXg/exec';

const DEFAULT_DATA: AppData = {
  sheets: {},
  fees: [
    { className: 'Lop1', fee: 60000 },
    { className: 'Lop2', fee: 60000 },
    { className: 'Lop3', fee: 60000 },
    { className: 'Lop4', fee: 60000 },
    { className: 'Lop5', fee: 60000 },
    { className: 'Lop6', fee: 60000 },
    { className: 'Lop7', fee: 60000 },
    { className: 'Lop8', fee: 60000 },
    { className: 'Lop9', fee: 60000 },
    { className: 'Lop10', fee: 60000 },
    { className: 'Lop11', fee: 60000 },
    { className: 'Lop12', fee: 60000 },
  ],
  passwordC2: '',
  sheetLink: MY_SHEET_LINK
};
// Lấy danh sách tên tất cả các lớp mặc định từ DEFAULT_DATA
const ALL_DEFAULT_CLASSES = DEFAULT_DATA.fees.map(f => f.className);
export const getAppData = (): AppData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  let data: AppData;
  
  if (!stored) {
    data = DEFAULT_DATA;
  } else {
    try {
      data = JSON.parse(stored);
      // Luôn đảm bảo có link cloud mặc định
      if (!data.sheetLink || data.sheetLink.trim() === '') {
        data.sheetLink = MY_SHEET_LINK;
      }
      // Đồng bộ danh mục phí nếu thiếu
      //const classNames = ['Lop9', 'Lop10', 'Lop11', 'Lop12'];
      ALL_DEFAULT_CLASSES.forEach(name => {
        if (!data.fees.find(f => f.className === name)) {
          const def = DEFAULT_DATA.fees.find(f => f.className === name);
          if (def) data.fees.push(def);
        }
      });
    } catch (e) {
      data = DEFAULT_DATA;
    }
  }

  // Làm sạch dữ liệu rác và đảm bảo cấu trúc
  const cleanSheets: { [key: string]: any } = {};
  //const validGrades = ["Lop9", "Lop10", "Lop11", "Lop12"]; // Sao không dùng DEFAULT_DATA
  
  ALL_DEFAULT_CLASSES.forEach(grade => {
  if (data.sheets[grade]) {
    const students = (data.sheets[grade].students || []).filter((s: Student) => 
      s.name && 
      s.name.trim() !== "" &&
      s.code &&                                 // Kiểm tra code tồn tại
      String(s.code).trim() !== "" &&           // Check code khác rỗng (code <> "")
      !s.name.includes("68686868") && 
      !String(s.code).includes("68686868")
    );
    cleanSheets[grade] = { ...data.sheets[grade], students };
  } else {
    cleanSheets[grade] = { className: grade, students: [] };
  }
});
  
  data.sheets = cleanSheets;
  return data;
};

export const saveAppData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const extractGradeFromClassName = (className: string): string => {
  const match = className.match(/\d+/);
  if (!match) return 'LopKhac';
  return `Lop${match[0]}`;
};

export const calculateTotal = (attendance: (number | null)[], fee: number): number => {
  const attendedCount = attendance.filter(val => val === 1).length;
  return attendedCount * fee;
};

// Hàm hỗ trợ fetch với xử lý lỗi CORS và Redirect của Apps Script
const securePost = async (url: string, payload: any) => {
  // Sử dụng mode: 'no-cors' và Content-Type: 'text/plain' để tránh lỗi CORS Preflight trên Vercel
  return fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  });
};

export const fetchFromSheet = async (url: string): Promise<any> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Lỗi mạng');
    const result = await response.json();
    
    if (result.sheets) {
      const cleanSheets: any = {};
      
      // Duyệt qua toàn bộ các key hiện có từ API trả về (bao gồm cả lớp theo Tên hoặc theo Code ID)
      Object.keys(result.sheets).forEach(key => {
        const sheetData = result.sheets[key];
        const students = (sheetData.students || []).filter((s: any) => 
          s.name && String(s.code).trim() !== "68686868"
        );
        
        // Giữ nguyên key gốc (dù là mã code hay tên lớp) để tránh lệch map dữ liệu
        cleanSheets[key] = { 
          ...sheetData, 
          className: sheetData.className || key, 
          students 
        };
      });
      
      result.sheets = cleanSheets;
    }
    return result;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

export const syncSettingsToSheet = async (url: string, password: string, fees?: FeeConfig[]): Promise<any> => {
  try {
    await securePost(url, { action: 'updateSettings', password, fees });
    return { success: true };
  } catch (error) {
    throw error;
  }
};

export const syncAttendanceToSheet = async (url: string, className: string, students: any[]): Promise<any> => {
  try {
    await securePost(url, { 
      action: 'updateAttendance', 
      className, 
      students 
    });
    return { success: true };
  } catch (error) {
    throw error;
  }
};
