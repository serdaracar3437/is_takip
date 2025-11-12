// index.js (Render / production uyumlu, statik dosya & API ayrımı düzgün)
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Statik dosyaları public klasöründen sun
app.use(express.static(path.join(__dirname, "public")));

// PostgreSQL bağlantısı (env değişkenleri Render panelinde setli olmalı)
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

// DB başlatma: tablolar + otomatik admin oluşturma (parametrized queries)
(async () => {
  try {
    // users tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'personel',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // tasks tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100),
        isemri_numarasi VARCHAR(50),
        urun_kodu VARCHAR(50),
        tarih DATE,
        yapilan_faaliyet VARCHAR(255),
        aciklama TEXT,
        kullanilan_malzeme TEXT,
        baslama_saati TIME,
        bitis_saati TIME,
        islem_adedi INTEGER,
        hata_kodu1 VARCHAR(50),
        hata_sayisi1 INTEGER,
        hata_kodu2 VARCHAR(50),
        hata_sayisi2 INTEGER,
        hata_kodu3 VARCHAR(50),
        hata_sayisi3 INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // admin kontrolü - varsa ekleme
    const adminName = process.env.INIT_ADMIN_USERNAME || "admin";
    const adminPass = process.env.INIT_ADMIN_PASSWORD || "12345"; // test için; prod'da değiştir

    const check = await pool.query("SELECT id FROM users WHERE username=$1", [adminName]);
    if (check.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (username, password, role) VALUES ($1, $2, $3)",
        [adminName, adminPass, "admin"]
      );
      console.log(`✅ Başlangıç admini oluşturuldu: ${adminName} / ${adminPass}`);
    } else {
      console.log("🔹 Başlangıç admini zaten mevcut.");
    }

    console.log("✅ Veritabanı tabloları hazır.");
  } catch (err) {
    console.error("❌ DB başlatma hatası:", err);
  }
})();

// --------------------
// API ROUTES
// --------------------

// Giriş
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  try {
    const result = await pool.query(
      "SELECT id, username, role FROM users WHERE username=$1 AND password=$2",
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Kullanıcı adı veya şifre hatalı" });
    }
    const user = result.rows[0];
    // role döndür
    return res.json({ success: true, user });
  } catch (err) {
    console.error("Giriş hatası:", err);
    return res.status(500).json({ success: false, message: "Sunucu hatası", details: err.message });
  }
});

// Yeni kullanıcı ekle (admin tarafından çağrılmalı — burası basit, auth yok)
app.post("/api/addUser", async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "username ve password gerekli" });
  try {
    const exists = await pool.query("SELECT id FROM users WHERE username=$1", [username]);
    if (exists.rows.length > 0) return res.status(400).json({ error: "Bu kullanıcı adı zaten var" });

    const result = await pool.query(
      "INSERT INTO users (username, password, role) VALUES ($1,$2,$3) RETURNING id, username, role",
      [username, password, role || "personel"]
    );
    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Kullanıcı ekleme hatası:", err);
    return res.status(500).json({ error: "Kullanıcı eklenemedi", details: err.message });
  }
});

// Görev ekleme
app.post("/api/tasks", async (req, res) => {
  try {
    const t = req.body || {};
    const q = `
      INSERT INTO tasks (
        username, isemri_numarasi, urun_kodu, tarih, yapilan_faaliyet, aciklama,
        kullanilan_malzeme, baslama_saati, bitis_saati, islem_adedi,
        hata_kodu1, hata_sayisi1, hata_kodu2, hata_sayisi2, hata_kodu3, hata_sayisi3
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      ) RETURNING *;
    `;
    const values = [
      t.username || null,
      t.isemri_numarasi || null,
      t.urun_kodu || null,
      t.tarih || null,
      t.yapilan_faaliyet || null,
      t.aciklama || null,
      t.kullanilan_malzeme || null,
      t.baslama_saati || null,
      t.bitis_saati || null,
      t.islem_adedi ? parseInt(t.islem_adedi) : null,
      t.hata_kodu1 || null,
      t.hata_sayisi1 ? parseInt(t.hata_sayisi1) : null,
      t.hata_kodu2 || null,
      t.hata_sayisi2 ? parseInt(t.hata_sayisi2) : null,
      t.hata_kodu3 || null,
      t.hata_sayisi3 ? parseInt(t.hata_sayisi3) : null
    ];
    const result = await pool.query(q, values);
    return res.json({ success: true, task: result.rows[0] });
  } catch (err) {
    console.error("Veri ekleme hatası:", err);
    return res.status(500).json({ success: false, error: "Veri kaydedilemedi", details: err.message });
  }
});

// Logout
app.post("/api/logout", (req, res) => {
  return res.json({ success: true, message: "Çıkış yapıldı", redirect: "/" });
});

// API için 404 (eğer /api/... ama route yoksa JSON dön)
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint bulunamadı" });
});

// Eğer istek statik dosya veya gerçek endpoint değilse index.html dön (SPA davranışı)
// **DİKKAT:** Bu satır API rotalarından SONRA gelmeli, aksi halde /api/* isteklerini yakalar.
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});



// Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Sunucu ${PORT} portunda çalışıyor...`));
