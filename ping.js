const axios = require('axios');

setInterval(async () => {
  try {
    await axios.get("https://telegram-bot-6xpj.onrender.com");
    console.log("✅ Ping success");
  } catch {
    console.log("⚠️ Ping failed");
  }
}, 5 * 60 * 1000); // каждые 5 минут
