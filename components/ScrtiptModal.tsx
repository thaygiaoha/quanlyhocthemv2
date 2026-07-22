import React, { useState } from 'react';
import { Copy, Check, Code, X, FileCode, Terminal, Sparkles, HelpCircle } from 'lucide-react';

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const APPS_SCRIPT_CODE = `/**
 * GOOGLE APPS SCRIPT CHUẨN ĐỒNG BỘ VIETQR / SEPAY / CASSO WEBHOOK
 * Tác giả: Hệ thống Quản Lý Học Phí & Lớp Chủ Nhiệm (GVCN)
 * Tính năng: Tự động ghi nhận giao dịch vào sheet 'transactioncn' & 'transactionkd'
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result = {
      status: 200,
      sheets: {},
      password: "",
      licenseStatus: "vip"
    };

    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var sheetName = sheet.getName();
      var data = sheet.getDataRange().getValues();
      
      if (data.length <= 1) {
        result.sheets[sheetName] = { className: sheetName, students: [], records: [] };
        continue;
      }

      var rows = [];

      if (sheetName === "transactioncn" || sheetName === "transactionkd" || sheetName === "luutransaction") {
        for (var r = 1; r < data.length; r++) {
          var row = data[r];
          if (!row[0] && !row[1] && !row[2]) continue;
          rows.push({
            stt: r,
            date: row[0] ? String(row[0]) : "",
            transId: row[1] ? String(row[1]) : "",
            amount: row[2] ? Number(row[2]) : 0,
            soTien: row[2] ? Number(row[2]) : 0,
            content: row[3] ? String(row[3]) : "",
            code: row[4] ? String(row[4]) : "",
            name: row[5] ? String(row[5]) : (row[3] ? String(row[3]) : "GD " + r),
            status: row[6] ? String(row[6]) : "Thành công"
          });
        }
        result.sheets[sheetName] = { className: sheetName, records: rows, students: rows };
      } else if (sheetName === "ThuTien") {
        for (var r = 1; r < data.length; r++) {
          var row = data[r];
          if (!row[0] && !row[1]) continue;
          rows.push({
            stt: row[0] ? String(row[0]) : "",
            name: row[1] ? String(row[1]) : "",
            lop: row[2] ? String(row[2]) : "",
            lanNop: row[3] ? String(row[3]) : "",
            soTien: row[4] ? Number(row[4]) : 0,
            code: row[5] ? String(row[5]) : "",
            date: row[6] ? String(row[6]) : ""
          });
        }
        result.sheets[sheetName] = { className: sheetName, students: rows };
      } else if (sheetName === "banquyen") {
        // Sheet bản quyền bảo mật
      } else {
        for (var r = 1; r < data.length; r++) {
          var row = data[r];
          if (!row[0] && !row[1] && !row[2]) continue;
          rows.push({
            stt: row[0] ? String(row[0]) : r,
            code: row[1] ? String(row[1]) : "",
            name: row[2] ? String(row[2]) : "",
            phoneNumber: row[3] ? String(row[3]) : "",
            totalAmount: row[4] ? Number(row[4]) : 0,
            totalPaid: row[5] ? Number(row[5]) : 0,
            attendance: row.slice(6, 16).map(function(v) { return v === 1 ? 1 : (v === 0 ? 0 : null); })
          });
        }
        result.sheets[sheetName] = { className: sheetName, students: rows };
      }
    }

    var props = PropertiesService.getScriptProperties();
    result.password = props.getProperty("PASSWORD_C2") || "123456";

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 500, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var postContents = e && e.postData ? e.postData.contents : "";
    var body = {};
    if (postContents) {
      try {
        body = JSON.parse(postContents);
      } catch (ex) {
        body = {};
      }
    }

    if (body.action) {
      return handleApiAction(ss, body);
    }

    return handleBankWebhook(ss, body);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 500, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleBankWebhook(ss, body) {
  var transactions = [];
  if (body.data && Array.isArray(body.data)) {
    transactions = body.data;
  } else {
    transactions = [body];
  }

  var processedCount = 0;

  for (var i = 0; i < transactions.length; i++) {
    var item = transactions[i];
    if (!item) continue;

    var content = (item.transactionContent || item.description || item.content || item.remark || body.transactionContent || body.description || body.content || "").toString().trim();
    var amount = Number(item.transferAmount || item.amountIn || item.amount || body.transferAmount || body.amountIn || body.amount || 0);
    var transId = (item.id || item.tid || item.referenceCode || body.id || body.tid || body.referenceCode || "GD" + new Date().getTime()).toString();
    var transDate = item.transactionDate || item.when || item.date || body.transactionDate || body.when || body.date || Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");

    if (!content && amount === 0) continue;

    var upperContent = content.toUpperCase();

    // KIỂM TRA GIAO DỊCH LỚP CHỦ NHIỆM (GVCN)
    var isGVCN = upperContent.indexOf("CN") !== -1 || 
                 upperContent.indexOf("GVCN") !== -1 || 
                 upperContent.indexOf("LOP CN") !== -1 || 
                 upperContent.indexOf("LOPCN") !== -1;

    if (isGVCN) {
      processGVCNTransaction(ss, transDate, transId, amount, content);
      processedCount++;
    } else {
      processKDTransaction(ss, transDate, transId, amount, content);
      processedCount++;
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Đã ghi nhận " + processedCount + " giao dịch vào Google Sheets!",
    processed: processedCount
  })).setMimeType(ContentService.MimeType.JSON);
}

function processGVCNTransaction(ss, transDate, transId, amount, content) {
  var sheet = ss.getSheetByName("transactioncn");
  if (!sheet) {
    sheet = ss.insertSheet("transactioncn");
    sheet.appendRow(["Thời gian", "Mã GD", "Số tiền", "Nội dung chuyển khoản", "Mã HS", "Tên học sinh", "Trạng thái"]);
  }

  var gvcnSheet = ss.getSheetByName("GVCN");
  var matchedCode = "";
  var matchedName = "";

  if (gvcnSheet) {
    var gvcnData = gvcnSheet.getDataRange().getValues();
    for (var r = 1; r < gvcnData.length; r++) {
      var code = gvcnData[r][1] ? String(gvcnData[r][1]).trim() : "";
      var name = gvcnData[r][2] ? String(gvcnData[r][2]).trim() : "";
      if (code && content.toUpperCase().indexOf(code.toUpperCase()) !== -1) {
        matchedCode = code;
        matchedName = name;
        
        // Cộng học phí vào cột E (Mới nộp) & cột F (Lũy kế nộp)
        var currentAmount = Number(gvcnData[r][4] || 0);
        var currentPaid = Number(gvcnData[r][5] || 0);
        gvcnSheet.getRange(r + 1, 5).setValue(currentAmount + amount);
        gvcnSheet.getRange(r + 1, 6).setValue(currentPaid + amount);
        break;
      }
    }
  }

  sheet.appendRow([transDate, transId, amount, content, matchedCode, matchedName, "Thành công"]);
}

function processKDTransaction(ss, transDate, transId, amount, content) {
  var sheet = ss.getSheetByName("transactionkd");
  if (!sheet) {
    sheet = ss.insertSheet("transactionkd");
    sheet.appendRow(["Thời gian", "Mã GD", "Số tiền", "Nội dung chuyển khoản", "Mã HS", "Tên học sinh", "Trạng thái"]);
  }

  sheet.appendRow([transDate, transId, amount, content, "", "", "Thành công"]);
}

function handleApiAction(ss, body) {
  var action = body.action;

  if (action === "resetGVCN") {
    var txSheet = ss.getSheetByName("transactioncn");
    var luuSheet = ss.getSheetByName("luutransaction") || ss.insertSheet("luutransaction");
    
    if (txSheet) {
      var data = txSheet.getDataRange().getValues();
      if (data.length > 1) {
        for (var i = 1; i < data.length; i++) {
          luuSheet.appendRow(data[i]);
        }
        txSheet.clear();
        txSheet.appendRow(["Thời gian", "Mã GD", "Số tiền", "Nội dung chuyển khoản", "Mã HS", "Tên học sinh", "Trạng thái"]);
      }
    }

    var gvcnSheet = ss.getSheetByName("GVCN");
    if (gvcnSheet) {
      var gData = gvcnSheet.getDataRange().getValues();
      for (var r = 1; r < gData.length; r++) {
        gvcnSheet.getRange(r + 1, 5).setValue(0);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 200,
      success: true,
      message: "Đã reset và sao lưu toàn bộ lịch sử giao dịch lớp Chủ Nhiệm (transactioncn) thành công!"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "resetTransactionKD") {
    var txKd = ss.getSheetByName("transactionkd");
    var luuSheet = ss.getSheetByName("luutransaction") || ss.insertSheet("luutransaction");
    if (txKd) {
      var data = txKd.getDataRange().getValues();
      if (data.length > 1) {
        for (var i = 1; i < data.length; i++) {
          luuSheet.appendRow(data[i]);
        }
        txKd.clear();
        txKd.appendRow(["Thời gian", "Mã GD", "Số tiền", "Nội dung chuyển khoản", "Mã HS", "Tên học sinh", "Trạng thái"]);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: 200,
      success: true,
      message: "Đã reset và sao lưu toàn bộ lịch sử giao dịch học thêm (transactionkd) thành công!"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 200,
    success: true,
    message: "Thao tác thành công!"
  })).setMimeType(ContentService.MimeType.JSON);
}`;

export const ScriptModal: React.FC<ScriptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl">
              <FileCode size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                Mã Nguồn Google Apps Script Chẩn Đoán (Code.gs)
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  v2.5 VietQR / SePay Webhook
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Copy mã này dán vào Google Apps Script của bạn để ghi nhận tự động vào sheet <b className="text-indigo-400 font-mono">transactioncn</b>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* INSTRUCTIONS GUIDE */}
        <div className="p-4 bg-indigo-50/70 border-b border-indigo-100 flex items-start gap-3 text-xs text-indigo-950 shrink-0">
          <HelpCircle size={18} className="text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Hướng dẫn 3 bước cập nhật Script:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-600">
              <li>Mở file Google Sheets chứa dữ liệu học phí của bạn &rarr; chọn <b>Mở rộng</b> &rarr; <b>Apps Script</b>.</li>
              <li>Bấm <b>Sao chép toàn bộ mã Code.gs</b> bên dưới và dán đè vào trình biên tập Apps Script.</li>
              <li>Bấm <b>Triển khai (Deploy)</b> &rarr; <b>Triển khai dưới dạng ứng dụng web mới (New Deployment)</b> &rarr; Quyền truy cập chọn <b>"Bất kỳ ai" (Anyone)</b>.</li>
            </ol>
          </div>
        </div>

        {/* CODE CONTAINER */}
        <div className="p-4 bg-slate-950 overflow-y-auto flex-1 font-mono text-xs text-slate-200 relative group">
          <button
            onClick={handleCopy}
            className={`absolute top-6 right-6 px-4 py-2 rounded-xl text-xs font-bold font-sans flex items-center gap-2 transition-all shadow-lg z-10 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
            }`}
          >
            {copied ? (
              <>
                <Check size={16} /> Đã sao chép!
              </>
            ) : (
              <>
                <Copy size={16} /> Sao chép Code.gs
              </>
            )}
          </button>
          <pre className="whitespace-pre-wrap break-all leading-relaxed p-2 select-all">
            {APPS_SCRIPT_CODE}
          </pre>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            <span>Tích hợp tự động VietQR, SePay, Casso & MBBank notification.</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Copy size={14} />
              {copied ? 'Đã sao chép' : 'Sao chép mã'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
