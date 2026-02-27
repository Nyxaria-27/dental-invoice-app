// ==================== PASSWORD CONFIG ====================
// GANTI PASSWORD DI SINI (bisa diubah kapan saja)
const APP_PASSWORD = 'perigigi123';

// ==================== LOGIN FUNCTIONS ====================
function checkPassword() {
    const input = document.getElementById('password-input').value;
    const error = document.getElementById('login-error');
    
    if (input === APP_PASSWORD) {
        // Password benar - simpan session
        sessionStorage.setItem('loggedIn', 'true');
        showApp();
    } else {
        // Password salah
        error.textContent = 'Password salah! Coba lagi.';
        document.getElementById('password-input').value = '';
    }
}

function handleEnter(event) {
    if (event.key === 'Enter') {
        checkPassword();
    }
}

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
}

function checkSession() {
    // Cek apakah sudah login sebelumnya (dalam session yang sama)
    if (sessionStorage.getItem('loggedIn') === 'true') {
        showApp();
    }
}

// ==================== INIT ====================
// GANTI URL INI DENGAN URL DARI GOOGLE APPS SCRIPT ANDA
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby845EwfihOFEuaUUzgsPL-vtS7jHwSTEmc0yGP9OZddJl3W8_EbbV_y9oJ_0jnblDmyQ/exec';

document.addEventListener('DOMContentLoaded', function() {
    // Cek session login
    checkSession();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggal').value = today;
    loadHistory();
    generateInvoiceNumber();
});

// ==================== INVOICE NUMBER ====================
function generateInvoiceNumber() {
    const history = JSON.parse(localStorage.getItem('invoiceHistory') || '[]');
    const nextNum = history.length + 1;
    const paddedNum = String(nextNum).padStart(3, '0');
    const month = new Date().toISOString().slice(0, 7).replace('-', '');
    document.getElementById('no-invoice').value = `INV-${month}-${paddedNum}`;
}

// ==================== FORMAT CURRENCY ====================
function formatCurrency(input) {
    let value = input.value.replace(/[^\d]/g, '');
    if (value === '') {
        input.value = '';
        return;
    }
    let formatted = parseInt(value).toLocaleString('id-ID');
    input.value = 'Rp ' + formatted;
}

function parseCurrency(str) {
    if (!str) return 0;
    return parseInt(str.replace(/[^\d]/g, '')) || 0;
}

// ==================== CALCULATE ====================
function calculateTotal() {
    const subtotals = document.querySelectorAll('.inp-sub');
    let total = 0;
    subtotals.forEach(input => {
        total += parseCurrency(input.value);
    });
    document.getElementById('total-display').textContent = 'Rp ' + total.toLocaleString('id-ID');
    calculateSisa();
}

function calculateSisa() {
    const total = parseCurrency(document.getElementById('total-display').textContent);
    const pembayaran = parseCurrency(document.getElementById('pembayaran').value);
    const sisa = total - pembayaran;
    document.getElementById('sisa-display').textContent = 'Rp ' + sisa.toLocaleString('id-ID');
}

// ==================== ADD/REMOVE ROW ====================
function addRow() {
    const tbody = document.getElementById('table-body');
    const row = document.createElement('div');
    row.className = 'table-row';
    row.innerHTML = `
        <div class="col-ket"><textarea class="inp-ket" rows="1" oninput="autoResize(this)"></textarea></div>
        <div class="col-jml"><input type="number" class="inp-jml" value="1" min="1"></div>
        <div class="col-sub"><input type="text" class="inp-sub" oninput="formatCurrency(this); calculateTotal()"></div>
        <button class="btn-del no-print" onclick="removeRow(this)">×</button>
    `;
    tbody.appendChild(row);
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function removeRow(btn) {
    const rows = document.querySelectorAll('.table-row');
    if (rows.length > 1) {
        btn.closest('.table-row').remove();
        calculateTotal();
    } else {
        showNotif('Minimal 1 baris treatment!', 'error');
    }
}

// ==================== SAVE ====================
function saveInvoice() {
    const data = collectData();
    if (!data.noInvoice || !data.namaPasien) {
        showNotif('No. Invoice dan Nama Pasien harus diisi!', 'error');
        return;
    }
    
    // Simpan ke localStorage
    let history = JSON.parse(localStorage.getItem('invoiceHistory') || '[]');
    const idx = history.findIndex(inv => inv.noInvoice === data.noInvoice);
    
    if (idx >= 0) {
        history[idx] = data;
    } else {
        history.unshift(data);
    }
    
    localStorage.setItem('invoiceHistory', JSON.stringify(history));
    loadHistory();
    
    // Kirim ke Google Spreadsheet jika URL sudah diset
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== 'PASTE_URL_APPS_SCRIPT_DISINI') {
        sendToGoogleSheet(data);
    } else {
        showNotif('Invoice disimpan! (Google Sheet belum disetup)', 'success');
    }
}

// Kirim data ke Google Spreadsheet
async function sendToGoogleSheet(data) {
    try {
        showNotif('Menyimpan ke Google Sheet...', 'info');
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Required for Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        // Karena no-cors, kita tidak bisa baca response
        // Tapi jika tidak error, berarti berhasil
        showNotif('Invoice disimpan & dikirim ke Google Sheet!', 'success');
        
    } catch (error) {
        console.error('Google Sheet Error:', error);
        showNotif('Tersimpan lokal, gagal kirim ke Google Sheet', 'error');
    }
}

function collectData() {
    const treatments = [];
    document.querySelectorAll('.table-row').forEach(row => {
        treatments.push({
            ket: row.querySelector('.inp-ket').value,
            jml: row.querySelector('.inp-jml').value,
            sub: row.querySelector('.inp-sub').value
        });
    });
    
    return {
        noInvoice: document.getElementById('no-invoice').value,
        tanggal: document.getElementById('tanggal').value,
        jatuhTempo: document.getElementById('jatuh-tempo').value,
        namaPasien: document.getElementById('nama-pasien').value,
        noRegistrasi: document.getElementById('no-registrasi').value,
        noMR: document.getElementById('no-mr').value,
        treatments: treatments,
        total: document.getElementById('total-display').textContent,
        pembayaran: document.getElementById('pembayaran').value,
        sisa: document.getElementById('sisa-display').textContent,
        savedAt: new Date().toISOString()
    };
}

// ==================== HISTORY ====================
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('invoiceHistory') || '[]');
    const container = document.getElementById('history-list');
    
    if (history.length === 0) {
        container.innerHTML = '<p style="color:#999;font-size:11px;text-align:center;">Belum ada invoice</p>';
        return;
    }
    
    container.innerHTML = history.map(inv => `
        <div class="history-item" onclick="loadInvoice('${inv.noInvoice}')">
            <div class="h-inv">${inv.noInvoice}</div>
            <div class="h-name">${inv.namaPasien || '-'}</div>
            <div class="h-date">${formatDate(inv.tanggal)}</div>
        </div>
    `).join('');
}

function loadInvoice(noInvoice) {
    const history = JSON.parse(localStorage.getItem('invoiceHistory') || '[]');
    const inv = history.find(i => i.noInvoice === noInvoice);
    if (!inv) return;
    
    document.getElementById('no-invoice').value = inv.noInvoice;
    document.getElementById('tanggal').value = inv.tanggal;
    document.getElementById('jatuh-tempo').value = inv.jatuhTempo;
    document.getElementById('nama-pasien').value = inv.namaPasien;
    document.getElementById('no-registrasi').value = inv.noRegistrasi;
    document.getElementById('no-mr').value = inv.noMR;
    document.getElementById('pembayaran').value = inv.pembayaran;
    
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    inv.treatments.forEach(t => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <div class="col-ket"><textarea class="inp-ket" rows="1" oninput="autoResize(this)">${t.ket || ''}</textarea></div>
            <div class="col-jml"><input type="number" class="inp-jml" value="${t.jml || 1}" min="1"></div>
            <div class="col-sub"><input type="text" class="inp-sub" value="${t.sub || ''}" oninput="formatCurrency(this); calculateTotal()"></div>
            <button class="btn-del no-print" onclick="removeRow(this)">×</button>
        `;
        tbody.appendChild(row);
        // Auto resize loaded textarea
        const textarea = row.querySelector('.inp-ket');
        autoResize(textarea);
    });
    
    calculateTotal();
    showNotif('Invoice dimuat!', 'success');
}

function clearHistory() {
    if (confirm('Hapus semua riwayat invoice?')) {
        localStorage.removeItem('invoiceHistory');
        loadHistory();
        showNotif('Riwayat dihapus!', 'success');
    }
}

// ==================== RESET ====================
function resetForm() {
    document.getElementById('nama-pasien').value = '';
    document.getElementById('no-registrasi').value = '';
    document.getElementById('no-mr').value = '';
    document.getElementById('jatuh-tempo').value = '';
    document.getElementById('pembayaran').value = '';
    document.getElementById('tanggal').value = new Date().toISOString().split('T')[0];
    
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = `
        <div class="table-row">
            <div class="col-ket"><textarea class="inp-ket" rows="1" oninput="autoResize(this)"></textarea></div>
            <div class="col-jml"><input type="number" class="inp-jml" value="1" min="1"></div>
            <div class="col-sub"><input type="text" class="inp-sub" oninput="formatCurrency(this); calculateTotal()"></div>
            <button class="btn-del no-print" onclick="removeRow(this)">×</button>
        </div>
        <div class="table-row">
            <div class="col-ket"><textarea class="inp-ket" rows="1" oninput="autoResize(this)"></textarea></div>
            <div class="col-jml"><input type="number" class="inp-jml" value="1" min="1"></div>
            <div class="col-sub"><input type="text" class="inp-sub" oninput="formatCurrency(this); calculateTotal()"></div>
            <button class="btn-del no-print" onclick="removeRow(this)">×</button>
        </div>
        <div class="table-row">
            <div class="col-ket"><textarea class="inp-ket" rows="1" oninput="autoResize(this)"></textarea></div>
            <div class="col-jml"><input type="number" class="inp-jml" value="1" min="1"></div>
            <div class="col-sub"><input type="text" class="inp-sub" oninput="formatCurrency(this); calculateTotal()"></div>
            <button class="btn-del no-print" onclick="removeRow(this)">×</button>
        </div>
    `;
    
    generateInvoiceNumber();
    document.getElementById('total-display').textContent = '';
    document.getElementById('sisa-display').textContent = '';
    showNotif('Form direset!', 'success');
}

// ==================== DOWNLOAD PDF ====================
async function downloadPDF() {
    const invoice = document.getElementById('invoice');
    const noInvoice = document.getElementById('no-invoice').value || 'Invoice';
    const namaPasien = document.getElementById('nama-pasien').value || 'Pasien';
    
    // Show loading
    showNotif('Membuat PDF...', 'info');
    
    // Add PDF mode
    invoice.classList.add('pdf-mode');
    
    // Hide buttons
    const noPrintElements = invoice.querySelectorAll('.no-print');
    noPrintElements.forEach(el => el.style.display = 'none');
    
    // Convert all inputs and textareas to static text for PDF
    const allInputs = invoice.querySelectorAll('input, textarea');
    const inputData = [];
    
    allInputs.forEach(input => {
        const span = document.createElement('span');
        span.textContent = input.value || '';
        span.className = 'pdf-static-text';
        
        // Get parent width for proper wrapping
        const parentWidth = input.parentElement.offsetWidth;
        
        span.style.cssText = `
            display: block;
            font-family: inherit;
            font-size: inherit;
            font-weight: inherit;
            color: inherit;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-wrap: break-word;
            word-break: break-all;
            max-width: ${parentWidth}px;
            line-height: 1.4;
        `;
        
        inputData.push({
            input: input,
            span: span
        });
        
        input.style.display = 'none';
        input.parentNode.insertBefore(span, input.nextSibling);
    });
    
    try {
        // Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Capture with html2canvas - fixed size 794x1123 (A4 at 96dpi)
        const canvas = await html2canvas(invoice, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#fce4ec',
            logging: false,
            width: 794,
            height: 1123
        });
        
        // Create PDF with jsPDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // A4 size in mm: 210 x 297
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        pdf.save(`${noInvoice}_${namaPasien}.pdf`);
        
        showNotif('PDF berhasil didownload!', 'success');
    } catch (error) {
        console.error('PDF Error:', error);
        showNotif('Gagal membuat PDF. Coba lagi.', 'error');
    }
    
    // Restore inputs
    inputData.forEach(data => {
        data.span.remove();
        data.input.style.display = '';
    });
    
    noPrintElements.forEach(el => el.style.display = '');
    invoice.classList.remove('pdf-mode');
}

// ==================== UTILITIES ====================
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function showNotif(msg, type) {
    const existing = document.querySelector('.notif');
    if (existing) existing.remove();
    
    const notif = document.createElement('div');
    notif.className = `notif ${type}`;
    notif.textContent = msg;
    document.body.appendChild(notif);
    
    setTimeout(() => notif.remove(), 3000);
}
