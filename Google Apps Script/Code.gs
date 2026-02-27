// Google Apps Script - Simpan di Extensions > Apps Script

function doPost(e) {
  try {
    // Parse data yang diterima
    var data = JSON.parse(e.postData.contents);
    
    // Buka spreadsheet aktif
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Timestamp
    var timestamp = new Date().toLocaleString('id-ID');
    
    // Jika ada multiple treatments, buat baris untuk masing-masing
    var treatments = data.treatments || [];
    
    if (treatments.length === 0) {
      // Jika tidak ada treatment, tetap simpan data pasien
      sheet.appendRow([
        timestamp,
        data.noInvoice,
        data.tanggal,
        data.jatuhTempo,
        data.namaPasien,
        data.noRegistrasi,
        data.noMR,
        '-',
        '-',
        '-',
        data.total,
        data.pembayaran,
        data.sisa
      ]);
    } else {
      // Simpan setiap treatment sebagai baris terpisah
      treatments.forEach(function(t, index) {
        sheet.appendRow([
          timestamp,
          data.noInvoice,
          data.tanggal,
          data.jatuhTempo,
          data.namaPasien,
          data.noRegistrasi,
          data.noMR,
          t.ket || '-',
          t.jml || '-',
          t.sub || '-',
          index === 0 ? data.total : '', // Total hanya di baris pertama
          index === 0 ? data.pembayaran : '',
          index === 0 ? data.sisa : ''
        ]);
      });
    }
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: 'Data berhasil disimpan!' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Fungsi untuk test
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Invoice API is running!' }))
    .setMimeType(ContentService.MimeType.JSON);
}
