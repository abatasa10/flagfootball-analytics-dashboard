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
    var action = (e.parameter.action || '').trim().toLowerCase();
    
    if (action === 'inspectsource') {
      var sourceSs = SpreadsheetApp.openById('1FwV_WuB-aDZb_EXXrR0CaDWwsG3mihonu5k4P6R1mdU');
      var sheets = sourceSs.getSheets();
      var info = sheets.map(function(s) {
        var rangeVal = s.getLastRow() > 0 ? s.getRange(1, 1, Math.min(5, s.getLastRow()), Math.min(10, s.getLastColumn())).getValues() : [];
        return {
          name: s.getName(),
          rows: s.getLastRow(),
          cols: s.getLastColumn(),
          first5Rows: rangeVal
        };
      });
      return jsonResponse(info);
    }
    
    if (action === 'runimport') {
      return jsonResponse(importPlayersFromSource());
    }

    var sheetName = (e.parameter.sheet || 'Master Player').trim();
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
      sheet = checkAndCreateSheet(sheetName);
      if (!sheet) {
        return jsonResponse({ error: 'Sheet "' + sheetName + '" tidak ditemukan' });
      }
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

    // AI ANALYST ROUTE
    if (action === 'analyze_player') {
      var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
      if (!apiKey) {
        return jsonResponse({ error: 'GEMINI_API_KEY tidak ditemukan di Properties Script Apps Script Anda. Harap tambahkan API Key Anda di bagian Project Settings > Script Properties di editor Apps Script.' });
      }
      
      var prompt = body.prompt;
      if (!prompt) {
        return jsonResponse({ error: 'Prompt analisis kosong.' });
      }
      
      var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
      var payload = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      };
      
      var options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      var response = UrlFetchApp.fetch(url, options);
      var responseText = response.getContentText();
      var responseJson = JSON.parse(responseText);
      
      if (responseJson.candidates && responseJson.candidates[0] && responseJson.candidates[0].content && responseJson.candidates[0].content.parts[0]) {
        var aiText = responseJson.candidates[0].content.parts[0].text;
        return jsonResponse({ analysis: aiText });
      } else {
        return jsonResponse({ error: 'Gagal memanggil Gemini API: ' + responseText });
      }
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      sheet = checkAndCreateSheet(sheetName);
      if (!sheet) {
        return jsonResponse({ error: 'Sheet "' + sheetName + '" tidak ditemukan' });
      }
    }

    // Auto-generate ID configurations
    var idConfig = {
      'Master Player': { key: 'player_id', prefix: 'PL' },
      'Master Team': { key: 'team_id', prefix: 'TM' },
      'Master Position': { key: 'position_id', prefix: 'PS' },
      'Master Route': { key: 'route_id', prefix: 'RT' },
      'Playbook': { key: 'play_id', prefix: 'PB' },
      'Play Assignment': { key: 'assignment_id', prefix: 'PA' },
      'Session': { key: 'session_id', prefix: 'SS' },
      'Session Play': { key: 'play_record_id', prefix: 'SP' }
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

      // Cascade delete plays if it is Session
      if (sheetName === 'Session') {
        var playSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Session Play');
        if (playSheet) {
          var lastRowPlay = playSheet.getLastRow();
          if (lastRowPlay > 1) {
            var headersPlay = playSheet.getRange(1, 1, 1, playSheet.getLastColumn()).getValues()[0];
            var sessionIdColIdx = headersPlay.indexOf('session_id') + 1;
            if (sessionIdColIdx > 0) {
              for (var r = lastRowPlay; r >= 2; r--) {
                var val = playSheet.getRange(r, sessionIdColIdx).getValue();
                if (String(val).trim() === String(idValue).trim()) {
                  playSheet.deleteRow(r);
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

      // Cascade update plays if it is Session
      if (sheetName === 'Session') {
        var playSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Session Play');
        if (playSheet) {
          // 1. Delete existing plays
          var lastRowPlay = playSheet.getLastRow();
          if (lastRowPlay > 1) {
            var headersPlay = playSheet.getRange(1, 1, 1, playSheet.getLastColumn()).getValues()[0];
            var sessionIdColIdx = headersPlay.indexOf('session_id') + 1;
            if (sessionIdColIdx > 0) {
              for (var r = lastRowPlay; r >= 2; r--) {
                var val = playSheet.getRange(r, sessionIdColIdx).getValue();
                if (String(val).trim() === String(idValue).trim()) {
                  playSheet.deleteRow(r);
                }
              }
            }
          }

          // 2. Insert new plays
          var plays = body.plays || [];
          var headersPlay = playSheet.getRange(1, 1, 1, playSheet.getLastColumn()).getValues()[0];

          plays.forEach(function (play) {
            play['session_id'] = idValue;
            play['play_record_id'] = generateNextId(playSheet, 'play_record_id', 'SP');

            var newPlayRow = headersPlay.map(function (h) {
              return play[h] !== undefined ? play[h] : '';
            });
            playSheet.appendRow(newPlayRow);
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

    // Save plays if it is Session
    if (sheetName === 'Session') {
      var playSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Session Play');
      if (playSheet) {
        var plays = body.plays || [];
        var headersPlay = playSheet.getRange(1, 1, 1, playSheet.getLastColumn()).getValues()[0];

        plays.forEach(function (play) {
          play['session_id'] = nextId;
          play['play_record_id'] = generateNextId(playSheet, 'play_record_id', 'SP');

          var newPlayRow = headersPlay.map(function (h) {
            return play[h] !== undefined ? play[h] : '';
          });
          playSheet.appendRow(newPlayRow);
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

function checkAndCreateSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;

  var defaultHeaders = {
    'Master Player': ['player_id', 'name', 'nick_name', 'jersey_number', 'sport', 'position', 'secondary_position', 'height (cm)', 'weight (kg)', 'birth_date', 'team'],
    'Master Team': ['team_id', 'team_name', 'abbreviation', 'description', 'primary_color'],
    'Master Position': ['position_id', 'position_name', 'abbreviation', 'category'],
    'Master Route': ['route_id', 'route_name', 'abbreviation', 'category', 'route_type', 'description', 'status'],
    'Playbook': ['play_id', 'play_name', 'formation', 'offense_type', 'play_category', 'description', 'image', 'active'],
    'Play Assignment': ['assignment_id', 'play_id', 'receiver', 'position', 'route_id'],
    'Session': ['session_id', 'session_type', 'opponent', 'date', 'our_score', 'opponent_score', 'result', 'status'],
    'Session Play': ['play_record_id', 'session_id', 'drive_number', 'round_of_match', 'down', 'category_play', 'play_id', 'route_id', 'result', 'qb_player_id', 'target_player_id', 'yards', 'touchdown', 'reason_incomplete', 'next_status', 'pick_six']
  };

  var headers = defaultHeaders[sheetName];
  if (!headers) return null;

  sheet = ss.insertSheet(sheetName);
  sheet.appendRow(headers);
  return sheet;
}

function importPlayersFromSource() {
  try {
    var sourceSs = SpreadsheetApp.openById('1FwV_WuB-aDZb_EXXrR0CaDWwsG3mihonu5k4P6R1mdU');
    var sourceSheet = sourceSs.getSheetByName('Form MB - Data Pemain');
    if (!sourceSheet) {
      return { error: 'Source sheet "Form MB - Data Pemain" tidak ditemukan di spreadsheet sumber.' };
    }
    
    var destSs = SpreadsheetApp.getActiveSpreadsheet();
    var destSheet = destSs.getSheetByName('Master Player');
    if (!destSheet) {
      return { error: 'Destination sheet "Master Player" tidak ditemukan.' };
    }
    
    // Read source data
    var sourceValues = sourceSheet.getDataRange().getValues();
    var sourceHeaders = sourceValues[0];
    
    // Find column indexes of source
    var colFullName = sourceHeaders.indexOf('Nama Lengkap');
    var colJersey = sourceHeaders.indexOf('No Jersey');
    var colNameOnJersey = sourceHeaders.indexOf('Nama di Jersey');
    var colBirthDate = sourceHeaders.indexOf('Tanggal Lahir');
    var colHeight = sourceHeaders.indexOf('Tinggi Badan');
    var colWeight = sourceHeaders.indexOf('Berat Badan');
    var colPrimaryPos = sourceHeaders.indexOf('Posisi Utama');
    var colSecondaryPos = sourceHeaders.indexOf('Posisi Sekunder');
    
    // If some columns not found by exact string, let's search loosely
    sourceHeaders.forEach(function(h, idx) {
      var lower = String(h).toLowerCase();
      if (colFullName === -1 && lower.indexOf('nama lengkap') !== -1) colFullName = idx;
      if (colJersey === -1 && lower.indexOf('jersey') !== -1) colJersey = idx;
      if (colNameOnJersey === -1 && (lower.indexOf('nama di jersey') !== -1 || lower.indexOf('nama punggung') !== -1)) colNameOnJersey = idx;
      if (colBirthDate === -1 && lower.indexOf('tanggal lahir') !== -1) colBirthDate = idx;
      if (colHeight === -1 && lower.indexOf('tinggi') !== -1) colHeight = idx;
      if (colWeight === -1 && lower.indexOf('berat') !== -1) colWeight = idx;
      if (colPrimaryPos === -1 && lower.indexOf('posisi utama') !== -1) colPrimaryPos = idx;
      if (colSecondaryPos === -1 && lower.indexOf('posisi sekunder') !== -1) colSecondaryPos = idx;
    });
    
    // Read destination data
    var destValues = destSheet.getDataRange().getValues();
    var destHeaders = destValues[0];
    var destRows = destValues.slice(1);
    
    // Build set of existing names (cleaned)
    var existingNames = {};
    destRows.forEach(function(row) {
      var name = String(row[destHeaders.indexOf('name')] || '').toLowerCase().trim();
      if (name) existingNames[name] = true;
    });
    
    var addedCount = 0;
    var skippedCount = 0;
    
    // Helper to clean name (removes (C), (U18), stars, emojis, dsb)
    function cleanName(n) {
      return String(n)
        .replace(/\([Cc]\)/g, '')
        .replace(/\(U\d+\)/g, '')
        .replace(/[⭐★✨]/g, '')
        .trim();
    }
    
    for (var i = 1; i < sourceValues.length; i++) {
      var row = sourceValues[i];
      var rawName = String(row[colFullName] || '').trim();
      if (!rawName) continue;
      
      var cleanedName = cleanName(rawName);
      var nameKey = cleanedName.toLowerCase();
      
      if (existingNames[nameKey]) {
        skippedCount++;
        continue;
      }
      
      // Map properties
      var newPlayer = {
        'player_id': generateNextId(destSheet, 'player_id', 'PL'),
        'name': cleanedName,
        'nick_name': colNameOnJersey !== -1 ? String(row[colNameOnJersey] || '').trim() : '',
        'jersey_number': colJersey !== -1 ? parseInt(row[colJersey], 10) || '' : '',
        'sport': 'Flag Football',
        'position': colPrimaryPos !== -1 ? String(row[colPrimaryPos] || '').trim() : '',
        'secondary_position': colSecondaryPos !== -1 ? String(row[colSecondaryPos] || '').trim() : '',
        'height (cm)': colHeight !== -1 ? parseInt(row[colHeight], 10) || '' : '',
        'weight (kg)': colWeight !== -1 ? parseInt(row[colWeight], 10) || '' : '',
        'birth_date': colBirthDate !== -1 ? String(row[colBirthDate] || '').trim() : '',
        'team': 'Depok'
      };
      
      // Append row
      var newRow = destHeaders.map(function(h) {
        return newPlayer[h] !== undefined ? newPlayer[h] : '';
      });
      destSheet.appendRow(newRow);
      
      existingNames[nameKey] = true;
      addedCount++;
    }
    
    return { status: 'success', added: addedCount, skipped: skippedCount };
  } catch (err) {
    return { error: err.message };
  }
}
