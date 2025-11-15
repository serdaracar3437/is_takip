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
  try {
    const {
      username,
      isemri_numarasi,
      urun_kodu,
      tarih,
      yapilan_faaliyet,
      aciklama,
      kullanilan_malzeme,
      baslama_saati,
      bitis_saati,
      islem_adedi,
      hata_kodu1,
      hata_sayisi1,
      hata_kodu2,
      hata_sayisi2,
      hata_kodu3,
      hata_sayisi3
    } = req.body;

    // Zorunlu alan kontrolü
    if (!username) {
      return res.status(400).json({ error: "Kullanıcı adı boş olamaz" });
    }

    // Supabase insert
    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          username,
          isemri_numarasi,
          urun_kodu,
          tarih,
          yapilan_faaliyet,
          aciklama,
          kullanilan_malzeme,
          baslama_saati,
          bitis_saati,
          islem_adedi: islem_adedi ? Number(islem_adedi) : null,
          hata_kodu1,
          hata_sayisi1: hata_sayisi1 ? Number(hata_sayisi1) : null,
          hata_kodu2,
          hata_sayisi2: hata_sayisi2 ? Number(hata_sayisi2) : null,
          hata_kodu3,
          hata_sayisi3: hata_sayisi3 ? Number(hata_sayisi3) : null
        }
      ]);

    if (error) {
      console.log("Supabase INSERT ERROR:", error);
      return res.status(500).json({ error: "Kayıt sırasında hata oluştu" });
    }

    res.json({ message: "Görev başarıyla kaydedildi", data });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
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
