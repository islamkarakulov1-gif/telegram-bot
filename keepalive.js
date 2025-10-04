import express from "express";
import fetch from "node-fetch";

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Бот работает ✅");
});

app.listen(port, () => {
  console.log(`🌐 Сервер запущен на порту ${port}`);
});

// Пинг каждые 5 минут
setInterval(() => {
  fetch(`https://${process.env.RENDER_EXTERNAL_URL || "localhost:" + port}`)
    .then(() => console.log("⏱️ Ping sent to Render"))
    .catch((err) => console.error("Ping error:", err));
}, 5 * 60 * 1000);
