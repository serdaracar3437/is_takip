const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const path = require("path");

// "public" klasörünü statik dosya klasörü olarak ayarla
app.use(express.static(path.join(__dirname, "public")));

// PostgreSQL bağlantısı (Render için SSL zorunlu)
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    require: true, // Render'da zorunlu
    rejectUnauthorized: false, // SSL sertifikasını doğrulama
  },
});

// Veritabanı bağlantısını test et
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Veritabanına başarıyla bağlanıldı!");
    const now = await client.query("SELECT NOW()");
    console.log("⏱️ PostgreSQL Saati:", now.rows[0].now);
    client.release();
  } catch (err) {
    console.error("❌ Veritabanı bağlantı hatası:", err);
  }
})();

// Basit test rotası
app.get("/", (req, res) => {
  res.send("🚀 is_takip sunucusu çalışıyor!");
});

// Yeni görev ekleme endpoint
app.post("/api/tasks", async (req, res) => {
  try {
    const t = req.body;
    const query = `
      INSERT INTO tasks (
        isemri_numarasi, urun_kodu, tarih, yapilan_faaliyet, aciklama, kullanilan_malzeme,
        baslama_saati, bitis_saati, islem_adedi,
        hata_kodu1, hata_sayisi1, hata_kodu2, hata_sayisi2, hata_kodu3, hata_sayisi3
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      ) RETURNING *;
    `;

    const values = [
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
    console.error("❌ Veri ekleme hatası:", err);
    res.status(500).json({ error: "Veri kaydedilemedi", details: err.message });
  }
});

// Render için port ayarı
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Sunucu ${PORT} portunda çalışıyor...`);
});
