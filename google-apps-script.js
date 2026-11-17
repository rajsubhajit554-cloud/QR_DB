/**
 * ============================================================
 * QR STUDIO 0.2 - GOOGLE APPS SCRIPT DATABASE BACKEND
 * ============================================================
 * নির্দেশিকা (Instructions):
 * 1. Google Sheets-এ যান (sheets.new) এবং একটি নতুন স্প্রেডশিট খুলুন। নাম দিন "QR_DB"।
 * 2. Extensions > Apps Script অপশনে ক্লিক করুন।
 * 3. এই ফাইলের সম্পূর্ণ কোডটি কপি করে Apps Script এডিটর-এ পেস্ট করুন।
 * 4. SECRET ভ্যারিয়েবলের মান পরিবর্তন করে নিজের গোপন চাবি বা পাসওয়ার্ড দিন।
 * 5. Deploy > New deployment বাটনে ক্লিক করুন:
 *    - Type নির্বাচন করুন: Web app
 *    - Description: QR Studio Backend v0.2
 *    - Execute as: Me (আপনার গুগল অ্যাকাউন্ট)
 *    - Who has access: Anyone (যাতে Vercel API রিকোয়েস্ট করতে পারে)
 * 6. Deploy বাটনে ক্লিক করে অনুমোদন (Authorize) দিন।
 * 7. প্রাপ্ত "Web app URL" (https://script.google.com/macros/s/.../exec) কপি করুন।
 * 8. আপনার .env.local ফাইলে GAS_URL এবং GAS_SECRET বসিয়ে দিন।
 * ============================================================
 */

// আপনার গোপন পাসওয়ার্ড (Change this to a strong secret)
const SECRET = "qr_studio_super_secret_2026";

// শিট অবজেক্ট অ্যাক্সেস
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Sheet1");
  if (!sheet) {
    sheet = ss.getSheets()[0];
  }
  // যদি হেডার না থাকে, স্বয়ংক্রিয়ভাবে হেডার যোগ করবে
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["code", "name", "url", "style", "created", "updated", "scans"]);
    sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#15152F").setFontColor("#FFFFFF");
  }
  return sheet;
}

// JSON রেসপন্স বিল্ডার
function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// কোড দিয়ে রো খোঁজা
function findRow(code) {
  if (!code) return -1;
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(code).trim()) {
      return i + 1; // 1-based index
    }
  }
  return -1;
}

/**
 * -------------------------------------------------------------
 * GET রিকোয়েস্ট হ্যান্ডলার
 * Vercel Redirect Route (/r/[code]) থেকে কল করা হয়।
 * -------------------------------------------------------------
 */
function doGet(e) {
  try {
    const code = e && e.parameter ? e.parameter.code : null;
    
    // হেলথ চেক / টেস্ট পিং
    if (!code) {
      return out({
        status: "ok",
        app: "QR STUDIO Backend",
        version: "0.2",
        message: "Google Apps Script Backend is working perfectly!"
      });
    }

    const row = findRow(code);
    if (row === -1) {
      return out({ error: "not_found", code: code });
    }

    const sheet = getSheet();
    const currentScans = Number(sheet.getRange(row, 7).getValue()) || 0;
    const newScans = currentScans + 1;
    
    // স্ক্যান কাউন্ট বৃদ্ধি করা (Increment scan count)
    sheet.getRange(row, 7).setValue(newScans);

    const targetUrl = sheet.getRange(row, 3).getValue();
    const name = sheet.getRange(row, 2).getValue();

    return out({
      ok: true,
      code: code,
      name: name,
      url: targetUrl,
      scans: newScans
    });
  } catch (err) {
    return out({ error: "server_error", message: err.toString() });
  }
}

/**
 * -------------------------------------------------------------
 * POST রিকোয়েস্ট হ্যান্ডলার
 * Vercel Admin API (/api/admin) থেকে কল করা হয় (CRUD অপারেশনের জন্য)।
 * -------------------------------------------------------------
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return out({ error: "empty_payload" });
    }

    const body = JSON.parse(e.postData.contents);

    // সিক্রেট যাচাইকরণ (Secret Validation)
    if (!body.secret || body.secret !== SECRET) {
      return out({ error: "unauthorized", message: "Invalid secret key" });
    }

    const sheet = getSheet();
    const now = new Date().toISOString();

    // ১. সকল প্রজেক্টের তালিকা রিটার্ন (List All Projects)
    if (body.action === "list") {
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return out({ ok: true, projects: [] });
      }

      const projects = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue; // স্কিপ ফাঁকা কোড

        let parsedStyle = {};
        try {
          parsedStyle = row[3] ? JSON.parse(row[3]) : {};
        } catch (pe) {
          parsedStyle = {};
        }

        projects.push({
          code: String(row[0]),
          name: String(row[1] || ""),
          url: String(row[2] || ""),
          style: parsedStyle,
          created: row[4] ? String(row[4]) : now,
          updated: row[5] ? String(row[5]) : now,
          scans: Number(row[6]) || 0
        });
      }
      return out({ ok: true, projects: projects });
    }

    // ২. নতুন প্রজেক্ট তৈরি (Create Project)
    if (body.action === "create") {
      if (!body.code || !body.url) {
        return out({ error: "missing_fields", message: "Code and Target URL are required" });
      }

      // ডুপ্লিকেট কোড চেক
      if (findRow(body.code) !== -1) {
        return out({ error: "duplicate_code", message: "This short code already exists" });
      }

      const styleStr = JSON.stringify(body.style || {});
      sheet.appendRow([
        String(body.code).trim(),
        String(body.name || "Untitled QR").trim(),
        String(body.url).trim(),
        styleStr,
        now,
        now,
        0
      ]);

      return out({ ok: true, message: "Project created successfully", code: body.code });
    }

    // ৩. প্রজেক্ট আপডেট (Update Project: name, target url, style)
    if (body.action === "update") {
      if (!body.code) {
        return out({ error: "missing_code", message: "Code is required to update" });
      }

      const row = findRow(body.code);
      if (row === -1) {
        return out({ error: "not_found", message: "Project not found" });
      }

      if (body.name !== undefined) {
        sheet.getRange(row, 2).setValue(String(body.name).trim());
      }
      if (body.url !== undefined) {
        sheet.getRange(row, 3).setValue(String(body.url).trim());
      }
      if (body.style !== undefined) {
        sheet.getRange(row, 4).setValue(JSON.stringify(body.style));
      }
      sheet.getRange(row, 6).setValue(now);

      return out({ ok: true, message: "Project updated successfully", code: body.code });
    }

    // ৪. প্রজেক্ট ডিলিট (Delete Project)
    if (body.action === "delete") {
      if (!body.code) {
        return out({ error: "missing_code", message: "Code is required to delete" });
      }

      const row = findRow(body.code);
      if (row === -1) {
        return out({ error: "not_found", message: "Project not found" });
      }

      sheet.deleteRow(row);
      return out({ ok: true, message: "Project deleted successfully", code: body.code });
    }

    return out({ error: "unknown_action", message: "Action not recognized" });
  } catch (err) {
    return out({ error: "server_error", message: err.toString() });
  }
}
