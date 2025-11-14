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
 // HTML dosyaları için

// Veri dosyamız
const dataPath = path.join(__dirname, "data.json");

// Eğer data.json yoksa oluştur
if (!fs.existsSync(dataPath)) {
  fs.writeFileSync(
    dataPath,
    JSON.stringify({
      users: [
        { username: "admin", password: "1234", role: "admin" },
        { username: "personel1", password: "1234", role: "personel" },
      ],
      tasks: [],
    })
  );
}

// JSON dosyasını oku
function readData() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

// JSON dosyasını yaz
function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

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

// 🔹 Kullanıcı ekleme (sadece admin)
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

// 🔹 Görev ekleme (personel için)
app.post("/api/tasks", (req, res) => {
  const { username, task } = req.body;
  const data = readData();

  data.tasks.push({ username, task, date: new Date().toISOString() });
  writeData(data);
  res.json({ message: "Görev kaydedildi!" });
});

// 🔹 Tüm görevleri listeleme (admin için)
app.get("/api/tasks", (req, res) => {
  const data = readData();
  res.json(data.tasks);
});

// 🔹 Logout yönlendirmesi
app.get("/logout", (req, res) => {
  res.sendFile(path.join(__dirname, "logout.html"));
});

// 🔹 404 fallback
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => console.log(`🌐 Sunucu ${PORT} portunda çalışıyor...`));
