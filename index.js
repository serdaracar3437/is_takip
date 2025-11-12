import express from "express";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const usersFile = path.join(process.cwd(), "users.json");

// 📦 JSON dosyasını oku
function readUsers() {
  if (!fs.existsSync(usersFile)) return [];
  return JSON.parse(fs.readFileSync(usersFile, "utf-8"));
}

// 💾 JSON dosyasına yaz
function writeUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf-8");
}

// 🔐 Giriş işlemi
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Geçersiz kullanıcı veya şifre" });

  res.json({ role: user.role, username: user.username });
});

// 👤 Yeni kullanıcı ekleme
app.post("/api/addUser", (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: "Eksik bilgi" });

  const users = readUsers();
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: "Bu kullanıcı zaten var." });
  }

  const newUser = {
    id: users.length ? users[users.length - 1].id + 1 : 1,
    username,
    password,
    role
  };
  users.push(newUser);
  writeUsers(users);

  res.json({ success: true, message: "Kullanıcı eklendi." });
});

// 📋 Tüm kullanıcıları listele
app.get("/api/users", (req, res) => {
  const users = readUsers();
  res.json(users);
});

// 📤 Logout
app.post("/api/logout", (req, res) => {
  res.json({ success: true });
});

// 🌐 Ana sayfa
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

app.listen(PORT, () => console.log(`🌐 Sunucu ${PORT} portunda çalışıyor...`));
