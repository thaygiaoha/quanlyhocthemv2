
export interface Student {
  stt: number;
  name: string;
  class: string;
  school: string;
  phoneNumber: string;
  attendance: (number | null)[];
  totalAmount: number;
  note?: string;
  code?: string;
  totalPaid?: number;
}

export interface ClassSheet {
  className: string;
  students: Student[];
  studentCount: number;
  headers?: string[];
}

export interface FeeConfig {
  className: string;
  fee: number;
}

export interface AppData {
  sheets: { [key: string]: ClassSheet };
  fees: FeeConfig[];
  passwordC2: string;
  sheetLink: string;
  bankId?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  // Thông tin bản quyền học tập
  idgv?: string;
  fullname?: string;
  mon?: string;
  idmon?: string;
  licenseStatus?: string; // "vip" hoặc các giá trị khác
  linkScript?: string;
  enableCopyrightCheck?: boolean; // Bật/tắt kiểm tra bản quyền toàn cục
  level?: string;
  hetHan?: string;
  checkBanquyen?: string;
}
export interface BankData {
  id: string;
  tk: string;
  link: string;
  bank: string;
  name: string;
}

export enum ViewMode {
  DASHBOARD = 'dashboard',
  IMPORT = 'import',
  LIST = 'list',
  ATTENDANCE = 'attendance',
  SETTINGS = 'settings',
  GEMINI_AI = 'gemini',
  PAYMENT_HISTORY = 'payment',
  QRCODE = 'qrcode',
  IMPORT_QR = 'import_qr',
  GVCN = 'gvcn'
}
