import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// =======================
// Supabase Client
// =======================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// =======================
// LOGIN
// =======================

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

// =======================
// YENİ PERSONEL EKLEME
// =======================

app.post("/api/addUser", async (req, res) => {
  const { username, password, role } = req.body;

  const { error } = await supabase
    .from("users")
    .insert([{ username, password, role }]);

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Kullanıcı eklendi" });
});

// =======================
// PERSONEL LİSTELEME
// =======================

app.get("/api/personel", async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "personel");

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// =======================
// GÖREV KAYDETME
// =======================

app.post("/api/tasks", async (req, res) => {
  const task = req.body;

  const { error } = await supabase.from("tasks").insert([task]);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

// =======================
// GÖREV LİSTELEME
// =======================

app.get("/api/tasks", async (req, res) => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("id", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// =======================
// HTML
// =======================

app.use(express.static("public"));

app.listen(PORT, () =>
  console.log(`SERVER READY → PORT ${PORT}`)
);
