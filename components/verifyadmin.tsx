export const URL_ADMIN = import.meta.env?.VITE_API_URL_ADMIN || "https://script.google.com/macros/s/AKfycbxU1gFzMDIzYbWxAh70658gBw6czUAhyhud7VqbZWMD1OYlZfqDR5M7W7wfxz831e3gXA/exec"; 

// 2107them / 2207sua3: Xác thực tài khoản giáo viên qua sheet banquyen
export const verifyBanquyen = async (
  sheetLink: string, 
  idgv: string,
  password: string
): Promise<{ 
  success: boolean; 
  message: string; 
  idgv?: string; 
  fullname?: string; 
  mon?: string; 
  idmon?: string; 
  licenseStatus?: string; 
  linkScript?: string; 
  level?: string; // 2207them3
  hetHan?: string; // 2207them3
  checkBanquyen?: string; // 2207them3
}> => {
  if (!idgv.trim()) return { success: false, message: "Số điện thoại IDGV không được để trống!" };
  if (!password.trim()) return { success: false, message: "Mật khẩu không được để trống!" };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(sheetLink, {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({
        action: 'checkBanquyen',
        idgv: idgv,
        password: password
      })
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) return { success: false, message: "Lỗi kết nối Server mạng!" };

    const result = await response.json();
    return {
      success: result && result.success === true,
      message: result && result.message ? result.message : "Không có phản hồi từ hệ thống!",
      idgv: result?.idgv,
      fullname: result?.fullname,
      mon: result?.mon,
      idmon: result?.idmon,
      licenseStatus: result?.licenseStatus,
      linkScript: result?.linkScript,
      level: result?.level, // 2207them3
      hetHan: result?.hetHan, // 2207them3
      checkBanquyen: result?.checkBanquyen // 2207them3
    };

  } catch (err) {
    clearTimeout(timeoutId);
    console.error("Lỗi xác thực bản quyền:", err);
    return { success: false, message: "Hệ thống bận hoặc kết nối bị ngắt!" };
  }
};

// 2107them: Cập nhật link script cho giáo viên
export const updateLinkScriptOnSheet = async (
  sheetLink: string,
  idgv: string,
  password: string,
  newLinkScript: string
): Promise<{ success: boolean; message: string }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(sheetLink, {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({
        action: 'updateLinkScript',
        idgv: idgv,
        password: password,
        linkScript: newLinkScript
      })
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) return { success: false, message: "Lỗi kết nối Server mạng!" };

    const result = await response.json();
    return {
      success: result && result.success === true,
      message: result && result.message ? result.message : "Cập nhật thất bại!"
    };

  } catch (err) {
    clearTimeout(timeoutId);
    console.error("Lỗi cập nhật link script:", err);
    return { success: false, message: "Lỗi kết nối mạng khi cập nhật link script!" };
  }
};

export const verifyAdminPassword = async (
  sheetLink: string, 
  password: string
): Promise<{ success: boolean; message: string }> => { // Thay đổi kiểu trả về ở đây
  if (!password.trim()) return { success: false, message: "Mật khẩu không được để trống!" };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(sheetLink, {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({
        action: 'checkAdmin',
        password: password
      })
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) return { success: false, message: "Lỗi kết nối Server mạng!" };

    // Đọc dữ liệu JSON trả về từ GAS
    const result = await response.json();
    
    // Trả về đúng những gì GAS gửi qua, nếu thiếu thì backup bằng câu thông báo mặc định
    return {
      success: result && result.success === true,
      message: result && result.message ? result.message : "Không có phản hồi từ hệ thống!"
    };

  } catch (err) {
    clearTimeout(timeoutId);
    console.error("Lỗi xác thực:", err);
    return { success: false, message: "Hệ thống bận hoặc kết nối bị ngắt!" };
  }
};
