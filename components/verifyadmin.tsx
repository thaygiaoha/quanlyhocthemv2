export const URL_ADMIN = import.meta.env?.VITE_API_URL_ADMIN || "https://script.google.com/macros/s/AKfycbwlglx696Wr0BCj8SMAvwh1hlfFg66uemInbxI2W0TdE96wY67eZx_AAxxD5RJnl04NXg/exec"; 

// 2107them / 2207sua3 / 2307sua1: Xác thực tài khoản giáo viên qua sheet banquyen (thử cả sheetLink và URL_ADMIN)
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
  
  // 2307them1: Danh sách các URL thử xác thực
  const targetUrls = Array.from(new Set([sheetLink, URL_ADMIN].filter(Boolean)));
  let lastResult = { success: false, message: "Không thể kết nối đến máy chủ xác thực!" };

  for (const url of targetUrls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify({
          action: 'checkBanquyen',
          idgv: idgv,
          password: password
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
          lastResult = {
            success: false,
            message: result.message || "Số điện thoại IDGV hoặc mật khẩu không chính xác!"
          };
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("2307sua1: Lỗi xác thực bản quyền tới", url, err);
    }
  }

  return lastResult;
};

// 2107them / 2307sua1: Cập nhật link script cho giáo viên vào cột G
export const updateLinkScriptOnSheet = async (
  sheetLink: string,
  idgv: string,
  password: string,
  newLinkScript: string
): Promise<{ success: boolean; message: string }> => {
  // 2307them1: Thử đồng bộ cột G lên cả URL_ADMIN và sheetLink của giáo viên
  const targetUrls = Array.from(new Set([URL_ADMIN, sheetLink].filter(Boolean)));
  let lastResult = { success: false, message: "Cập nhật link script thất bại!" };

  for (const url of targetUrls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
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

      if (response.ok) {
        const result = await response.json();
        if (result && result.success) {
          lastResult = {
            success: true,
            message: result.message || "Cập nhật Link Script vào cột G thành công!"
          };
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("2307sua1: Lỗi cập nhật link script tới", url, err);
    }
  }

  return lastResult;
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
