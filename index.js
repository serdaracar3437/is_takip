import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

//
// =====================================================
//   JSON DOSYALARININ KESİNLİKLE OLUŞMASINI SAĞLAYAN KOD
// =====================================================
//

// "data" klasörü oluştur (yoksa)
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// "data.json" yolu
const dataPath = path.join(DATA_DIR, "data.json");

// Eğer data.json yoksa varsayılan içerikle oluştur
if (!fs.existsSync(dataPath)) {
  fs.writeFileSync(
    dataPath,
    JSON.stringify(
      {
        users: [
          { username: "admin", password: "1234", role: "admin" },
          { username: "personel1", password: "1234", role: "personel" },
        ],
        tasks: [],
      },
      null,
      2
    ),
    "utf8"
  );
}

//
// ================================
//   JSON Okuma & Yazma Fonksiyonları
// ================================
//

function readData() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
}

//
// ==============================
//            API’LER
// ==============================
//

// 🔹 LOGIN API
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const data = readData();

  const user = data.users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Geçersiz kullanıcı adı veya şifre" });
  }

  res.json({ role: user.role, username: user.username });
});

// 🔹 Kullanıcı ekleme (admin)
app.post("/api/addUser", (req, res) => {
  const { username, password, role } = req.body;
  const data = readData();

  const exists = data.users.find((u) => u.username === username);
  if (exists) return res.status(400).json({ error: "Kullanıcı zaten var!" });

  data.users.push({ username, password, role });
  writeData(data);

  res.json({ message: "Kullanıcı eklendi!" });
});

// 🔹 Personel listeleme (admin için)
app.get("/api/personel", (req, res) => {
  const data = readData();
  const personeller = data.users.filter((u) => u.role === "personel");
  res.json(personeller);
});

// 🔹 Görev ekleme (personel)
app.post("/api/tasks", (req, res) => {
  const { username, task } = req.body;
  const data = readData();

  data.tasks.push({
    id: Date.now(),
    username,
    task,
    date: new Date().toISOString(),
  });

  writeData(data);

  res.json({ message: "Görev kaydedildi!" });
});

// 🔹 Görevleri listeleme
app.get("/api/tasks", (req, res) => {
  const data = readData();
  res.json(data.tasks);
});

// 🔹 Logout
app.get("/logout", (req, res) => {
  res.sendFile(path.join(__dirname, "public/logout.html"));
});

// 🔹 Ana sayfa// Ana sayfa
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Express 5 fallback — TÜM HTML istekleri için
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});


app.listen(PORT, () =>
  console.log(`🌐 Sunucu ${PORT} portunda çalışıyor...`)
);
