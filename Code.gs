/**
 * PlayMetrics FF - Apps Script bridge
 * ------------------------------------
 * Script ini di-deploy sebagai "Web App" dan berfungsi sebagai API
 * sederhana antara halaman web (HTML/JS) dan Google Sheets.
 *
 * GET  ?sheet=Master Player           -> ambil semua data di tab itu (jadi JSON)
 * POST body: { "sheet": "Master Player", "data": { "player_id": "PI002", ... } }
 *                                       -> tambah 1 baris baru
 *
 * CARA PASANG:
 * 1. Buka Google Sheets kamu -> Extensions > Apps Script
 * 2. Hapus isi default, paste seluruh isi file ini
 * 3. Klik Deploy > New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy URL yang muncul (bentuknya https://script.google.com/macros/s/xxxx/exec)
 * 5. Paste URL itu ke variabel API_URL di file web/script.js
 */

function doGet(e) {
  try {
    var sheetName = (e.parameter.sheet || 'Master Player').trim();
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
      return jsonResponse({ error: 'Sheet "' + sheetName + '" tidak ditemukan' });
    }

    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var rows = values.slice(1).filter(function (row) {
      return row.join('') !== ''; // skip baris kosong
    });

    var result = rows.map(function (row) {
      var obj = {};
      headers.forEach(function (header, i) {
        obj[header] = row[i];
      });
      return obj;
    });

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var sheetName = (body.sheet || 'Master Player').trim();
    var data = body.data || {};

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      return jsonResponse({ error: 'Sheet "' + sheetName + '" tidak ditemukan' });
    }

    // Auto-generate ID configurations
    var idConfig = {
      'Master Player': { key: 'player_id', prefix: 'PL' },
      'Master Team': { key: 'team_id', prefix: 'TM' },
      'Master Position': { key: 'position_id', prefix: 'PS' }
    };

    if (idConfig[sheetName]) {
      var conf = idConfig[sheetName];
      if (!data[conf.key] || data[conf.key].toString().trim() === '') {
        data[conf.key] = generateNextId(sheet, conf.key, conf.prefix);
      }
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newRow = headers.map(function (header) {
      return data[header] !== undefined ? data[header] : '';
    });

    sheet.appendRow(newRow);

    return jsonResponse({ status: 'success', row: newRow, data: data });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function generateNextId(sheet, idHeaderName, prefix) {
  var lastRow = sheet.getLastRow();
  var nextNum = 1;
  if (lastRow > 1) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var idColIdx = headers.indexOf(idHeaderName) + 1;
    if (idColIdx > 0) {
      var ids = sheet.getRange(2, idColIdx, lastRow - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        var idStr = String(ids[i][0]);
        var match = idStr.match(/\d+/);
        if (match) {
          var num = parseInt(match[0], 10);
          if (num >= nextNum) {
            nextNum = num + 1;
          }
        }
      }
    }
  }
  var padNum = ("000" + nextNum).slice(-3);
  return prefix + padNum;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
