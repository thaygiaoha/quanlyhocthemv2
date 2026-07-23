
// @ts-nocheck
/**
 * GOOGLE APPS SCRIPT - PHIÊN BẢN CẬP NHẬT PHÍ & PASS
 */

var SPREADSHEET_ID = "11yDgsUC89JTQoxPLd8J6u4JD3F7joymzl6ky0SL9h0E";
var maxrowhs = 101;
var phibanquyen = 199000;


function getSS() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function doGet(e) {
  var ss = getSS();

  // Tự động đồng bộ và cập nhật bản quyền khi đồng bộ dữ liệu
  try {
    syncLicenseWithTransactionCN(ss);
  } catch (err) {
    console.error("Lỗi đồng bộ bản quyền doGet:", err.toString());
  }

  // 1. Lấy mật khẩu từ ô C2 sheet hocphi
  var feeSheet = ss.getSheetByName("hocphi");
  var passAdmin = feeSheet ? feeSheet.getRange("C2").getValue() : "12345@";

  var allSheets = ss.getSheets();
  var resultData = {
    sheets: {},
    password: String(passAdmin)
  };

  // Trả về trạng thái bản quyền nếu có truyền tham số idgv (số điện thoại)
  var idgvParam = (e && e.parameter && e.parameter.idgv) ? String(e.parameter.idgv).trim() : "";
  if (idgvParam) {
    var bqSheet = ss.getSheetByName("banquyen");
    if (bqSheet) {
      var bqLastRow = bqSheet.getLastRow();
      if (bqLastRow > 1) {
        var bqVals = bqSheet.getRange(2, 1, bqLastRow - 1, 7).getValues();
        for (var idx = 0; idx < bqVals.length; idx++) {
          if (String(bqVals[idx][0]).trim() === idgvParam) {
            resultData.licenseStatus = String(bqVals[idx][5]).trim();
            resultData.fullname = String(bqVals[idx][1]).trim();
            resultData.mon = String(bqVals[idx][3]).trim();
            resultData.idmon = String(bqVals[idx][4]).trim();
            resultData.linkScript = String(bqVals[idx][6]).trim();
            break;
          }
        }
      }
    }
  }

  // 2. Tự động quét TẤT CẢ các sheet có tên bắt đầu bằng "Lop"
  allSheets.forEach(function (sh) {
    var name = sh.getName();

    // Kiểm tra nếu tên sheet bắt đầu bằng "Lop" (ví dụ: Lop9, Lop10.1, Lop12...)
    if (name.indexOf("Lop") === 0) {
      // 💥 BƯỚC CẢI TIẾN: Tìm dòng cuối thực tế có học sinh dựa riêng vào cột B (Cột số 2)
      var maxRows = sh.getMaxRows();
      var lastRowWithStudents = sh.getRange(maxRows, 2).getNextDataCell(SpreadsheetApp.Direction.UP).getRow();

      // Nếu dòng cuối nhỏ hơn 2 (tức là lớp trống, chỉ có dòng tiêu đề), gán bằng 1
      if (lastRowWithStudents < 2 || sh.getRange(2, 2).getValue() === "") {
        lastRowWithStudents = 1;
      }

      // Chỉ lấy đúng số dòng chứa học sinh thực tế (17 cột từ A đến Q)
      var min = Math.min(lastRowWithStudents, maxrowhs);
      var vals = sh.getRange(1, 1, min, 17).getValues();
      var students = [];


      // Bỏ qua dòng tiêu đề (i=1)
      for (var i = 1; i < vals.length; i++) {
        var row = vals[i];
        if (!row[1]) continue; // Nếu không có tên học sinh thì bỏ qua
        let stt = String(row[0]).trim();

        // Chuyển đổi stt sang dạng số để kiểm tra chính xác giá trị nhỏ hơn 10
        var sttNum = Number(stt) || 0;
        if (!isNaN(sttNum) && sttNum < 10) {
          stt = "0" + String(sttNum);
        }
        students.push({
          stt: stt,
          name: row[1],
          class: row[2],
          school: row[3],
          phoneNumber: String(row[4]),
          code: String(row[5]),
          // Xử lý điểm danh: chuyển 1 -> 1, 0 -> 0, còn lại -> null
          attendance: row.slice(6, 16).map(function (v) {
            return (v === "" || v === null) ? null : (Number(v) === 1 ? 1 : 0);
          }),
          totalAmount: Number(row[16]) || 0
        });
      }
      var headers = [];
      if (vals.length > 0) {
        headers = vals[0].slice(6, 16).map(function (v) {
          if (v instanceof Date) {
            return Utilities.formatDate(v, Session.getScriptTimeZone(), "dd/MM/yy");
          }
          var str = String(v || "").trim();
          var matchDate = str.match(/^(\d{1,2})\/(\d{1,2})/);
          if (matchDate) {
            var day = matchDate[1].padStart(2, '0');
            var month = matchDate[2].padStart(2, '0');
            var matchYear = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
            if (matchYear) {
              return day + "/" + month + "/" + matchYear[3].slice(-2);
            }
            return day + "/" + month;
          }
          return str;
        });
      }

      var studentCount = students.length;
      resultData.sheets[name] = {
        className: name,
        studentCount: studentCount,
        students: students,
        headers: headers
      };
    }
    // TRƯỜNG HỢP 2: Xử lý riêng biệt cho sheet "ThuTien" (Không đổi cấu trúc sheet gốc của thầy)
    else if (name === "ThuTien") {
      // Tự động cập nhật vào sheet(ThuTien) từ sheet(transactionkd) trước khi đọc hiển thị
      try {
        syncThuTienWithTransactionKD(ss);
      } catch (err) {
        console.error("Lỗi đồng bộ ThuTien:", err.toString());
      }

      var vals = sh.getDataRange().getValues();
      var logs = [];

      if (vals.length > 1) {
        // Duyệt từ hàng thứ 2 để bỏ qua hàng tiêu đề
        for (var i = 1; i < vals.length; i++) {
          var row = vals[i];
          // Cột E (Họ và tên) không được rỗng thì mới xử lý
          if (!row[2]) continue;

          var dateVal = row[0];
          // Chuẩn hóa định dạng ngày tháng ra chuỗi dd/MM/yyyy
          if (dateVal instanceof Date) {
            dateVal = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "dd/MM/yyyy");
          } else {
            dateVal = String(dateVal).trim();
          }
          //sheet.appendRow(["Date", "STT", "Họ và tên", "Lớp", "Lần nộp", "Số tiền"]);
          logs.push({
            date: dateVal,                       // Cột A: Date
            lanNop: String(row[4]).trim(),        // Cột B: Lần nộp (L1, L2, L3,...)
            soTien: Number(row[5]) || 0,          // Cột C: Số tiền
            lop: String(row[3]).trim(),           // Cột D: Lớp (9, 10, 11, 12)
            name: String(row[2]).trim(),
            code: String(row[6]).trim() || ""          // Cột E: Họ và tên (Ví dụ: "01. Nguyễn Văn A")
          });
        }
      }
      // Gom gọn dữ liệu nhật ký nộp tiền vào cấu trúc sheet chung
      resultData.sheets[name] = { students: logs };
    }
    // Xử lý riêng biệt cho sheet "GVCN" (Chủ nhiệm) để hiển thị danh sách nộp tiền
    else if (name === "GVCN") {
      // 1907GVCN: Tự động đồng bộ số tiền nộp từ sheet transactioncn mới nhất theo mã HS trước khi đọc hiển thị
      try {
        syncGVCNWithTransactionCN(ss);
      } catch (err) {
        console.error("Lỗi đồng bộ 1907GVCN:", err.toString());
      }

      var vals = sh.getDataRange().getValues();
      var gvcnStudents = [];

      if (vals.length > 1) {
        for (var i = 1; i < vals.length; i++) {
          var row = vals[i];
          if (!row[1]) continue; // Bỏ qua nếu Họ và tên trống
          gvcnStudents.push({
            stt: Number(row[0]) || i,
            name: String(row[1]).trim(),
            class: String(row[2]).trim(),
            code: String(row[3]).trim(),
            totalAmount: Number(row[4]) || 0, // Số tiền nộp bản chất là totalAmount
            note: String(row[5] || "").trim(),
            totalPaid: Number(row[6]) || 0 // Tổng nộp
          });
        }
      }
      resultData.sheets[name] = { className: "GVCN", students: gvcnStudents, studentCount: gvcnStudents.length };
    }
  });

  // 3. Trả về dữ liệu dạng JSON cho App
  return ContentService.createTextOutput(JSON.stringify(resultData))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = getSS();
  var postData = null;
  var rawContents = "";

  try {
    if (e.postData && e.postData.contents) {
      rawContents = e.postData.contents;
      postData = JSON.parse(rawContents);
    } else {
      postData = e.parameter;
      rawContents = JSON.stringify(postData);
    }
  } catch (err) {
    return createResponse("Lỗi phân tích JSON: " + err.toString(), 400);
  }

  var action = postData.action;
  // XỬ LÝ QUẢN LÝ DANH SÁCH GVCN
  if (action === "importGVCN") {
    var inputPassword = postData.password;
    var adminSheet = ss.getSheetByName("hocphi");
    var passAdmin = adminSheet ? String(adminSheet.getRange("C2").getValue()).trim() : "12345@";

    if (String(inputPassword).trim() !== passAdmin) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Mật khẩu Admin không chính xác!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = ss.getSheetByName("GVCN");
    if (!sheet) {
      sheet = ss.insertSheet("GVCN");
    } else {
      // Xóa toàn bộ dữ liệu từ dòng 2 trở đi
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
      }
    }

    // Đảm bảo hàng tiêu đề chuẩn
    sheet.getRange(1, 1, 1, 7).setValues([["STT", "Họ và tên", "Lớp", "Mã HS", "Số tiền nộp", "Ghi chú", "Tổng nộp"]]);
    sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f3f3f3");

    var students = postData.data || [];
    var rowsToAdd = [];
    for (var i = 0; i < students.length; i++) {
      var s = students[i];
      rowsToAdd.push([
        i + 1,
        String(s.name || "").trim(),
        String(s.class || "").trim(),
        String(s.code || "").trim(),
        Number(s.totalAmount) || 0,
        String(s.note || "").trim(),
        Number(s.totalPaid || s.totalAmount) || 0 // Nếu không truyền totalPaid, mặc định dùng totalAmount
      ]);
    }

    if (rowsToAdd.length > 0) {
      sheet.getRange(2, 1, rowsToAdd.length, 7).setValues(rowsToAdd);
    }

    sheet.autoResizeColumns(1, 7);
    var lastRow = sheet.getLastRow();
    if (lastRow > 0) {
      sheet.setRowHeights(1, lastRow, 26);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã nhập và thay thế hoàn toàn " + rowsToAdd.length + " học sinh vào sheet GVCN thành công!"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Thêm thủ công học sinh vào GVCN sheet
  if (action === "addGVCNStudent") {
    var inputPassword = postData.password;
    var adminSheet = ss.getSheetByName("hocphi");
    var passAdmin = adminSheet ? String(adminSheet.getRange("C2").getValue()).trim() : "12345@";

    if (String(inputPassword).trim() !== passAdmin) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Mật khẩu Admin không chính xác!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = ss.getSheetByName("GVCN");
    if (!sheet) {
      sheet = ss.insertSheet("GVCN");
      sheet.appendRow(["STT", "Họ và tên", "Lớp", "Mã HS", "Số tiền nộp", "Ghi chú", "Tổng nộp"]);
      sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f3f3f3");
    }

    var s = postData.student;
    var vals = sheet.getDataRange().getValues();

    // Kiểm tra trùng mã học sinh trong GVCN sheet
    var inputCode = String(s.code || "").trim().toLowerCase();
    if (inputCode !== "") {
      for (var i = 1; i < vals.length; i++) {
        var existingCode = String(vals[i][3] || "").trim().toLowerCase(); // Cột D (Mã HS)
        if (existingCode === inputCode) {
          return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: "Mã học sinh " + s.code + " đã tồn tại trong danh sách GVCN!"
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    var nextSTT = vals.length;
    var newRow = [
      nextSTT,
      String(s.name || "").trim(),
      String(s.class || "").trim(),
      String(s.code || "").trim(),
      Number(s.totalAmount) || 0,
      String(s.note || "").trim(),
      Number(s.totalPaid || s.totalAmount) || 0
    ];

    sheet.appendRow(newRow);
    sheet.autoResizeColumns(1, 7);
    var lastRow = sheet.getLastRow();
    sheet.setRowHeights(1, lastRow, 26);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã thêm thành công học sinh " + s.name + " vào danh sách GVCN!"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Sửa học sinh GVCN
  if (action === "updateGVCNStudent") {
    var inputPassword = postData.password;
    var adminSheet = ss.getSheetByName("hocphi");
    var passAdmin = adminSheet ? String(adminSheet.getRange("C2").getValue()).trim() : "12345@";

    if (String(inputPassword).trim() !== passAdmin) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Mật khẩu Admin không chính xác!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = ss.getSheetByName("GVCN");
    if (!sheet) return createResponse("Lỗi: Không tìm thấy sheet GVCN", 404);

    var s = postData.student;
    var vals = sheet.getDataRange().getValues();
    var foundIndex = -1;

    // Tìm theo code cũ (trước khi đổi)
    var oldCode = String(postData.oldCode || s.code).trim().toLowerCase();
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][3]).trim().toLowerCase() === oldCode) {
        foundIndex = i + 1;
        break;
      }
    }

    if (foundIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Không tìm thấy học sinh để sửa!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Kiểm tra trùng mã học sinh (nếu mã thay đổi)
    var inputCode = String(s.code || "").trim().toLowerCase();
    if (inputCode !== oldCode) {
      for (var i = 1; i < vals.length; i++) {
        if (i + 1 !== foundIndex) {
          var existingCode = String(vals[i][3] || "").trim().toLowerCase();
          if (existingCode === inputCode) {
            return ContentService.createTextOutput(JSON.stringify({
              success: false,
              message: "Mã học sinh mới " + s.code + " đã trùng với học sinh khác!"
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
    }

    sheet.getRange(foundIndex, 2).setValue(String(s.name || "").trim());
    sheet.getRange(foundIndex, 3).setValue(String(s.class || "").trim());
    sheet.getRange(foundIndex, 4).setValue(String(s.code || "").trim());
    sheet.getRange(foundIndex, 5).setValue(Number(s.totalAmount) || 0);
    sheet.getRange(foundIndex, 6).setValue(String(s.note || "").trim());
    sheet.getRange(foundIndex, 7).setValue(Number(s.totalPaid) || 0);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã cập nhật thông tin học sinh " + s.name + " thành công!"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Xóa học sinh GVCN
  if (action === "deleteGVCNStudent") {
    var inputPassword = postData.password;
    var adminSheet = ss.getSheetByName("hocphi");
    var passAdmin = adminSheet ? String(adminSheet.getRange("C2").getValue()).trim() : "12345@";

    if (String(inputPassword).trim() !== passAdmin) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Mật khẩu Admin không chính xác!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = ss.getSheetByName("GVCN");
    if (!sheet) return createResponse("Lỗi: Không tìm thấy sheet GVCN", 404);

    var code = String(postData.code || "").trim().toLowerCase();
    var vals = sheet.getDataRange().getValues();
    var foundIndex = -1;

    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][3]).trim().toLowerCase() === code) {
        foundIndex = i + 1;
        break;
      }
    }

    if (foundIndex !== -1) {
      sheet.deleteRow(foundIndex);

      // Đánh lại STT ở cột A
      var newValues = sheet.getDataRange().getValues();
      var count = 1;
      for (var j = 1; j < newValues.length; j++) {
        if (newValues[j][1]) {
          sheet.getRange(j + 1, 1).setValue(count);
          count++;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Đã xóa học sinh thành công!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Không tìm thấy học sinh cần xóa!"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  // =========================================================================
  // resetgvcn: Xóa toàn bộ dữ liệu đúng 1 cột là cột số tiền nộp (cột E) trong sheet GVCN để kiểm soát lần nộp mới, cột tổng nộp vẫn còn
  if (action === "resetGVCN") {
    var inputPassword = postData.password;
    var adminSheet = ss.getSheetByName("hocphi");
    var passAdmin = adminSheet ? String(adminSheet.getRange("C2").getValue()).trim() : "12345@";

    if (String(inputPassword).trim() !== passAdmin) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Mật khẩu Admin không chính xác!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1907GVCN: Thực hiện copy toàn bộ dữ liệu sheet(transactioncn) sang hàng tiếp theo của sheet(luutransaction) (không tiêu đề), sau đó xóa dữ liệu sheet(transactioncn)
    try {
      var txSheet = ss.getSheetByName("transactioncn");
      if (txSheet) {
        var txLastRow = txSheet.getLastRow();
        if (txLastRow > 1) {
          var luuSheet = ss.getSheetByName("luutransaction");
          if (!luuSheet) {
            luuSheet = ss.insertSheet("luutransaction");
            luuSheet.appendRow(["ID", "Ngân Hàng", "Số Tài Khoản", "Số Tiền", "Loại", "Ngày", "Mô Tả"]);
            luuSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f3f3f3");
          }

          var txData = txSheet.getRange(2, 1, txLastRow - 1, 7).getValues();
          var luuLastRow = luuSheet.getLastRow();
          // Sao chép dữ liệu giao dịch sang hàng tiếp theo
          luuSheet.getRange(luuLastRow + 1, 1, txData.length, 7).setValues(txData);
          // Xóa toàn bộ dữ liệu trong sheet transactioncn (giữ lại tiêu đề hàng 1)
          txSheet.getRange(2, 1, txLastRow - 1, 7).clearContent();
        }
      }
    } catch (err) {
      console.error("Lỗi 1907GVCN reset lưu trữ giao dịch:", err.toString());
    }

    var sheet = ss.getSheetByName("GVCN");
    if (!sheet) return createResponse("Lỗi: Không tìm thấy sheet GVCN", 404);

    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      // resetgvcn / 1907GVCN: Cột E (cột số 5) là cột Số tiền nộp. Đặt toàn bộ giá trị về 0
      sheet.getRange(2, 5, lastRow - 1, 1).setValue(0);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã resetgvcn (1907GVCN): Lưu trữ và làm sạch sheet transactioncn thành công, đặt số tiền nộp lớp GVCN về 0!"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  // =========================================================================
  // resetTransactionKD - Chuyển giao dịch từ transactionkd sang luutransaction và xóa sạch transactionkd
  if (action === "resetTransactionKD") {
    var inputPassword = postData.password;
    var adminSheet = ss.getSheetByName("hocphi");
    var passAdmin = adminSheet ? String(adminSheet.getRange("C2").getValue()).trim() : "12345@";

    if (String(inputPassword).trim() !== passAdmin) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Mật khẩu Admin không chính xác!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    try {
      var txSheet = ss.getSheetByName("transactionkd");
      if (!txSheet) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: "Lỗi: Không tìm thấy sheet transactionkd"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var txLastRow = txSheet.getLastRow();
      if (txLastRow > 1) {
        var luuSheet = ss.getSheetByName("luutransaction");
        if (!luuSheet) {
          luuSheet = ss.insertSheet("luutransaction");
          luuSheet.appendRow(["Mã tham chiếu", "Ngân hàng", "Số tài khoản", "Số tiền", "Loại", "Ngày giao dịch", "Nội dung thanh toán"]);
          luuSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f3f3f3");
        }

        var txData = txSheet.getRange(2, 1, txLastRow - 1, 10).getValues();
        var rowsToSave = [];

        for (var i = 0; i < txData.length; i++) {
          var row = txData[i];
          var maThamChieu = String(row[8] || "").trim();
          var nganHang = String(row[0] || "").trim();
          var soTaiKhoan = String(row[2] || "").trim();
          var soTien = Number(row[7]) || 0;
          var loai = String(row[6] || "").trim();
          var ngayGiaoDich = row[1];
          if (ngayGiaoDich instanceof Date) {
            ngayGiaoDich = Utilities.formatDate(ngayGiaoDich, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
          } else {
            ngayGiaoDich = String(ngayGiaoDich || "").trim();
          }
          var noiDung = String(row[5] || "").trim();

          rowsToSave.push([
            maThamChieu,
            nganHang,
            "'" + soTaiKhoan,
            soTien,
            loai,
            ngayGiaoDich,
            noiDung
          ]);
        }

        var luuLastRow = luuSheet.getLastRow();
        if (luuLastRow === 0) {
          luuSheet.appendRow(["Mã tham chiếu", "Ngân hàng", "Số tài khoản", "Số tiền", "Loại", "Ngày giao dịch", "Nội dung thanh toán"]);
          luuSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f3f3f3");
          luuLastRow = 1;
        }

        luuSheet.getRange(luuLastRow + 1, 1, rowsToSave.length, 7).setValues(rowsToSave);
        txSheet.getRange(2, 1, txLastRow - 1, 10).clearContent();

        luuSheet.autoResizeColumns(1, 7);
        luuSheet.setRowHeights(1, luuSheet.getLastRow(), 26);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Đã resetTransactionKD: Chuyển xong các giao dịch sang sheet luutransaction và làm sạch sheet transactionkd thành công!"
      })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Lỗi resetTransactionKD: " + err.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ================= BỔ SUNG: XỬ LÝ GHI ĐÈ / THÊM MỚI NHẬT KÝ HỌC PHÍ =================
  if (action === "addPayment") {
    var inputPassword = postData.password;
    var adminSheet = ss.getSheetByName("hocphi");
    var passAdmin = adminSheet ? String(adminSheet.getRange("C2").getValue()).trim() : "12345@";

    if (String(inputPassword).trim() !== passAdmin) {
      return createResponse("Mật khẩu Admin không chính xác!", 403);
    }

    var sheet = ss.getSheetByName("ThuTien");
    if (!sheet) {
      sheet = ss.insertSheet("ThuTien");
      sheet.appendRow(["Date", "STT", "Họ và tên", "Lớp", "Lần nộp", "Số tiền", "Mã HS"]);
      sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f3f3f3");
    }

    var vals = sheet.getDataRange().getValues();
    var targetStt = String(postData.stt).trim();
    var targetLan = String(postData.lanNop).trim();
    var targetLop = String(postData.lop).trim();
    var targetCode = String(postData.code).trim();
    var foundIndex = -1;

    // Quét tìm học sinh theo lớp, lần nộp và 2 số đầu STT để chuẩn bị ghi đè
    for (var i = 1; i < vals.length; i++) {
      var rowCode = String(vals[i][6]).trim();

      if (rowCode === targetCode) {
        foundIndex = i + 1;
        break;
      }
    }

    var currentDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

    if (foundIndex !== -1) {
      // Ghi đè số tiền và làm mới ngày giao dịch
      sheet.getRange(foundIndex, 1).setValue(currentDate);
      sheet.getRange(foundIndex, 6).setValue(Number(postData.soTien));
      sheet.getRange(foundIndex, 7).setValue(postData.code);
      return createResponse("Đã ghi đè số tiền học phí thành công!", 200);
    } else {
      //sheet.appendRow(["Date", "STT", "Họ và tên", "Lớp", "Lần nộp", "Số tiền"]);
      // Thêm dòng mới nếu chưa từng nộp lần này
      sheet.appendRow([
        currentDate,
        "'" + targetStt,
        postData.name,
        targetLop,
        targetLan,
        Number(postData.soTien),
        postData.code
      ]);

      // Thay thế lệnh autoResizeRows(1, maxrowhs - 1 bằng lệnh setRowHeights để dãn dòng đều đặn, đẹp mắt:
      var lastRow = sheet.getLastRow();
      sheet.setRowHeights(1, lastRow, 26); // Đặt tất cả maxrowhs dòng có chiều cao 26px cực đẹp
      return createResponse("Đã ghi nhận số tiền mới thành công!", 200);
    }
  }
  // ===================================================================================
  if (action === "deleteStudent") {
    var targetSheetName = postData.className;
    var studentName = postData.studentName;
    var code = String(postData.studentCode || "").trim();
    var inputPassword = postData.password;

    var adminSheet = ss.getSheetByName("hocphi");
    var passAdmin = adminSheet ? String(adminSheet.getRange("C2").getValue()).trim() : "";
    if (!inputPassword || String(inputPassword).trim() !== String(passAdmin)) {
      return createResponse("Mật khẩu Admin không chính xác! Không thể xóa học sinh.", 403);
    }

    var sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) return createResponse("Lỗi: Không tìm thấy lớp", 404);

    var values = sheet.getDataRange().getValues();
    var foundIndex = -1;

    // Tìm hàng chứa học sinh khớp tên và số điện thoại (chỉ quét bảng chính trước hàng maxrowhs - 1)
    for (var i = 1; i < values.length; i++) {
      if (i >= maxrowhs) break;
      if (String(values[i][5]).trim() === code) {
        foundIndex = i + 1; // Đổi sang index của Sheet (1-based)
        break;
      }
    }

    if (foundIndex !== -1) {
      // 2207themdelete: Sao lưu dữ liệu nhật ký điểm danh từ cột R (18) đến cột AI (35) trước khi xóa dòng
      var maxRow = Math.max(sheet.getLastRow(), 1);
      var backupRange = sheet.getRange(1, 18, maxRow, 18); // 18 cột: R(18) đến AI(35)
      var backupValues = backupRange.getValues();
      var backupFormulas = backupRange.getFormulas();

      // 2207suadelete: Xóa hàng học sinh
      sheet.deleteRow(foundIndex);

      // 2207themdelete: Khôi phục lại nhật ký điểm danh từ cột R đến cột AI từ dữ liệu sao lưu
      var targetRange = sheet.getRange(1, 18, backupValues.length, 18);
      targetRange.setValues(backupValues);
      for (var r = 0; r < backupFormulas.length; r++) {
        for (var c = 0; c < backupFormulas[r].length; c++) {
          if (backupFormulas[r] && backupFormulas[r][c] && String(backupFormulas[r][c]).indexOf("=") === 0) {
            sheet.getRange(r + 1, 18 + c).setFormula(backupFormulas[r][c]);
          }
        }
      }

      // Đánh lại số thứ tự (STT) ở cột A cho các học sinh còn lại trong bảng chính
      var newValues = sheet.getDataRange().getValues();
      var count = 1;
      for (var j = 1; j < newValues.length; j++) {
        if (j >= maxrowhs) break; // Chỉ đánh số bảng chính
        if (newValues[j][1]) { // Nếu có tên học sinh
          sheet.getRange(j + 1, 1).setValue(count);
          count++;
        }
      }
      return createResponse("Đã xóa học sinh " + studentName + " thành công!", 200);
    }
    return createResponse("Không tìm thấy học sinh cần xóa trên hệ thống.", 444);
  }
  // Cập nhật cả mật khẩu và học phí
  if (action === "updateSettings") {
    var feeSheet = ss.getSheetByName("hocphi");
    if (feeSheet) {
      // 1. Cập nhật mật khẩu vào C2
      if (postData.password !== undefined && postData.password !== null) {
        feeSheet.getRange("C2").setValue(postData.password);
      }

      // 2. Cập nhật học phí theo từng lớp
      if (postData.fees && postData.fees.length > 0) {
        var rangeA = feeSheet.getRange("A:A").getValues(); // Lấy hết cột A để tìm tên lớp

        postData.fees.forEach(function (item) {
          if (!item || item.className === undefined) return;
          var searchClassName = String(item.className).trim().toLowerCase();

          for (var i = 0; i < rangeA.length; i++) {
            var rowClassName = String(rangeA[i][0] || "").trim().toLowerCase();
            // So sánh linh hoạt tên lớp (ví dụ: Lop10, Lop 10, Lớp 10)
            if (rowClassName === searchClassName || rowClassName.replace(/\s+/g, '') === searchClassName.replace(/\s+/g, '')) {
              var newFee = Number(item.fee);
              if (!isNaN(newFee)) {
                feeSheet.getRange(i + 1, 2).setValue(newFee);
              }
              var sheet = ss.getSheetByName(item.className);
              if (sheet && sheet.getLastRow() > 1) {
                try {
                  capNhatHocPhiSauDiemDanh(item.className, ss);
                } catch (err) {
                  console.error("Lỗi capNhatHocPhiSauDiemDanh:", err.toString());
                }
              }
              break;
            }
          }
        });
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Cập nhật Mật khẩu Admin C2 và Mức học phí thành công!"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    return createResponse("Không tìm thấy sheet hocphi", 404);
  }
  // Nhập danh sách thủ công
  // HÀNH ĐỘNG MỚI: Thêm thủ công 1 học sinh (Nối đuôi, không xóa dữ liệu cũ)  
  if (action === "addManualStudent") {
    var s = postData.data;
    var sheetName = s.targetSheet;
    var sheet = ss.getSheetByName(sheetName);
    var code = s.code;

    // Tự tạo sheet nếu lớp này chưa từng tồn tại trên Cloud
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(["STT", "name", "class", "school", "phoneNumber", "code", "Ngày 1", "Ngày 2", "Ngày 3", "Ngày 4", "Ngày 5", "Ngày 6", "Ngày 7", "Ngày 8", "Ngày 9", "Ngày 10", "tongtien"]);
      sheet.getRange("A1:Q1").setFontWeight("bold").setBackground("#f3f3f3");
    }
    var vals = sheet.getRange(1, 1, maxrowhs, 17).getValues();
    var hsRow = vals.filter(function (row) {
      return row[1] !== undefined && row[1] !== null && String(row[1]).trim() !== "";
    }).length;
    if (hsRow >= maxrowhs) {
      // Trả về JSON có chứa success: true
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Số học sinh của " + sheetName + " đã đạt giới hạn tối đa maxrowhs - 1 nhé. Đề nghị tạo lớp mới " + sheetName + ".1 chẳng hạn!"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    var inputCode = String(s.code || "").trim().toLowerCase();
    if (inputCode !== "") {
      // Duyệt qua tất cả các dòng hiện có học sinh để lọc trùng mã
      for (var i = 1; i < vals.length; i++) {
        if (vals[i][1] !== "" && vals[i][1] !== null) {
          var existingCode = String(vals[i][5] || "").trim().toLowerCase();
          if (existingCode === inputCode) {
            return ContentService.createTextOutput(JSON.stringify({
              success: false,
              message: "Mã học sinh " + s.code + " đã tồn tại trong danh sách lớp " + sheetName
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
    }
    var nextSTT = hsRow;
    // Tạo mảng 1 dòng duy nhất để chèn vào cuối sheet
    var newRow = [
      nextSTT,                            // A: STT
      s.name,                             // B: Tên học sinh
      s.class,                            // C: Lớp
      s.school,                           // D: Trường
      "'" + String(s.phoneNumber || ""),  // E: Số điện thoại
      code,
      "", "", "", "", "", "", "", "", "", "", // F-O: Để trống lịch sử điểm danh cũ
      0                                   // Q: Học phí ban đầu = 0
    ];

    // Lệnh ăn tiền: appendRow sẽ tự động chèn xuống dòng trống tiếp theo ở đáy sheet
    sheet.getRange(nextSTT + 1, 1, 1, 17).setValues([newRow]);

    // Định dạng giao diện vừa khít khung học sinh (chỉ set đến dòng maxrowhs)
    //sheet.autoResizeColumns(1, 17);
    sheet.setRowHeights(1, maxrowhs, 26);
    syncToTHHT();
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã thêm học sinh " + s.name + " mã " + code + " thành công vào danh sách lớp " + sheetName
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Nhập danh sách từ Excel - CHỈ THÊM HỌC SINH MỚI (KHÔNG GHI ĐÈ)
  if (action === "importStudents") {
    var students = postData.data;
    var grouped = {};

    // 1. Phân loại học sinh về đúng Sheet đích (Ưu tiên cột F lớp phụ s.note từ Excel)
    students.forEach(function (s) {
      var targetSheet;
      if (s.note && s.note.trim() !== "") {
        targetSheet = "Lop" + s.note.trim(); // VD: Lop10.1
      } else {
        var grade = s.class.match(/\d+/);
        targetSheet = grade ? "Lop" + grade[0] : "LopKhac";
      }

      if (!grouped[targetSheet]) grouped[targetSheet] = [];
      grouped[targetSheet].push(s);
    });

    var countAdded = 0;
    var processedSheets = [];

    // 2. Xử lý nối đuôi + lọc trùng cho từng Sheet
    for (var sheetName in grouped) {
      var sheet = ss.getSheetByName(sheetName);

      // Tự tạo sheet nếu chưa có
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(["STT", "name", "class", "school", "phoneNumber", "code", "Ngày 1", "Ngày 2", "Ngày 3", "Ngày 4", "Ngày 5", "Ngày 6", "Ngày 7", "Ngày 8", "Ngày 9", "Ngày 10", "tongtien"]);
        sheet.getRange("A1:Q1").setFontWeight("bold").setBackground("#f3f3f3");
      }

      // Đọc chính xác khung maxrowhs dòng tính từ dòng 2 (bỏ qua dòng tiêu đề số 1)
      var vals = sheet.getRange(2, 1, maxrowhs, 17).getValues();

      // Lọc ra các dòng thực sự đã có học sinh dựa trên cột Tên (index 1)
      var actualStudents = vals.filter(function (row) {
        return row[1] !== undefined && row[1] !== null && String(row[1]).trim() !== "";
      });

      var currentStudentCount = actualStudents.length;

      // Khống chế cứng trần maxrowhs - 1 học sinh
      if (currentStudentCount >= maxrowhs - 1) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: "Lớp " + sheetName + " đã đạt giới hạn tối đa maxrowhs - 1 học sinh rồi thầy cô nhé!"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var startRow = 2 + currentStudentCount; // Vị trí dòng trống thực tế tiếp theo để ghi đè
      var nextSTT = currentStudentCount + 1;  // STT tăng dần cho học sinh mới

      // --- BỘ LỌC TRÙNG AN TOÀN THEO MÃ HS (Cột F - Index 5) ---
      var existingKeys = {};
      if (currentStudentCount > 0) {
        actualStudents.forEach(function (row) {
          var key = String(row[5] || "").trim().toLowerCase();
          if (key !== "") existingKeys[key] = true;
        });
      }

      var rowsToAdd = [];
      var currentGroup = grouped[sheetName];

      for (var i = 0; i < currentGroup.length; i++) {
        var s = currentGroup[i];
        // Ép kiểu chuỗi để tránh lỗi định dạng số từ Excel truyền lên
        var newKey = String(s.code || "").trim().toLowerCase();

        // Nếu chưa có trên Cloud HOẶC sheet đang trống tinh thì cho phép nạp thẳng
        if (currentStudentCount === 0 || (newKey !== "" && !existingKeys[newKey])) {
          if (nextSTT > maxrowhs - 1) {
            break; // Đạt trần maxrowhs - 1 người thì dừng nạp
          }

          rowsToAdd.push([
            nextSTT,                            // A: STT
            String(s.name || "").trim(),        // B: name
            String(s.class || "").trim(),       // C: class
            String(s.school || "").trim(),      // D: school
            "'" + String(s.phoneNumber || ""),  // E: phoneNumber
            String(s.code || "").trim(),        // F: code (Mã HS ăn trực tiếp cột F)
            "", "", "", "", "", "", "", "", "", "", // G-P: Điểm danh trống
            0                                   // Q: tongtien = 0
          ]);

          nextSTT++;
          countAdded++;
        }
      }

      // Thực hiện ghi dữ liệu xuống bảng tính nếu mảng có dữ liệu
      if (rowsToAdd.length > 0) {
        sheet.getRange(startRow, 1, rowsToAdd.length, 17).setValues(rowsToAdd);
      }

      // Định dạng lại khung nhìn chuẩn chỉ
      sheet.autoResizeColumns(1, 17);
      sheet.setRowHeights(1, maxrowhs, 26);
      processedSheets.push(sheetName);
    }
    syncToTHHT();

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Thành công: Đã bổ sung thêm " + countAdded + " học sinh mới vào các lớp [" + processedSheets.join(", ") + "]!"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Điểm danh & Tự động cuốn chiếu nếu đầy 10 ngày
  if (action === "updateAttendance") {
    var targetSheetName = postData.className;
    var sheet = ss.getSheetByName(targetSheetName);
    var dateStr = "";
    if (postData.students && postData.students.length > 0 && postData.students[0].date) {
      // Nếu Frontend gửi chuỗi ngày dạng "dd/mm/yyyy", ta dùng luôn làm tiêu đề cột
      dateStr = postData.students[0].date;
    } else {
      // Nếu không có, tự động lấy ngày hiện tại của hệ thống
      dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
    }

    if (!sheet) return createResponse("Lỗi: Không thấy sheet", 404);

    var values = sheet.getRange(1, 1, maxrowhs, 17).getValues();
    var students = postData.students;

    // 1. Kiểm tra xem 10 ngày bảng chính đã đầy chưa
    var isFull = true;
    var targetCol = -1;
    for (var col = 6; col <= 15; col++) {
      if (values[1][col] === "" || values[1][col] === null) {
        targetCol = col + 1;
        isFull = false;
        break;
      }
    }
    // 2. NẾU ĐÃ ĐẦY 10 NGÀY -> Cuốn chiếu dữ liệu sang cột S (Nối tiếp xuống dưới, cách 1 dòng)
    if (isFull) {
      // --- TÌM DÒNG CUỐI THỰC TẾ CÓ HỌC SINH TẠI BẢNG CHÍNH (QUÉT CỘT B) ---
      var maxRows = sheet.getMaxRows();
      // Quét từ dưới cùng của cột B ngược lên để tìm dòng có tên học sinh cuối cùng
      var lastRowWithStudents = sheet.getRange(maxRows, 2).getNextDataCell(SpreadsheetApp.Direction.UP).getRow();

      // Phòng hờ nếu lớp trống tinh chưa có học sinh nào thì mặc định lấy dòng 1 (dòng tiêu đề)
      if (lastRowWithStudents < 1 || sheet.getRange(2, 2).getValue() === "") {
        lastRowWithStudents = 1;
      }

      var sourceRangeCol = 17; // Từ cột A đến cột Q là 17 cột
      var historyTargetCol = 19; // Cột S là cột thứ 19
      var historyTargetRow = 1;

      // --- TÌM VỊ TRÍ ĐÍCH XỊN Ở CỘT S (QUÉT TỪ DƯỚI CÙNG CỘT S NGƯỢC LÊN) ---
      var lastRowInS = sheet.getRange(maxRows, historyTargetCol).getNextDataCell(SpreadsheetApp.Direction.UP).getRow();

      // Kiểm tra xem ô S1 đã có dữ liệu lịch sử nào chưa
      if (lastRowInS > 1 || sheet.getRange(1, historyTargetCol).getValue() !== "") {
        // Có rồi thì đặt lịch sử mới cách lần trước 1 hàng trống (Dòng cuối cũ + 2)
        historyTargetRow = lastRowInS + 2;
      }

      // Xác định chính xác vùng nguồn bảng chính (Chỉ gói gọn đến dòng có HS thực tế)
      var sourceRange = sheet.getRange(1, 1, lastRowWithStudents, sourceRangeCol);

      // Xác định vùng đích tại cột S
      var newHistoryRange = sheet.getRange(historyTargetRow, historyTargetCol, lastRowWithStudents, sourceRangeCol);

      // Tiến hành copy nguyên bản dữ liệu và định dạng sang cột S
      sourceRange.copyTo(newHistoryRange);

      // Gắn nhãn mốc thời gian lưu trữ vào ô đầu tiên của block lịch sử mới
      var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
      sheet.getRange(historyTargetRow, historyTargetCol).setValue("LƯU TRỮ - " + nowStr);

      // --- RESET BẢNG CHÍNH ĐỂ SANG CHU KỲ MỚI ---
      // Xóa nội dung tích điểm danh cũ của 10 cột (Cột G đến P -> Cột 7 đến 16)
      for (var col = 7; col <= 16; col++) {
        sheet.getRange(1, col).setValue("Ngày " + (col - 6));
        if (lastRowWithStudents > 1) {
          sheet.getRange(2, col, lastRowWithStudents - 1, 1).clearContent();
        }
      }

      // Reset xong thì ngày điểm danh hôm nay sẽ ghi vào cột G (Cột số 7)
      targetCol = 7;

      // Ép lại dữ liệu mới nhất của bảng chính để chạy tiếp lệnh ghi điểm danh phía dưới
      values = sheet.getRange(1, 1, lastRowWithStudents, sourceRangeCol).getValues();
    }

    // 3. Ghi ngày vào dòng tiêu đề bảng chính
    sheet.getRange(1, targetCol).setValue(dateStr);

    // 4. Ghi điểm danh và học phí cho từng học sinh
    students.forEach(function (s) {
      for (var i = 1; i < values.length; i++) {
        if (i > maxrowhs) break; // Chỉ ghi vào bảng chính phía trên, không ghi vào lịch sử
        if (String(values[i][5]) === String(s.code)) {
          sheet.getRange(i + 1, targetCol).setValue(s.isPresent ? 1 : 0);
          //sheet.getRange(i + 1, 17).setValue(s.totalAmount);
          break;
        }
      }
    });
    //sheet.autoResizeColumns(1, 17);
    sheet.setRowHeights(1, maxrowhs, 26);
    capNhatHocPhiSauDiemDanh(targetSheetName);
    return createResponse(isFull ? "Hệ thống đã tự động lưu trữ 10 ngày cũ xuống dưới và kích hoạt chu kỳ 10 ngày mới thành công!" : "OK", 200);
  }
  // Action xác thực mật khẩu Admin cho trang Dashboard
  if (action === "checkAdmin") {
    var inputPassword = postData.password;

    // Tự động lấy mật khẩu Admin từ ô C2 của sheet 'hocphi'
    var adminSheet = ss.getSheetByName("hocphi");
    var passAdmin = adminSheet ? String(adminSheet.getRange("C2").getValue()).trim() : "";

    if (inputPassword && String(inputPassword).trim() === String(passAdmin)) {
      // Trả về JSON có chứa success: true
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Xác thực thành công!"
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      // Trả về JSON có chứa success: false
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Mật khẩu Admin không chính xác!"
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Xác thực tài khoản giáo viên qua sheet banquyen
  if (action === "checkBanquyen") {
    try {
      syncLicenseWithTransactionCN(ss);
    } catch (err) {
      console.error("Lỗi đồng bộ bản quyền checkBanquyen:", err.toString());
    }

    var inputIdgv = String(postData.idgv || "").trim();
    var inputPass = String(postData.password || "").trim();

    var bqSheet = ss.getSheetByName("banquyen");
    if (!bqSheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Không tìm thấy sheet banquyen trên hệ thống!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = bqSheet.getLastRow();
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Danh sách bản quyền trống!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var bqVals = bqSheet.getRange(2, 1, lastRow - 1, 7).getValues();
    for (var i = 0; i < bqVals.length; i++) {
      var row = bqVals[i];
      var idgv = String(row[0]).trim();
      var fullname = String(row[1]).trim();
      var pass = String(row[2]).trim();
      var mon = String(row[3]).trim();
      var idmon = String(row[4]).trim();
      var license = String(row[5]).trim();
      var linkScript = String(row[6]).trim();

      if (idgv === inputIdgv && pass === inputPass) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Xác thực bản quyền thành công!",
          idgv: idgv,
          fullname: fullname,
          mon: mon,
          idmon: idmon,
          licenseStatus: license,
          linkScript: linkScript
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Số điện thoại IDGV hoặc mật khẩu không chính xác!"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2307sua2: Cập nhật link script cho giáo viên vào cột G (Cột 7) sheet banquyen trên Google Sheet Admin
  if (action === "updateLinkScript") {
    var inputIdgv = String(postData.idgv || "").trim();
    var inputPass = String(postData.password || "").trim();
    var newLinkScript = String(postData.linkScript || "").trim();

    var bqSheet = ss.getSheetByName("banquyen");
    if (!bqSheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Không tìm thấy sheet banquyen trên hệ thống!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = bqSheet.getLastRow();
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Danh sách bản quyền trống!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var bqVals = bqSheet.getRange(2, 1, lastRow - 1, 7).getValues();
    for (var i = 0; i < bqVals.length; i++) {
      var row = bqVals[i];
      var idgv = String(row[0]).trim();
      var pass = String(row[2]).trim();

      // 2307sua2: Khớp số điện thoại IDGV (và mật khẩu khớp hoặc linh hoạt nếu mật khẩu rỗng khi đồng bộ)
      if (idgv === inputIdgv && (pass === inputPass || !inputPass || inputPass === "")) {
        bqSheet.getRange(i + 2, 7).setValue(newLinkScript);
        SpreadsheetApp.flush();
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Cập nhật Link Script vào cột G (Sheet banquyen) thành công!"
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Không tìm thấy giáo viên IDGV tương ứng trong sheet banquyen!"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  // Reset toàn bộ lớp học (Xóa sạch học sinh, giữ lại hàng tiêu đề 1)
  if (action === "resetClass") {
    var targetSheetName = postData.className;
    var inputPassword = postData.password;
    var adminSheet = ss.getSheetByName("hocphi");
    var passAdmin = adminSheet ? String(adminSheet.getRange("C2").getValue()).trim() : "";
    if (!inputPassword || String(inputPassword).trim() !== String(passAdmin)) {
      return createResponse("Mật khẩu Admin không chính xác! Không thể reset lớp.", 403);
    }
    var sheet = ss.getSheetByName(targetSheetName);

    if (!sheet) return createResponse("Lỗi: Không tìm thấy lớp", 404);

    var lastRow = sheet.getLastRow();
    // Nếu có dữ liệu từ hàng 2 trở đi thì mới tiến hành xóa
    if (lastRow > 1) {
      // Xóa toàn bộ dữ liệu và định dạng từ hàng 2 đến hết bảng (bao gồm cả phần lưu trữ phía dưới nếu có)
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();

      // Khôi phục lại các tiêu đề ngày mặc định từ cột F đến O ở hàng 1 phòng trường hợp bị đổi ngày trước đó
      for (var col = 6; col <= 15; col++) {
        sheet.getRange(1, col + 1).setValue("Ngày " + (col - 5));
      }

      return createResponse("Đã xóa toàn bộ học sinh và làm sạch lớp " + targetSheetName.replace("Lop", "") + " thành công!", 200);
    }

    return createResponse("Lớp học này vốn đã trống sẵn.", 200);
  }
  // Reset tiền học của lớp đã chọn
  // Reset toàn bộ lớp học (Xóa sạch học sinh, giữ lại hàng tiêu đề 1)
  if (action === "resetTienhoc") {
    var inputPassword = postData.password;
    var adminSheet = ss.getSheetByName("hocphi");
    var passAdmin = adminSheet ? String(adminSheet.getRange("C2").getValue()).trim() : "";

    if (!inputPassword || String(inputPassword).trim() !== String(passAdmin)) {
      return createResponse("Mật khẩu Admin không chính xác! Không thể reset lớp.", 403);
    }

    var sheet = ss.getSheetByName("ThuTien");
    if (!sheet) {
      return createResponse("Lỗi: Không tìm thấy hoặc không tồn tại sheet ThuTien", 404);
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return createResponse("Danh sách nộp tiền hiện tại đang trống rỗng!", 200);
    }

    // Lấy chuỗi lớp từ React gửi sang (postData.className ví dụ: "Lop9", "Lop12")
    var targetClass = postData.className || postData.class || "";

    // Dùng Regex tìm tất cả các chữ số có trong chuỗi (Ví dụ: "Lop9" -> "9", "Lop12" -> "12")
    var digitMatch = targetClass.match(/\d+/);
    if (!digitMatch) {
      return createResponse("Lỗi: Không xác định được khối lớp để reset!", 400);
    }

    // Ép về dạng 2 chữ số chuẩn chỉ: 9 thành "09", 12 giữ nguyên "12"
    var matchPrefix = String(digitMatch[0]).padStart(2, '0');

    var dataRange = sheet.getRange(1, 1, lastRow, 4); // Lấy đến cột số 4 (Cột Lớp)
    var values = dataRange.getValues();
    var deletedCount = 0;

    // Duyệt ngược từ hàng cuối cùng lên hàng số 2 (tránh hàng tiêu đề) để xóa
    for (var i = lastRow - 1; i >= 1; i--) {
      var cellClassValue = String(values[i][3] || "").trim(); // Cột D (index 3) là cột Lớp

      // Lấy số khối của lớp trong ô tính (Ví dụ: "09A1" -> tách lấy "09", "12A2" -> tách lấy "12")
      var cellDigitMatch = cellClassValue.match(/\d+/);
      if (cellDigitMatch) {
        var cellPrefix = String(cellDigitMatch[0]).padStart(2, '0');

        // So sánh đối chiếu: "09" === "09" hoặc "12" === "12"
        if (cellPrefix === matchPrefix) {
          sheet.deleteRow(i + 1); // i trong mảng chạy từ 0, dòng trong sheet chạy từ 1
          deletedCount++;
        }
      }
    }

    return createResponse("Đã xóa sạch thành công " + deletedCount + " lượt nộp tiền học của khối " + matchPrefix + " trên Google Sheets!", 200);
  }

  // Reset điểm danh linh hoạt theo số ngày (1 ngày, 2 ngày...)
  if (action === "resetAttendance") {
    var targetSheetName = postData.className;
    var sheet = ss.getSheetByName(targetSheetName);
    var daysToReset = Number(postData.daysToReset) || 1; // Nhận số ngày cần reset từ client

    if (!sheet) return createResponse("Lỗi: Không thấy sheet", 404);

    var values = sheet.getDataRange().getValues();

    // Tìm các cột đang có dữ liệu ngày tháng (từ cột G đến P)
    var activeCols = [];
    for (var col = 6; col <= 15; col++) {
      var cellVal = String(values[0][col]);
      if (cellVal !== "" && cellVal !== null && cellVal.indexOf("Ngày") === -1) {
        activeCols.push(col + 1); // Lưu lại số thứ tự cột đúng trên sheet
      }
    }

    if (activeCols.length === 0) {
      return createResponse("Lớp này chưa có dữ liệu điểm danh nào ở chu kỳ hiện tại.", 200);
    }

    // Lấy ra danh sách các cột cần xóa dựa theo số ngày yêu cầu (tính từ cột gần nhất trở về trước)
    var colsToDelete = activeCols.slice(-daysToReset);
    var lastRow = sheet.getLastRow() > maxrowhs ? maxrowhs : sheet.getLastRow(); // Giới hạn chỉ xóa ở bảng chính

    colsToDelete.forEach(function (colIndex) {
      // Xóa điểm danh học sinh
      sheet.getRange(2, colIndex, lastRow - 1, 1).clearContent();
      // Trả lại tên tiêu đề mặc định
      sheet.getRange(1, colIndex).setValue("Ngày " + (colIndex - 6));
    });
    //sheet.getRange("A:P").setWrap(true);
    //sheet.autoResizeColumns(1, 17);
    sheet.setRowHeights(1, maxrowhs, 26);
    capNhatHocPhiSauDiemDanh(targetSheetName);
    return createResponse("Đã tiến hành reset thành công " + colsToDelete.length + " ngày điểm danh gần nhất trên Cloud!", 200);
  }
}

/**
 * Hàm tra cứu học phí của một lớp cụ thể từ sheet 'hocphi'
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - Đối tượng Spreadsheet
 * @param {string} className - Tên lớp cần tra cứu (Ví dụ: "Lop12", "Lop10")
 * @return {number} Số tiền học phí của 1 buổi (Mặc định trả về 60000 nếu không tìm thấy)
 */
function getHocPhiTheoLop(ss, className) {
  try {
    var hcSheet = ss.getSheetByName("hocphi");
    if (!hcSheet) return 60000; // Phòng hờ không thấy sheet hocphi thì lấy mức 60k gốc

    // Lấy toàn bộ dữ liệu cột A (Tên lớp) và cột B (Học phí)
    var lastRow = hcSheet.getLastRow();
    if (lastRow < 2) return 60000;

    var data = hcSheet.getRange(2, 1, lastRow - 1, 2).getValues(); // Đọc từ hàng 2, cột 1, lấy 2 cột

    // Chuẩn hóa tên lớp cần tìm (Xóa khoảng trắng, chữ hoa/thường)
    var searchName = String(className).trim().toLowerCase();

    // Duyệt qua từng hàng trong sheet hocphi để khớp tên lớp
    for (var i = 0; i < data.length; i++) {
      var currentClassName = String(data[i][0]).trim().toLowerCase();
      if (currentClassName === searchName) {
        var price = Number(data[i][1]);
        return !isNaN(price) && price > 0 ? price : 60000;
      }
    }
  } catch (e) {
    console.error("Lỗi khi tra cứu học phí:", e.toString());
  }
  return 60000; // Mức mặc định an toàn
}

//Cập nhật HocPhi
/**
 * Hàm tính và cập nhật tự động tổng tiền học phí của một lớp sau khi điểm danh
 
 * @param {string} className - Tên sheet lớp vừa điểm danh (Ví dụ: "Lop12")
 */
function capNhatHocPhiSauDiemDanh(className, ssParam) {
  var ss = ssParam || getSS();
  if (!ss) {
    console.error("Không thể kết nối Spreadsheet");
    return;
  }
  var sheetLop = ss.getSheetByName(className);
  if (!sheetLop) {
    console.error("Không tìm thấy sheet lớp: " + className);
    return;
  }
  var dsdiemdanh = sheetLop.getRange(1, 1, maxrowhs, 17).getValues();

  // Cột G là cột thứ 7 -> chỉ số mảng là 6
  // Cột P là cột thứ 16 -> chỉ số mảng là 15
  var startColIdx = 6;  // Cột G
  var endColIdx = 15;   // Cột P
  var donGiaHocPhi = getHocPhiTheoLop(ss, className)
  var tongTienOutput = [];
  var countHS = 0;

  // 3. Duyệt từ hàng 2 (chỉ số 1) đến hàng maxrowhs (chỉ số maxrowhs - 1)
  for (var r = 1; r < maxrowhs; r++) {
    if (dsdiemdanh[r][5] === "" || dsdiemdanh[r][5] === null) {
      break;
    }

    var soBuoiDiHoc = 0;
    countHS++;
    // Quét các cột từ G đến P của hàng hiện tại
    for (var c = startColIdx; c <= endColIdx; c++) {
      if (Number(dsdiemdanh[r][c]) === 1) {
        soBuoiDiHoc++;
      }
    }

    // Tính tổng tiền dựa trên đơn giá động đã tra cứu
    var thanhTien = soBuoiDiHoc * donGiaHocPhi;
    tongTienOutput.push([thanhTien]);
  }

  // 4. Ghi trực tiếp mảng kết quả xuống cột Q (Cột số 17) từ hàng 2 -> hàng maxrowhs
  // Vùng ghi: bắt đầu từ hàng 2, cột 17, gồm maxrowhs - 1 hàng và 1 cột
  if (countHS > 0) {
    sheetLop.getRange(2, 17, countHS, 1).setValues(tongTienOutput);
  }

}
// Hàm lấy cấu hình bảo mật từ Script Properties
function getPayOSConfig() {
  const scriptProperties = PropertiesService.getScriptProperties();

  return {
    clientId: scriptProperties.getProperty('CLIENT_ID'),
    apiKey: scriptProperties.getProperty('API_KEY'),
    checksumKey: scriptProperties.getProperty('CHECKSUM_KEY')
  };
}

// Ví dụ khi sử dụng trong hàm xử lý của anh:
function testConfig() {
  const config = getPayOSConfig();
  Logger.log("Client ID: " + config.clientId);
  // Anh có thể gọi config.apiKey hoặc config.checksumKey để xử lý tiếp...
}


function getFormattedDate() {
  var d = new Date();
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "dd/MM/yy");
}

function logWebhook(ss, payload, status) {
  try {
    var sheet = ss.getSheetByName("WebhookLogs");
    if (!sheet) {
      sheet = ss.insertSheet("WebhookLogs");
      sheet.appendRow(["Thời gian", "Nội dung JSON nhận được", "Kết quả xử lý"]);
      sheet.getRange("A1:C1").setFontWeight("bold").setBackground("#f3f3f3");
    }

    var lastRow = sheet.getLastRow();
    if (lastRow > 200) {
      sheet.deleteRows(2, 50); // Xóa bớt 50 dòng cũ để tránh phình to dung lượng sheet
    }

    var timeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    var payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    sheet.appendRow([timeStr, payloadStr, status]);
    sheet.setRowHeight(sheet.getLastRow(), 26);
  } catch (e) {
    console.error("Lỗi ghi log webhook:", e.toString());
  }
}
/**
 * Hàm đồng bộ tất cả học sinh học thêm từ các sheet có tên bắt đầu bằng "Lop" sang sheet "THHT"
 */
function syncToTHHT() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheet = ss.getSheetByName("THHT");
  if (!targetSheet) {
    targetSheet = ss.insertSheet("THHT");
  } else {
    targetSheet.clear();
  }

  // Thiết lập tiêu đề dòng 1
  var headers = ["STT", "name", "class", "school", "phoneNumber", "code"];
  targetSheet.appendRow(headers);
  targetSheet.getRange("A1:F1").setFontWeight("bold").setBackground("#f3f3f3");

  var allSheets = ss.getSheets();
  var allStudents = [];

  for (var i = 0; i < allSheets.length; i++) {
    var sheet = allSheets[i];
    var sheetName = sheet.getName();

    // Chỉ lấy từ các sheet có tên bắt đầu bằng "Lop" (bỏ qua GVCN, ThuTien, hocphi, WebhookLogs, v.v.)
    if (sheetName.indexOf("Lop") === 0) {
      // Đọc khung maxrowhs hàng, 6 cột đầu tiên (từ dòng 2 trở đi để lấy thông tin cơ bản)
      var vals = sheet.getRange(2, 1, maxrowhs, 6).getValues();
      for (var j = 0; j < vals.length; j++) {
        var name = String(vals[j][1] || "").trim();
        if (name !== "") {
          allStudents.push([
            0, // Sẽ đánh lại số thứ tự liên tục sau
            name,
            String(vals[j][2] || "").trim(),
            String(vals[j][3] || "").trim(),
            "'" + String(vals[j][4] || "").trim().replace(/^'/, ""), // Giữ nguyên số điện thoại bắt đầu bằng số 0
            String(vals[j][5] || "").trim()
          ]);
        }
      }
    }
  }

  if (allStudents.length > 0) {
    // Đánh lại số thứ tự (STT) từ 1 đến N liên tục
    for (var k = 0; k < allStudents.length; k++) {
      allStudents[k][0] = k + 1;
    }

    // Ghi dữ liệu sạch vào sheet THHT
    targetSheet.getRange(2, 1, allStudents.length, 6).setValues(allStudents);
  }

  // Định dạng tự động giãn cột và chỉnh chiều cao hàng
  targetSheet.autoResizeColumns(1, 6);
  var lastRow = targetSheet.getLastRow();
  if (lastRow > 0) {
    targetSheet.setRowHeights(1, lastRow, 26);
  }
}

/**
 * Hàm ghi lịch sử giao dịch từ các webhook thanh toán (VietQR, Casso, SePay, PayOS) vào sheet "transaction"
 */
function saveToTransactionSheet(ss, postData, rawContents) {
  if (!postData) return false;

  var sheet = ss.getSheetByName("transaction");
  if (!sheet) {
    sheet = ss.insertSheet("transaction");
    sheet.appendRow([
      "Thời gian giao dịch",
      "Mã giao dịch (Ref/ID)",
      "Số tiền (Amount)",
      "Nội dung chuyển khoản",
      "Người gửi (Sender)",
      "Tài khoản nhận",
      "Ngân hàng / Cổng",
      "Thời gian nhận webhook",
      "Dữ liệu gốc (JSON)"
    ]);
    sheet.getRange("A1:I1").setFontWeight("bold").setBackground("#e0f2fe"); // Tiêu đề xanh dương nhạt sang trọng
  }

  var transactions = [];

  // 1. Trường hợp: postData.data là một mảng (Casso)
  if (postData.data && Array.isArray(postData.data)) {
    for (var i = 0; i < postData.data.length; i++) {
      transactions.push(parseSingleTransaction(postData.data[i]));
    }
  }
  // 2. Trường hợp: postData là một mảng
  else if (Array.isArray(postData)) {
    for (var i = 0; i < postData.length; i++) {
      transactions.push(parseSingleTransaction(postData[i]));
    }
  }
  // 3. Trường hợp: postData.data là đối tượng giao dịch đơn (PayOS)
  else if (postData.data && typeof postData.data === "object") {
    transactions.push(parseSingleTransaction(postData.data));
  }
  // 4. Trường hợp: postData là một đối tượng chứa giao dịch (SePay hoặc VietQR API khác)
  else if (typeof postData === "object") {
    if (postData.amount !== undefined || postData.transferDesc !== undefined || postData.description !== undefined || postData.content !== undefined) {
      transactions.push(parseSingleTransaction(postData));
    }
  }

  // Nếu không nhận diện được định dạng cụ thể nhưng chứa thông tin giao dịch cơ bản
  if (transactions.length === 0) {
    if (postData.webhookUrl) {
      return false; // Bỏ qua URL registration webhook
    }
    var desc = postData.description || postData.desc || postData.content || "";
    var amount = postData.amount || 0;
    if (desc || amount) {
      transactions.push({
        time: postData.transactionDate || postData.date || "",
        id: postData.id || postData.reference || "",
        amount: amount,
        desc: desc,
        sender: postData.sender || "",
        receiver: postData.accountNumber || "",
        gateway: postData.gateway || postData.bank || ""
      });
    }
  }

  if (transactions.length === 0) {
    return false;
  }

  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  var lastRow = sheet.getLastRow();

  for (var j = 0; j < transactions.length; j++) {
    var tx = transactions[j];

    // Chống trùng lặp theo Mã giao dịch (ID/Ref)
    var isDuplicate = false;
    if (lastRow > 1 && tx.id) {
      var existingIds = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var r = 0; r < existingIds.length; r++) {
        if (String(existingIds[r][0]).trim().toUpperCase() === String(tx.id).trim().toUpperCase()) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (!isDuplicate) {
      sheet.appendRow([
        tx.time || nowStr,
        tx.id || "",
        tx.amount || 0,
        tx.desc || "",
        tx.sender || "",
        "'" + (tx.receiver || ""), // Thêm dấu nháy đơn ' chống mất chữ số 0 đầu
        tx.gateway || "",
        nowStr,
        rawContents
      ]);
    }
  }

  // Định dạng giãn dòng và căn chỉnh độ rộng cột tự động
  var lastRowAfter = sheet.getLastRow();
  if (lastRowAfter > 0) {
    sheet.autoResizeColumns(1, 8);
    sheet.setRowHeights(1, lastRowAfter, 26);
  }

  return true;
}

/**
 * Trích xuất thuộc tính giao dịch từ các webhook thanh toán khác nhau
 */
function parseSingleTransaction(item) {
  if (!item || typeof item !== "object") return {};

  var time = item.when || item.transactionDate || item.transactionDateTime || item.transactionTime || item.date || item.time || "";
  var id = item.tid || item.referenceCode || item.reference || item.id || item.orderCode || item.transactionId || "";
  var amount = Number(item.amount || item.money || item.sotien || 0);
  var desc = item.description || item.transferDesc || item.content || item.noidung || item.nd || "";
  var sender = item.cusName || item.senderName || item.sender || "";
  var receiver = item.subAccount || item.accountNumber || item.receiver || "";
  var gateway = item.bankName || item.gateway || item.bank || "";

  return {
    time: time,
    id: id,
    amount: amount,
    desc: desc,
    sender: sender,
    receiver: receiver,
    gateway: gateway
  };
}
function createResponse(msg, code) {
  return ContentService.createTextOutput(JSON.stringify({ message: msg, status: code }))
    .setMimeType(ContentService.MimeType.JSON);
}
/**
 * 1907GVCN: Đồng bộ số tiền nộp của học sinh lớp GVCN từ sheet transactioncn mới nhất theo mã HS (duyệt từ dưới lên)
 */
function syncGVCNWithTransactionCN(ss) {
  var gvcnSheet = ss.getSheetByName("GVCN");
  var txSheet = ss.getSheetByName("transactioncn");
  if (!gvcnSheet) return;

  var gvcnLastRow = gvcnSheet.getLastRow();
  if (gvcnLastRow < 2) return;

  // Đọc danh sách học sinh hiện tại từ GVCN
  // Cột D (cột số 4) là Mã HS, Cột E (cột số 5) là Số tiền nộp
  var gvcnRange = gvcnSheet.getRange(2, 1, gvcnLastRow - 1, 7);
  var gvcnData = gvcnRange.getValues();

  // Đọc dữ liệu giao dịch từ transactioncn
  var txData = [];
  if (txSheet) {
    var txLastRow = txSheet.getLastRow();
    if (txLastRow > 1) {
      txData = txSheet.getRange(2, 1, txLastRow - 1, 7).getValues();
    }
  }

  // Duyệt qua từng học sinh trong GVCN để tìm số tiền giao dịch mới nhất
  var updatedAmounts = [];
  var updatedTotal = [];
  var hasChanged1 = false;
  var hasChanged2 = false;

  for (var i = 0; i < gvcnData.length; i++) {
    var studentCode = String(gvcnData[i][3]).trim(); // Mã HS (Cột D)
    var currentPaid = Number(gvcnData[i][4]) || 0; // Cột E hiện tại
    var totalPaid = Number(gvcnData[i][6]) || 0; // Cột G hiện tại
    var foundAmount = 0;

    if (studentCode !== "") {
      // Duyệt từ dưới lên trong txData (từ giao dịch mới nhất đến cũ nhất)
      for (var j = txData.length - 1; j >= 0; j--) {
        var description = String(txData[j][6] || "").trim(); // Mô Tả (Cột G)

        // Kiểm tra xem mô tả có chứa mã HS không
        if (description.toUpperCase().indexOf(studentCode.toUpperCase()) !== -1) {
          foundAmount = Number(txData[j][3]) || 0; // Số Tiền (Cột D)
          break; // Đã tìm thấy giao dịch mới nhất, dừng duyệt cho học sinh này
        }
      }
    }

    if (foundAmount !== currentPaid) {
      hasChanged1 = true;
    }
    var newTotalPaid = totalPaid;
    if (currentPaid === 0 && foundAmount !== currentPaid) {
      hasChanged2 = true;
      newTotalPaid = totalPaid + foundAmount;
    }
    updatedAmounts.push([foundAmount]);
    updatedTotal.push([newTotalPaid]);
  }

  // Chỉ ghi ngược lại cột E (Số tiền nộp) của sheet GVCN nếu có sự thay đổi để tránh lãng phí ghi dữ liệu
  if (hasChanged1 && updatedAmounts.length > 0) {
    gvcnSheet.getRange(2, 5, updatedAmounts.length, 1).setValues(updatedAmounts);
    SpreadsheetApp.flush();
  }
  // Chỉ ghi ngược lại cột G (Số tiền nộp) của sheet GVCN nếu có sự thay đổi để tránh lãng phí ghi dữ liệu
  if (hasChanged2 && updatedTotal.length > 0) {
    gvcnSheet.getRange(2, 7, updatedTotal.length, 1).setValues(updatedTotal);
    SpreadsheetApp.flush();
  }
}
/**
 * Đồng bộ tự động dữ liệu từ sheet transactionkd sang sheet ThuTien
 */
function syncThuTienWithTransactionKD(ss) {
  var thhtSheet = ss.getSheetByName("THHT");
  if (!thhtSheet) {
    syncToTHHT();
    thhtSheet = ss.getSheetByName("THHT");
  }
  if (!thhtSheet) return;

  var thhtLastRow = thhtSheet.getLastRow();
  if (thhtLastRow < 2) return;

  var thhtData = thhtSheet.getRange(2, 1, thhtLastRow - 1, 6).getValues();
  var studentMap = {};
  for (var i = 0; i < thhtData.length; i++) {
    var sCode = String(thhtData[i][5]).trim().toUpperCase();
    if (sCode !== "") {
      studentMap[sCode] = {
        stt: String(thhtData[i][0]).trim(),
        name: String(thhtData[i][1]).trim(),
        class: String(thhtData[i][2]).trim()
      };
    }
  }

  var txSheet = ss.getSheetByName("transactionkd");
  if (!txSheet) return;

  var txLastRow = txSheet.getLastRow();
  if (txLastRow < 2) return;

  var txData = txSheet.getRange(2, 1, txLastRow - 1, 10).getValues();

  var thuTienSheet = ss.getSheetByName("ThuTien");
  if (!thuTienSheet) {
    thuTienSheet = ss.insertSheet("ThuTien");
    thuTienSheet.appendRow(["Date", "STT", "Họ và tên", "Lớp", "Lần nộp", "Số tiền", "Mã HS"]);
    thuTienSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f3f3f3");
  }

  var thuTienLastRow = thuTienSheet.getLastRow();
  var thuTienData = [];
  if (thuTienLastRow > 1) {
    thuTienData = thuTienSheet.getRange(2, 1, thuTienLastRow - 1, 7).getValues();
  }

  var existingKeys = {};
  for (var k = 0; k < thuTienData.length; k++) {
    var mhs = String(thuTienData[k][6]).trim().toUpperCase();
    var ln = String(thuTienData[k][4]).trim().toUpperCase();
    if (mhs !== "") {
      existingKeys[mhs + "_" + ln] = true;
    }
  }

  var rowsToAdd = [];

  for (var j = 0; j < txData.length; j++) {
    var row = txData[j];
    var desc = String(row[5] || "").trim();
    var amount = Number(row[7]) || 0;
    var dateVal = row[1];

    var codeMatch = desc.match(/HT\d+/i);
    if (codeMatch) {
      var codeHS = codeMatch[0].toUpperCase();

      if (studentMap[codeHS]) {
        var student = studentMap[codeHS];

        var lanMatch = desc.match(/L\d+/i);
        var lanNop = lanMatch ? lanMatch[0].toUpperCase() : "L1";

        var uniqueKey = codeHS + "_" + lanNop;

        if (!existingKeys[uniqueKey]) {
          var dateStr = "";
          if (dateVal instanceof Date) {
            dateStr = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "dd/MM/yyyy");
          } else {
            dateStr = String(dateVal || "").trim();
            if (!dateStr) {
              dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
            }
          }

          rowsToAdd.push([
            dateStr,
            "'" + student.stt,
            student.name,
            student.class,
            lanNop,
            amount,
            codeHS
          ]);

          existingKeys[uniqueKey] = true;
        }
      }
    }
  }

  if (rowsToAdd.length > 0) {
    for (var m = 0; m < rowsToAdd.length; m++) {
      thuTienSheet.appendRow(rowsToAdd[m]);
    }
    thuTienSheet.autoResizeColumns(1, 7);
    thuTienSheet.setRowHeights(1, thuTienSheet.getLastRow(), 26);
  }
}

/**
 * Tự động đồng bộ và cập nhật trạng thái bản quyền của giáo viên từ sheet transactioncn sang sheet banquyen
 */
function syncLicenseWithTransactionCN(ss) {
  var bqSheet = ss.getSheetByName("banquyen");
  if (!bqSheet) {
    bqSheet = ss.insertSheet("banquyen");
    bqSheet.appendRow(["idgv", "Fullname", "pass", "mon", "idmon", "bản quyền", "link script", "level", "Ngày đk", "Ngày hết hạn"]);
    bqSheet.getRange("A1:J1").setFontWeight("bold").setBackground("#e0f2fe");
  }

  var bqLastRow = bqSheet.getLastRow();
  if (bqLastRow < 2) return;

  var bqRange = bqSheet.getRange(2, 1, bqLastRow - 1, 10);
  var bqData = bqRange.getValues();

  var txSheet = ss.getSheetByName("transactioncn");
  var txData = [];
  if (txSheet) {
    var txLastRow = txSheet.getLastRow();
    if (txLastRow > 1) {
      txData = txSheet.getRange(2, 1, txLastRow - 1, 10).getValues();
    }
  }

  var updated = false;

  for (var i = 0; i < bqData.length; i++) {
    var idgv = String(bqData[i][0]).trim();
    var license = String(bqData[i][5]).trim().toLowerCase();

    // Nếu chưa được kích hoạt vip
    if (idgv !== "" && license !== "vip") {
      // Tìm số điện thoại idgv trong bất kỳ cột nào của transactioncn và so sánh số tiền trùng phibanquyen (199000)
      for (var j = 0; j < txData.length; j++) {
        var txRow = txData[j];
        var amount = Number(txRow[3]) || 0; // Cột D (index 3) là Số Tiền

        var isFound = false;
        // Duyệt qua tất cả cột của dòng giao dịch để tìm xem có chứa idgv không (thường nằm ở Mô tả cột G)
        for (var col = 0; col < txRow.length; col++) {
          if (String(txRow[col]).indexOf(idgv) !== -1) {
            isFound = true;
            break;
          }
        }

        if (isFound && String(amount).trim() === String(phibanquyen)) {
          bqData[i][5] = "vip";
          bqSheet.getRange(i + 2, 6).setValue("vip");

          // 2307sua3: Ghi ngày đăng ký vào cột I (Cột 9) và ngày hết hạn sau 1 năm vào cột J (Cột 10)
          var now2307 = new Date();
          var timeZone2307 = Session.getScriptTimeZone() || "GMT+7";
          var regDate2307Str = Utilities.formatDate(now2307, timeZone2307, "dd/MM/yyyy");
          var expDate2307 = new Date(now2307.getFullYear() + 1, now2307.getMonth(), now2307.getDate());
          var expDate2307Str = Utilities.formatDate(expDate2307, timeZone2307, "dd/MM/yyyy");

          bqData[i][8] = regDate2307Str;
          bqData[i][9] = expDate2307Str;
          bqSheet.getRange(i + 2, 9).setValue(regDate2307Str);
          bqSheet.getRange(i + 2, 10).setValue(expDate2307Str);

          updated = true;
          break; // Đã tìm thấy, chuyển sang GV tiếp theo
        }
      }
    }
  }

  if (updated) {
    SpreadsheetApp.flush();
  }
}
