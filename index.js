const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path'); // burayı ekledik
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Statik dosyaları public klasöründen sun
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL bağlantısı
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// DB Bağlantı kontrolü
pool.query('SELECT NOW()').then(res => {
  console.log("DB Bağlantısı Başarılı:", res.rows);
}).catch(err => console.error("DB Bağlantı Hatası:", err));

// Kullanıcı giriş (login)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username=$1',
      [username]
    );

    if(result.rows.length === 0) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });

    const user = result.rows[0];

    if(user.password !== password) return res.status(401).json({ error: 'Şifre hatalı' });

    res.json({ message: 'Giriş başarılı', user: { id: user.id, username: user.username, role: user.role } });

  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası!' });
  }
});

// Yeni personel ekleme (admin tarafından)
app.post('/api/users', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: `Kullanıcı adı "${username}" zaten mevcut` });
    }

    const result = await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *',
      [username, password, role]
    );

    // personel tablosuna ekle
    if (role === 'personel') {
      await pool.query('INSERT INTO personel (username, role) VALUES ($1, $2)', [username, role]);
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Personel ekleme hatası:", err);
    res.status(500).json({ error: 'Personel eklenemedi', details: err.message });
  }
});

// Personel listesi (admin görebilir)
app.get('/api/personel', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM personel ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Personel listeleme hatası:", err);
    res.status(500).json({ error: 'Personeller yüklenemedi' });
  }
});

// Yeni iş kaydı ekleme (personel için)
app.post('/api/tasks', async (req, res) => {
  try {
    const t = req.body;
    const query = `
      INSERT INTO tasks (
        user_id, isemri_numarasi, urun_kodu, tarih, yapilan_faaliyet, aciklama, kullanilan_malzeme,
        baslama_saati, bitis_saati, islem_adedi,
        hata_kodu1, hata_sayisi1, hata_kodu2, hata_sayisi2, hata_kodu3, hata_sayisi3
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      ) RETURNING *;
    `;
const values = [
  t.user_id ? parseInt(t.user_id) : null,
  t.isemri_numarasi,
  t.urun_kodu,
  t.tarih,
  t.yapilan_faaliyet,
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

    const result = await pool.query(query, values);
    res.json(result.rows[0]);

  } catch (err) {
    console.error('Veri ekleme hatası:', err);
    res.status(500).json({ error: 'Veri kaydedilemedi', details: err.message });
  }
});

// Sunucu başlat
app.listen(3000, () => console.log('Server running on port 3000'));
