const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// PostgreSQL bağlantısı
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false } // Render/Postgres için gerekli
});

// 🌟 Sunucu Başlatıldığında Tabloyu Oluştur ve Admin'i Ekle
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'personel'
      );
    `);

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
        hata_sayisi3 INTEGER
      );
    `);

    // 🔑 Eğer admin yoksa otomatik ekle
    const adminCheck = await pool.query(`SELECT * FROM users WHERE username='admin'`);
    if (adminCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO users (username, password, role)
        VALUES ('admin', '12345', 'admin');
      `);
      console.log("✅ Admin kullanıcısı oluşturuldu (admin / 12345)");
    } else {
      console.log("🔹 Admin zaten mevcut.");
    }

    console.log("✅ Veritabanı bağlantısı başarılı!");
  } catch (err) {
    console.error("❌ Veritabanı başlatma hatası:", err);
  }
})();

// 🔹 Giriş İşlemi
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username=$1 AND password=$2", [username, password]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (user.role === "admin") {
        res.json({ success: true, role: "admin", redirect: "/admin.html" });
      } else {
        res.json({ success: true, role: "personel", redirect: "/personel.html" });
      }
    } else {
      res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
    }
  } catch (err) {
    console.error("Login hatası:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// 🔹 Admin Yeni Kullanıcı Ekleme
app.post("/api/addUser", async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const result = await pool.query("INSERT INTO users (username, password, role) VALUES ($1,$2,$3) RETURNING *", [
      username,
      password,
      role || "personel"
    ]);
    res.json({ success: true, message: "Yeni kullanıcı eklendi", user: result.rows[0] });
  } catch (err) {
    console.error("Kullanıcı ekleme hatası:", err);
    res.status(500).json({ error: "Kullanıcı eklenemedi", details: err.message });
  }
});

// 🔹 Görev Kaydetme
app.post("/api/tasks", async (req, res) => {
  try {
    const t = req.body;
    const query = `
      INSERT INTO tasks (
        username, isemri_numarasi, urun_kodu, tarih, yapilan_faaliyet, aciklama,
        kullanilan_malzeme, baslama_saati, bitis_saati, islem_adedi,
        hata_kodu1, hata_sayisi1, hata_kodu2, hata_sayisi2, hata_kodu3, hata_sayisi3
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      ) RETURNING *;
    `;
    const values = [
      t.username, t.isemri_numarasi, t.urun_kodu, t.tarih, t.yapilan_faaliyet, t.aciklama,
      t.kullanilan_malzeme, t.baslama_saati, t.bitis_saati, t.islem_adedi,
      t.hata_kodu1 || null, t.hata_sayisi1 || null, t.hata_kodu2 || null, t.hata_sayisi2 || null,
      t.hata_kodu3 || null, t.hata_sayisi3 || null
    ];
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Veri ekleme hatası:", err);
    res.status(500).json({ error: "Veri kaydedilemedi", details: err.message });
  }
});

// 🔹 Logout (Çıkış)
app.post("/api/logout", (req, res) => {
  res.json({ success: true, message: "Çıkış yapıldı", redirect: "/" });
});

// Sunucu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda çalışıyor...`));
