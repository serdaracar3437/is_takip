import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ======================================
// SUPABASE BAĞLANTISI
// ======================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ======================================
// LOGIN
// ======================================
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .eq("password", password)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!user) return res.status(401).json({ error: "Geçersiz kullanıcı" });

  res.json({ role: user.role, username: user.username });
});

// ======================================
// YENİ KULLANICI EKLE
// ======================================
app.post("/api/addUser", async (req, res) => {
  const { username, password, role } = req.body;

  const { error } = await supabase
    .from("users")
    .insert([{ username, password, role }]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Kullanıcı başarıyla eklendi" });
});

// ======================================
// TÜM PERSONELLERİ LİSTELE
// ======================================
app.get("/api/personel", async (req, res) => {
  const { data, error } = await supabase.from("users").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ======================================
// KULLANICI SİL
// ======================================
app.delete("/api/deleteUser/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("users").delete().eq("id", id);

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Kullanıcı silindi" });
});

// ======================================
// KULLANICI GÜNCELLE
// ======================================
app.put("/api/updateUser/:id", async (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;

  const updateData = { username, role };

  if (password && password.trim() !== "") {
    updateData.password = password;
  }

  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", id);

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Kullanıcı başarıyla güncellendi" });
});

// ======================================
// TASK KAYDETME
// ======================================
app.post("/api/tasks", async (req, res) => {
  try {
    const taskData = req.body;

    if (!taskData.username)
      return res.status(400).json({ error: "Kullanıcı adı boş olamaz" });

    const { data, error } = await supabase
      .from("tasks")
      .insert([taskData].map(t => ({ ...t })));

    if (error) {
      console.log("Supabase Insert ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: "Görev kaydedildi", data });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// ======================================
// TÜM TASKLARI LİSTELE (FİLTRELİ)
// ======================================
app.get("/api/tasks", async (req, res) => {
  const { username, isemri_numarasi, tarih } = req.query;

  let query = supabase.from("tasks").select("*");

  if (username) query = query.ilike("username", `%${username}%`);
  if (isemri_numarasi) query = query.ilike("isemri_numarasi", `%${isemri_numarasi}%`);
  if (tarih) query = query.eq("tarih", tarih);

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// ======================================
// TEK BİR TASK BİLGİSİ GETİRME
// ======================================
app.get("/api/task/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Task bulunamadı" });

  res.json(data);
});

// ======================================
// TASK GÜNCELLEME
// ======================================
app.put("/api/task/:id", async (req, res) => {
  const { id } = req.params;
  const updatedFields = req.body;

  const { error } = await supabase
    .from("tasks")
    .update(updatedFields)
    .eq("id", id);

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Görev güncellendi" });
});

// ======================================
// TASK SİL (Sadece Admin Kullanır)
// ======================================
app.delete("/api/task/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Görev silindi" });
});

// ======================================
// HTML SERVE
// ======================================
app.use(express.static("public"));

app.listen(PORT, () =>
  console.log(`SERVER READY → PORT ${PORT}`)
);
