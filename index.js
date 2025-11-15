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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ==============================
// JSON DATA KONTROL & OLUŞTURMA
// ==============================
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const dataPath = path.join(DATA_DIR, "data.json");

if (!fs.existsSync(dataPath)) {
  fs.writeFileSync(
    dataPath,
    JSON.stringify(
      {
        users: [
          { username: "admin", password: "1234", role: "admin" },
          { username: "personel1", password: "1234", role: "personel" },
        ],
        tasks: []
      },
      null,
      2
    ),
    "utf8"
  );
}

function readData() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
}

// ==============================
//            API ROUTELARI
// ==============================

// LOGIN
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

// Kullanıcı ekleme
app.post("/api/addUser", (req, res) => {
  const { username, password, role } = req.body;
  const data = readData();

  if (data.users.find((u) => u.username === username)) {
    return res.status(400).json({ error: "Kullanıcı zaten var!" });
  }

  data.users.push({ username, password, role });
  writeData(data);

  res.json({ message: "Kullanıcı eklendi!" });
});

// Personel listesi
app.get("/api/personel", (req, res) => {
  const data = readData();
  res.json(data.users.filter((u) => u.role === "personel"));
});

// Görev ekleme
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

// Görevleri listeleme
app.get("/api/tasks", (req, res) => {
  const data = readData();
  res.json(data.tasks);
});

// Logout
app.get("/logout", (req, res) => {
  res.sendFile(path.join(__dirname, "public/logout.html"));
});

// Ana sayfa (sadece GET için)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ==============================
// EXPRESS 5 FALLBACK — SADECE GET!
// POST/PUT/DELETE ETKİLENMEZ
// ==============================

app.listen(PORT, () =>
  console.log(`🌐 Sunucu ${PORT} portunda çalışıyor...`)
);
