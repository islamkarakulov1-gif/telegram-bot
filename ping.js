const axios = require('axios');

setInterval(async () => {
  try {
    await axios.get("https://ТВОЙ-RENDER-URL.onrender.com/health");
    console.log("✅ Ping success");
  } catch {
    console.log("⚠️ Ping failed");
  }
}, 5 * 60 * 1000); // каждые 5 минут
