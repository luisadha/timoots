# Cek Mutual Threads

Aplikasi web Node.js (tanpa dependency) untuk mengetahui siapa yang saling follow di Threads.

Threads API resmi tidak menyediakan daftar followers/following, dan scraping atau login tidak resmi berisiko membuat akun dibatasi. Karena itu aplikasi ini membaca file hasil **"Download your information"** dari akun Anda sendiri. File diproses sepenuhnya di browser; server hanya menyajikan halaman statis dan tidak menerima data pengguna.

## Fitur
- Unggah banyak file sekaligus (mis. `followers_1.json`, `followers_2.json`), atau tempel username manual
- Format didukung: JSON, HTML (ekspor Meta), TXT/CSV (satu username per baris, boleh berupa URL)
- Hasil: **Mutual**, **Tidak follow balik**, **Penggemar**, lengkap dengan pencarian, salin, dan unduh CSV/JSON
- Server tanpa dependency, header keamanan (CSP, dll), endpoint `/healthz`, shutdown halus

## Menjalankan lokal
```bash
npm start            # http://localhost:3000
PORT=8080 npm start  # ganti port
npm test             # uji parser
```
Butuh Node.js 18+.

## Deploy

### Docker
```bash
docker build -t threads-mutual .
docker run -d -p 3000:3000 --restart unless-stopped threads-mutual
```

### Railway / Render / Fly.io / Heroku
Hubungkan repositori. Platform akan memakai `Dockerfile` atau `Procfile` (`web: node server.js`) dan menyuntikkan `PORT` otomatis. Healthcheck path: `/healthz`.

### VPS biasa
```bash
git clone <repo> && cd threads-mutual-web
PORT=3000 node server.js          # atau dengan pm2: pm2 start server.js --name threads-mutual
```
Letakkan di belakang reverse proxy (Nginx/Caddy) dengan HTTPS. Aktifkan HSTS di proxy tersebut.

## Variabel lingkungan
| Nama | Default | Keterangan |
|------|---------|------------|
| `PORT` | `3000` | Port server |
| `HOST` | `0.0.0.0` | Alamat bind |

## Cara mengambil data dari Meta
1. Pengaturan Threads/Instagram → **Pusat Akun (Accounts Center)** → **Informasi dan izin Anda** → **Unduh informasi Anda**.
2. Pilih akun Threads, data **Followers and following**, format **JSON** (atau HTML).
3. Unduh dan ekstrak ZIP, lalu unggah file followers dan following ke aplikasi.

Struktur ekspor bisa berbeda antar versi; parser mencari username dari JSON, HTML, atau teks biasa.

## Struktur
```
server.js        server statis + /healthz
public/          index.html, style.css, app.js, core.js, favicon.svg
test/            tes parser dan perbandingan
Dockerfile, Procfile
```
