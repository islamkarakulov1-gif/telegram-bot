require('dotenv').config();
console.log("🚀 Bot запускается...");

const express = require("express");
const fetch = require("node-fetch");
const { Telegraf, Markup } = require("telegraf");
const LocalSession = require("telegraf-session-local");

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID;
const SELF_URL = process.env.SELF_URL;
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !OWNER_CHAT_ID || !SELF_URL) {
  console.error("❌ Укажи BOT_TOKEN, OWNER_CHAT_ID и SELF_URL в .env");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
bot.use(new LocalSession({ database: "sessions.json" }).middleware());

// Главное меню
const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback("Сауна поменьше", "sauna_small")],
  [Markup.button.callback("Сауна побольше", "sauna_big")],
]);

const saunaInfo = {
  small: {
    title: "Сауна поменьше",
    text: `Информация:
- До 5 человек
- Если больше 5 — доплата 1000 за каждого
- 7000 за час
- Минимум 2 часа
- Кухни нет`,
    map: "https://go.2gis.com/30tRT",
    imgs: [
      "https://i.ibb.co/ty5QdSg/IMG-20251010-WA0006.jpg",
      "https://i.ibb.co/sp2ZfMXx/IMG-20251010-WA0004.jpg",
      "https://i.ibb.co/bgmtyCZ7/IMG-20251010-WA0005.jpg",
    ],
    video: "https://files.catbox.moe/y9slc1.mp4",
  },
  big: {
    title: "Сауна побольше",
    text: `Информация:
- До 8 человек
- Доплата за каждого сверх — 2000
- Стоимость: 12000
- Минимум 2 часа
- Кухни нет`,
    map: "https://go.2gis.com/OQSBA",
    imgs: [
      "https://i.ibb.co/R4zfm85d/IMG-20251003-WA0008.jpg",
      "https://i.ibb.co/VpPhh83C/IMG-20251003-WA0004.jpg",
      "https://i.ibb.co/23s0WjgT/IMG-20251003-WA0005.jpg",
    ],
    video: "https://files.catbox.moe/ol975e.mp4",
  },
};

// Приветствие
bot.on("message", async (ctx) => {
  if (ctx.session?.step) return;
  await ctx.reply("Сәлем! Бізге хабарласқаныңыз үшін рахмет.\nПривет! Спасибо за обращение.", mainMenu);
});

// Вывод фото/видео
bot.action(["sauna_small", "sauna_big"], async (ctx) => {
  await ctx.answerCbQuery();
  const type = ctx.callbackQuery.data === "sauna_small" ? "small" : "big";
  const info = saunaInfo[type];

  for (const img of info.imgs) {
    await ctx.replyWithPhoto({ url: img });
  }

  if (info.video) {
    await ctx.replyWithVideo({ url: info.video });
  }

  await ctx.replyWithMarkdown(
    `*${info.title}*\n\n${info.text}\n\n📍 [Посмотреть на карте](${info.map})`,
    Markup.inlineKeyboard([
      [Markup.button.callback("📅 Забронировать", `book_${type}`)],
      [Markup.button.callback("🔙 Назад", "back")],
    ])
  );
});

bot.action("back", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply("Главное меню:", mainMenu);
});

// Бронирование
bot.action(/book_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const type = ctx.match[1];
  ctx.session.booking = { type };
  ctx.session.step = "name";
  await ctx.reply("Введите ваше имя:");
});

bot.on("text", async (ctx) => {
  const step = ctx.session.step;
  const text = ctx.message.text;

  if (!step) return;

  if (step === "name") {
    ctx.session.booking.name = text;
    ctx.session.step = "phone";
    return ctx.reply("Введите номер телефона:");
  }

  if (step === "phone") {
    ctx.session.booking.phone = text;
    ctx.session.step = "hours";
    return ctx.reply("На сколько часов хотите забронировать?");
  }

  if (step === "hours") {
    ctx.session.booking.hours = text;
    const b = ctx.session.booking;
    const info = saunaInfo[b.type];
    const summary = `🧖 Новая бронь:\n\n${info.title}\n👤 Имя: ${b.name}\n📞 Телефон: ${b.phone}\n⏰ Часов: ${b.hours}\n📍 ${info.map}`;

    await ctx.telegram.sendMessage(OWNER_CHAT_ID, summary);
    await ctx.reply("✅ Спасибо! Ваша заявка отправлена.");
    ctx.session = {};
  }
});

// Express сервер (Render требует порт)
const app = express();
app.get("/", (req, res) => res.send("✅ Бот работает на Render!"));
app.listen(PORT, async () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);

  const webhookUrl = `${SELF_URL}/bot${BOT_TOKEN}`;
  await bot.telegram.setWebhook(webhookUrl);
  app.use(bot.webhookCallback(`/bot${BOT_TOKEN}`));
  console.log("✅ Webhook установлен:", webhookUrl);
});
