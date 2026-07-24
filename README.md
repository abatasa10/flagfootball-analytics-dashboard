# PlayMetrics FF — Starter Project

Form input pemain di web → Google Apps Script → Google Sheets kamu.

## Struktur folder
```
flag-football-stats/
├── apps-script/
│   └── Code.gs        <- ditempel ke Apps Script di Google Sheets
└── web/
    ├── index.html
    ├── style.css
    └── script.js
```

## Langkah setup

### 1. Pasang Apps Script
1. Buka Google Sheets **PlayMetrics FF** kamu
2. Menu **Extensions > Apps Script**
3. Hapus isi default, paste seluruh isi `apps-script/Code.gs`
4. Klik **Deploy > New deployment**
   - Klik ikon gear ⚙️ di samping "Select type" → pilih **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Klik **Deploy**, izinkan permission-nya (Google akan minta konfirmasi)
6. Copy URL yang muncul, bentuknya:
   `https://script.google.com/macros/s/xxxxxxxxxxxxx/exec`

⚠️ Setiap kali kamu **mengedit script**, kamu harus bikin deployment baru
(Deploy > Manage deployments > pencet edit ✏️ > New version) supaya
perubahan kepakai di URL yang sama.

### 2. Sambungkan ke web
1. Buka `web/script.js`
2. Ganti baris ini:
   ```js
   const API_URL = 'PASTE_URL_APPS_SCRIPT_KAMU_DI_SINI';
   ```
   dengan URL dari langkah sebelumnya.

### 3. Coba jalankan
Karena `fetch()` butuh dijalankan lewat server (bukan buka file HTML
langsung dari folder), pakai salah satu cara ini:

- **VS Code**: install extension "Live Server", klik kanan `index.html` > "Open with Live Server"
- **Python** (kalau sudah terinstall): buka terminal di folder `web/`, jalankan:
  ```
  python -m http.server 8000
  ```
  lalu buka `http://localhost:8000` di browser

### 4. Deploy ke internet (gratis)
Setelah jalan lancar di lokal:
1. Push folder `web/` ke repository GitHub
2. Hubungkan repo itu ke **Netlify** atau **Vercel** (tinggal connect akun GitHub, drag-and-drop juga bisa)
3. Dapat URL gratis kayak `namamu.netlify.app`

## Cara kerja singkat
- **GET** `API_URL?sheet=Master Player` → balikin semua baris di tab itu sebagai JSON
- **POST** ke `API_URL` dengan body `{ sheet, data }` → nambah 1 baris baru

Script ini generic — kamu bisa pakai untuk tab lain juga (misalnya
`Master Team` atau tab statistik pertandingan) tinggal ganti `SHEET_NAME`
di `script.js` dan sesuaikan field form-nya dengan kolom di tab itu.

## Catatan penting
- Sheet **tidak perlu** di-share publik — karena Apps Script jalan
  "sebagai kamu" (Execute as: Me), dia otomatis punya akses ke sheet kamu.
- Kalau nanti mau nambah statistik pertandingan, bikin tab baru
  (misal `Match Stats`) dengan kolom sendiri, lalu bikin form kedua
  di halaman lain yang POST ke `sheet: 'Match Stats'`.
