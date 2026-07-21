import { GoogleGenAI } from "@google/genai";

export interface GeminiStudentData {
  stt: number;
  name: string;
  className: string;
  studentCode: string;
  sessions: number; // out of 10
  grades: { [key: string]: number | null }; // 'bài 1' to 'bài 6'
}

export const analyzeSingleStudent = async (
  student: GeminiStudentData,
  model: string = 'gemini-3.5-flash'
): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Không tìm thấy API Key của Gemini. Vui lòng cấu hình GEMINI_API_KEY trong Settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Lọc ra các điểm kiểm tra có dữ liệu số thực tế
  const activeGrades = Object.entries(student.grades)
    .filter(([_, val]) => val !== null && val !== undefined && !isNaN(Number(val)))
    .map(([key, val]) => `${key}: ${val}đ`)
    .join(', ');

  const prompt = `
    Bạn là một giáo viên chủ nhiệm, chuyên gia cố vấn học tập và tâm lý học đường giàu kinh nghiệm tại Việt Nam.
    Hãy phân tích học sinh sau:
    - Họ và tên: ${student.name}
    - Lớp học: ${student.className}
    - Mã học sinh: ${student.studentCode}
    - Số buổi tham gia: ${student.sessions}/10 buổi học (Tỷ lệ chuyên cần)
    - Điểm số các bài kiểm tra đợt này: ${activeGrades || "Chưa có dữ liệu điểm kiểm tra mới (Chỉ đánh giá qua mức chuyên cần)"}

    Hãy trả về kết quả phân tích bằng tiếng Việt, viết thật chuyên nghiệp, chân thành, truyền động lực học tập. Hãy tuân thủ cấu trúc sau:
    
    ### 1. PHÂN TÍCH TÌNH HÌNH HỌC TẬP
    [Đánh giá chi tiết sự chuyên cần và thái độ học tập dựa vào tỷ lệ đi học ${student.sessions}/10. Phân tích kết quả điểm số ${activeGrades || 'chưa có điểm'}, nêu rõ điểm mạnh, điểm yếu học tập hoặc xu hướng tiến bộ/sa sút nếu có.]

    ### 2. ĐÁNH GIÁ CHUNG
    [Tóm tắt nhận xét về năng lực học tập, ý thức tự giác và phân loại hiện tại: Tốt / Khá / Trung bình / Cần cố gắng nhiều.]

    ### 3. LỜI KHUYÊN & GIẢI PHÁP
    [Đưa ra 2-3 lời khuyên cực kỳ thiết thực, cá nhân hóa cho học sinh này để cải thiện kết quả, bồi dưỡng thêm kiến thức, hoặc duy trì phong độ xuất sắc.]
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Không thể phân tích dữ liệu lúc này.";
  } catch (error) {
    console.error("Gemini Single Analysis Error:", error);
    throw error;
  }
};

export const analyzeClassGeneral = async (
  students: GeminiStudentData[],
  model: string = 'gemini-3.5-flash'
): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Không tìm thấy API Key của Gemini. Vui lòng cấu hình GEMINI_API_KEY trong Settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Tạo tóm tắt thông tin cả lớp
  const studentListText = students.map(s => {
    const activeGrades = Object.entries(s.grades)
      .filter(([_, val]) => val !== null && val !== undefined && !isNaN(Number(val)))
      .map(([key, val]) => `${key}: ${val}`)
      .join(', ');
    return `- STT ${s.stt}: ${s.name} (Mã: ${s.studentCode}, Lớp: ${s.className}) | Học ${s.sessions}/10 buổi | Điểm: [${activeGrades || "Chưa có"}]`;
  }).join('\n');

  const prompt = `
    Bạn là một cố vấn giáo dục cao cấp chuyên nghiệp tại Việt Nam. Hãy phân tích tổng quan cho một lớp học dựa trên danh sách học viên sau:
    
    ${studentListText}

    Hãy đưa ra một báo cáo tổng quan bằng tiếng Việt có cấu trúc đẹp mắt, mang tính định hướng cao cho Thầy/Cô giáo chủ nhiệm:

    ### I. TỔNG QUAN SĨ SỐ & CHUYÊN CẦN
    [Nhận xét về tỉ lệ chuyên cần chung của lớp học, nhận diện các vấn đề về ý thức đi học hay chuyên cần nổi bật của tập thể.]

    ### II. PHÂN TÍCH CHẤT LƯỢNG HỌC TẬP CHUNG
    [Phân tích mặt bằng điểm số chung dựa vào điểm các đợt kiểm tra bài. Nêu rõ học sinh đang gặp khó khăn ở các bài kiểm tra nào, hay bài nào đạt kết quả khả quan nhất.]

    ### III. PHÂN LOẠI NHÓM HỌC VIÊN TIÊU BIỂU
    - **Nhóm Tiên Phong (Học tốt, đi học đầy đủ):** Chỉ rõ tên học sinh tiêu biểu cần tuyên dương trước lớp.
    - **Nhóm Cần Nâng Đỡ (Đi học ít hoặc điểm số thấp):** Chỉ rõ các học sinh cần đặc biệt chú ý, kèm theo lý do cụ thể.

    ### IV. KHUYẾN NGHỊ SƯ PHẠM CHO THẦY CÔ
    [Đề xuất giải pháp giảng dạy thực tiễn, cách tạo động lực, phương pháp hỗ trợ nhóm yếu và bồi dưỡng nhóm giỏi để nâng cao hiệu quả lớp học.]
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Không thể tạo báo cáo tổng quan lúc này.";
  } catch (error) {
    console.error("Gemini General Analysis Error:", error);
    throw error;
  }
};
