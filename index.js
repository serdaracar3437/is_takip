import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ---------------------------
// 🔗 Supabase Bağlantısı
// ---------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ---------------------------
// 🔐 Login
// ---------------------------
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .eq("password", password)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!user) return res.status(401).json({ error: "Geçersiz giriş" });

  res.json({ username: user.username, role: user.role });
});

// ---------------------------
// ➕ Kullanıcı Ekle
// ---------------------------
app.post("/api/addUser", async (req, res) => {
  const { username, password, role } = req.body;

  const { error } = await supabase
    .from("users")
    .insert([{ username, password, role }]);

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Kullanıcı başarıyla eklendi" });
});

// ---------------------------
// 👥 Personel Listeleme
// ---------------------------
app.get("/api/personel", async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("username, role")
    .eq("role", "personel");

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ---------------------------
// 📝 Görev Kaydet
// ---------------------------
app.post("/api/tasks", async (req, res) => {
  const task = req.body;

  if (!task.username)
    return res.status(400).json({ error: "Kullanıcı adı zorunludur" });

  const { data, error } = await supabase.from("tasks").insert([task]);

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Görev kaydedildi", data });
});

// ---------------------------
// 📄 Görev Listele (Filtreli)
// ---------------------------
app.get("/api/tasks", async (req, res) => {
  const { username, isemri_numarasi, tarih } = req.query;

  let query = supabase.from("tasks").select("*");

  if (username) query = query.ilike("username", `%${username}%`);
  if (isemri_numarasi) query = query.ilike("isemri_numarasi", `%${isemri_numarasi}%`);
  if (tarih) query = query.eq("tarih", tarih);

  const { data, error } = await query.order("tarih", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });

  res.json(data);
});

// ---------------------------

app.use(express.static("public"));

app.listen(PORT, () => console.log("SERVER READY →", PORT));
