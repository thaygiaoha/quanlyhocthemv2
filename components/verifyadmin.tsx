export const URL_ADMIN = import.meta.env?.VITE_API_URL_ADMIN; // || "https://script.google.com/macros/s/AKfycbwlglx696Wr0BCj8SMAvwh1hlfFg66uemInbxI2W0TdE96wY67eZx_AAxxD5RJnl04NXg/exec"; 

/**
 * Xác thực tài khoản giáo viên qua sheet banquyen trên Google Sheet Admin (URL_ADMIN)
 */
export const verifyBanquyen = async (
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
  level?: string; 
  hetHan?: string; 
  checkBanquyen?: string; 
}> => {
  if (!idgv.trim()) return { success: false, message: "Số điện thoại IDGV không được để trống!" };
  if (!password.trim()) return { success: false, message: "Mật khẩu không được để trống!" };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(URL_ADMIN, {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({
        action: 'checkBanquyen',
        idgv: idgv.trim(),
        password: password.trim()
      })
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result && result.success) {
        return {
          success: true,
          message: result.message || "Xác thực thành công!",
          idgv: result?.idgv,
          fullname: result?.fullname,
          mon: result?.mon,
          idmon: result?.idmon,
          licenseStatus: result?.licenseStatus,
          linkScript: result?.linkScript,
          level: result?.level,
          hetHan: result?.hetHan,
          checkBanquyen: result?.checkBanquyen
        };
      } else if (result) {
        return {
          success: false,
          message: result.message || "Số điện thoại IDGV hoặc mật khẩu không chính xác!"
        };
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("Lỗi xác thực bản quyền tới URL_ADMIN:", err);
  }

  return { success: false, message: "Không thể kết nối đến máy chủ xác thực Admin!" };
};

/**
 * Cập nhật link script cho giáo viên trực tiếp vào cột G sheet banquyen trên Google Sheet Admin (URL_ADMIN)
 */
export const updateLinkScriptOnSheet = async (
  idgv: string,
  password: string,
  newLinkScript: string
): Promise<{ success: boolean; message: string }> => {
  if (!idgv.trim()) return { success: false, message: "Thiếu thông tin IDGV!" };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(URL_ADMIN, {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({
        action: 'updateLinkScript',
        idgv: idgv.trim(),
        password: password.trim(),
        linkScript: newLinkScript.trim()
      })
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result && result.success) {
        return {
          success: true,
          message: result.message || "Cập nhật Link Script vào cột G (Sheet Admin) thành công!"
        };
      } else if (result) {
        return {
          success: false,
          message: result.message || "Không thể cập nhật Link Script trên Sheet Admin."
        };
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("Lỗi cập nhật link script tới URL_ADMIN:", err);
  }

  return { success: false, message: "Lỗi kết nối tới máy chủ Admin!" };
};

export const verifyAdminPassword = async (
  targetUrl: string, 
  password: string
): Promise<{ success: boolean; message: string }> => {
  if (!password.trim()) return { success: false, message: "Mật khẩu không được để trống!" };
  if (!targetUrl) return { success: false, message: "Chưa cấu hình URL kết nối!" };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({
        action: 'checkAdmin',
        password: password
      })
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) return { success: false, message: "Lỗi kết nối Server mạng!" };

    const result = await response.json();
    return {
      success: result && result.success === true,
      message: result && result.message ? result.message : "Không có phản hồi từ hệ thống!"
    };

  } catch (err) {
    clearTimeout(timeoutId);
    console.error("Lỗi xác thực admin:", err);
    return { success: false, message: "Hệ thống bận hoặc kết nối bị ngắt!" };
  }
};

