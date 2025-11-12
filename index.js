const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔗 PostgreSQL bağlantısı
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { require: true, rejectUnauthorized: false },
});

// 🚀 Veritabanı tabloları
(async () => {
  try {
    console.log("🔄 Veritabanı bağlantısı deneniyor...");
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
        user_id INT REFERENCES users(id),
        isemri_numarasi VARCHAR(50),
        urun_kodu VARCHAR(50),
        tarih DATE,
        yapilan_faaliyet TEXT,
        aciklama TEXT,
        kullanilan_malzeme TEXT,
        baslama_saati TIME,
        bitis_saati TIME,
        islem_adedi INT,
        hata_kodu1 VARCHAR(50),
        hata_sayisi1 INT,
        hata_kodu2 VARCHAR(50),
        hata_sayisi2 INT,
        hata_kodu3 VARCHAR(50),
        hata_sayisi3 INT
      );
    `);

    const adminCheck = await pool.query(`SELECT * FROM users WHERE username='admin'`);
    if (adminCheck.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin')`
      );
      console.log("👑 Yönetici hesabı oluşturuldu: admin / admin123");
    }

    console.log("✅ Tablolar kontrol edildi ve oluşturuldu.");
  } catch (err) {
    console.error("❌ Veritabanı hazırlama hatası:", err.message);
  }
})();

// 🌍 Test rotası
app.get("/", (req, res) => res.send("🚀 is_takip sunucusu aktif!"));

// 🔐 Giriş
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username=$1 AND password=$2",
      [username, password]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "Hatalı kullanıcı adı veya şifre" });
    }
  } catch (err) {
    console.error("❌ Giriş hatası:", err.message);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

// Çıkış (Logout)
app.post("/api/logout", (req, res) => {
  // İleride session sistemi kurarsak burada oturumu sıfırlarız
  res.json({ success: true, message: "Çıkış yapıldı", redirect: "/" });
});

// 📝 Kayıt ol
app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    const exists = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
    if (exists.rows.length > 0)
      return res.status(400).json({ success: false, message: "Bu kullanıcı zaten var." });

    const result = await pool.query(
      "INSERT INTO users (username, password, role) VALUES ($1, $2, 'personel') RETURNING *",
      [username, password]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("❌ Kayıt hatası:", err.message);
    res.status(500).json({ success: false, message: "Kayıt başarısız" });
  }
});

// 🚪 Çıkış
app.post("/api/logout", (req, res) => {
  res.json({ success: true, message: "Çıkış yapıldı" });
});

// 🧾 Yeni iş kaydı ekleme
app.post("/api/tasks", async (req, res) => {
  try {
    const t = req.body;
    const query = `
      INSERT INTO tasks (
        user_id, isemri_numarasi, urun_kodu, tarih, yapilan_faaliyet, aciklama,
        kullanilan_malzeme, baslama_saati, bitis_saati, islem_adedi,
        hata_kodu1, hata_sayisi1, hata_kodu2, hata_sayisi2, hata_kodu3, hata_sayisi3
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      ) RETURNING *;
    `;
    const values = [
      t.user_id || null,
      t.isemri_numarasi || null,
      t.urun_kodu || null,
      t.tarih || null,
      t.yapilan_faaliyet || null,
      t.aciklama || null,
      t.kullanilan_malzeme || null,
      t.baslama_saati || null,
      t.bitis_saati || null,
      parseInt(t.islem_adedi) || 0,
      t.hata_kodu1 || null,
      parseInt(t.hata_sayisi1) || 0,
      t.hata_kodu2 || null,
      parseInt(t.hata_sayisi2) || 0,
      t.hata_kodu3 || null,
      parseInt(t.hata_sayisi3) || 0,
    ];

    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("❌ İş kaydı ekleme hatası:", err.message);
    res.status(500).json({ error: "Veri kaydedilemedi" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Sunucu ${PORT} portunda çalışıyor...`));
