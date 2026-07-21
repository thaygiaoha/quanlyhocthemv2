/**
 * Hàm so sánh số STT ở đầu chuỗi (Chấp nhận mọi định dạng '01', '1', '01.', '1_')
 * @param nameChuoi Chuỗi chứa tên học sinh (VD: "01. Nguyễn Văn Hà", "1_Nguyễn Văn A")
 * @param sttValue Giá trị số thứ tự của học sinh (VD: 1, "01", 12)
 * @returns boolean (true nếu trùng số STT đầu chuỗi, ngược lại false)
 */
export const allcheck = (codeA: any, codeB: any): boolean => {
  const cleanA = String(codeA || '').trim().toLowerCase();
  const cleanB = String(codeB || '').trim().toLowerCase();
  return cleanA !== '' && cleanA === cleanB;
};
export const sendAdminAction = async (sheetLink: string, action: string, payload: object) => {
  try {
    const response = await fetch(sheetLink, {
      method: 'POST',
      body: JSON.stringify({
        action: action,
        ...payload // Đẩy hết data (mật khẩu, stt, số tiền, tên lớp...) vào đây
      })
    });
    
    if (!response.ok) return { success: false, message: "Lỗi kết nối server mạng!" };
    return await response.json(); // Trả về thẳng kết quả JSON từ GAS ({ success: true, message: "..." })
  } catch (err) {
    console.error("Lỗi kết nối:", err);
    return { success: false, message: "Không thể kết nối đến hệ thống Sheet!" };
  }
};
