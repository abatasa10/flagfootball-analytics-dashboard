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
    var action = (body.action || 'create').trim().toLowerCase();
    var data = body.data || {};

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      return jsonResponse({ error: 'Sheet "' + sheetName + '" tidak ditemukan' });
    }

    // Auto-generate ID configurations
    var idConfig = {
      'Master Player': { key: 'player_id', prefix: 'PL' },
      'Master Team': { key: 'team_id', prefix: 'TM' },
      'Master Position': { key: 'position_id', prefix: 'PS' },
      'Master Route': { key: 'route_id', prefix: 'RT' },
      'Playbook': { key: 'play_id', prefix: 'PB' },
      'Play Assignment': { key: 'assignment_id', prefix: 'PA' }
    };

    var conf = idConfig[sheetName];

    // Handle image file upload if provided
    if (body.image_file) {
      var fileData = body.image_file;
      var folder;
      var folders = DriveApp.getFoldersByName('Playbook Diagrams');
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder('Playbook Diagrams');
      }
      var bytes = Utilities.base64Decode(fileData.base64);
      var blob = Utilities.newBlob(bytes, fileData.type, fileData.name);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      data['image'] = 'https://lh3.googleusercontent.com/d/' + file.getId();
    }

    // ACTION: DELETE
    if (action === 'delete') {
      var idValue = body.id;
      if (!conf) {
        return jsonResponse({ error: 'Konfigurasi ID untuk sheet ini tidak ditemukan' });
      }
      var rowIndex = findRowIndexById(sheet, conf.key, idValue);
      if (rowIndex === -1) {
        return jsonResponse({ error: 'Data dengan ID ' + idValue + ' tidak ditemukan' });
      }
      
      // Cascade delete assignments if it is Playbook
      if (sheetName === 'Playbook') {
        var assignSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Play Assignment');
        if (assignSheet) {
          var lastRowAssign = assignSheet.getLastRow();
          if (lastRowAssign > 1) {
            var headersAssign = assignSheet.getRange(1, 1, 1, assignSheet.getLastColumn()).getValues()[0];
            var playIdColIdx = headersAssign.indexOf('play_id') + 1;
            if (playIdColIdx > 0) {
              for (var r = lastRowAssign; r >= 2; r--) {
                var val = assignSheet.getRange(r, playIdColIdx).getValue();
                if (String(val).trim() === String(idValue).trim()) {
                  assignSheet.deleteRow(r);
                }
              }
            }
          }
        }
      }

      sheet.deleteRow(rowIndex);
      return jsonResponse({ status: 'success', message: 'Data dengan ID ' + idValue + ' berhasil dihapus' });
    }

    // ACTION: UPDATE
    if (action === 'update') {
      var idValue = body.id;
      if (!conf) {
        return jsonResponse({ error: 'Konfigurasi ID untuk sheet ini tidak ditemukan' });
      }
      var rowIndex = findRowIndexById(sheet, conf.key, idValue);
      if (rowIndex === -1) {
        return jsonResponse({ error: 'Data dengan ID ' + idValue + ' tidak ditemukan' });
      }

      // Pastikan ID tidak berubah
      data[conf.key] = idValue;

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var newRow = headers.map(function (header) {
        return data[header] !== undefined ? data[header] : '';
      });

      var range = sheet.getRange(rowIndex, 1, 1, headers.length);
      range.setValues([newRow]);

      // Cascade update assignments if it is Playbook
      if (sheetName === 'Playbook') {
        var assignSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Play Assignment');
        if (assignSheet) {
          // 1. Delete existing assignments
          var lastRowAssign = assignSheet.getLastRow();
          if (lastRowAssign > 1) {
            var headersAssign = assignSheet.getRange(1, 1, 1, assignSheet.getLastColumn()).getValues()[0];
            var playIdColIdx = headersAssign.indexOf('play_id') + 1;
            if (playIdColIdx > 0) {
              for (var r = lastRowAssign; r >= 2; r--) {
                var val = assignSheet.getRange(r, playIdColIdx).getValue();
                if (String(val).trim() === String(idValue).trim()) {
                  assignSheet.deleteRow(r);
                }
              }
            }
          }

          // 2. Insert new assignments
          var assignments = body.assignments || [];
          var headersAssign = assignSheet.getRange(1, 1, 1, assignSheet.getLastColumn()).getValues()[0];

          assignments.forEach(function (asg) {
            asg['play_id'] = idValue;
            asg['assignment_id'] = generateNextId(assignSheet, 'assignment_id', 'PA');

            var newAsgRow = headersAssign.map(function (h) {
              return asg[h] !== undefined ? asg[h] : '';
            });
            assignSheet.appendRow(newAsgRow);
          });
        }
      }

      return jsonResponse({ status: 'success', row: newRow, data: data });
    }

    // ACTION: CREATE
    var nextId = '';
    if (conf) {
      if (!data[conf.key] || data[conf.key].toString().trim() === '') {
        nextId = generateNextId(sheet, conf.key, conf.prefix);
        data[conf.key] = nextId;
      } else {
        nextId = data[conf.key];
      }
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newRow = headers.map(function (header) {
      return data[header] !== undefined ? data[header] : '';
    });

    sheet.appendRow(newRow);

    // Save assignments if it is Playbook
    if (sheetName === 'Playbook') {
      var assignSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Play Assignment');
      if (assignSheet) {
        var assignments = body.assignments || [];
        var headersAssign = assignSheet.getRange(1, 1, 1, assignSheet.getLastColumn()).getValues()[0];

        assignments.forEach(function (asg) {
          asg['play_id'] = nextId;
          asg['assignment_id'] = generateNextId(assignSheet, 'assignment_id', 'PA');

          var newAsgRow = headersAssign.map(function (h) {
            return asg[h] !== undefined ? asg[h] : '';
          });
          assignSheet.appendRow(newAsgRow);
        });
      }
    }

    return jsonResponse({ status: 'success', row: newRow, data: data });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function findRowIndexById(sheet, idHeaderName, idValue) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idColIdx = headers.indexOf(idHeaderName) + 1;
  if (idColIdx <= 0) return -1;

  var ids = sheet.getRange(2, idColIdx, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(idValue).trim()) {
      return i + 2; // 2-indexed: 1-indexed sheet + skip header row
    }
  }
  return -1;
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
