// ✅ sauna-bot с webhook (работает на Render)
import express from "express";
import { Telegraf, Markup } from "telegraf";
import LocalSession from "telegraf-session-local";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

// Проверяем переменные окружения
const { BOT_TOKEN, OWNER_CHAT_ID, SELF_URL, PORT } = process.env;
if (!BOT_TOKEN || !OWNER_CHAT_ID || !SELF_URL) {
  console.error("❌ Укажи BOT_TOKEN, OWNER_CHAT_ID и SELF_URL в .env");
  process.exit(1);
}

// Создаём бота
const bot = new Telegraf(BOT_TOKEN);
const app = express();
const localSession = new LocalSession({ database: "sessions.json" });
bot.use(localSession.middleware());

// 🧖 Картинки для сауны поменьше
const IMG_SMALL_URLS = [
  "https://i.ibb.co.com/ty5QdSg/IMG-20251010-WA0006.jpg",
  "https://i.ibb.co.com/sp2ZfMXx/IMG-20251010-WA0004.jpg",
  "https://i.ibb.co.com/bgmtyCZ7/IMG-20251010-WA0005.jpg"
];

// 🧖 Картинки для сауны побольше
const IMG_BIG_URLS = [
  "https://i.ibb.co.com/R4zfm85d/IMG-20251003-WA0008.jpg",
  "https://i.ibb.co.com/VpPhh83C/IMG-20251003-WA0004.jpg",
  "https://i.ibb.co.com/23s0WjgT/IMG-20251003-WA0005.jpg"
];

// 🏁 Старт
bot.start(async (ctx) => {
  ctx.session = {};
  await ctx.reply("Введите ваше имя:");
  ctx.session.step = "waiting_for_name";
});

// 📝 Имя
bot.on("text", async (ctx) => {
  const step = ctx.session?.step;

  if (step === "waiting_for_name") {
    ctx.session.name = ctx.message.text;
    ctx.session.step = "main_menu";
    return ctx.reply(
      `Привет, ${ctx.session.name}! Выбери вариант сауны:`,
      Markup.keyboard([
        ["Сауна поменьше 🧖"],
        ["Сауна побольше 💦"]
      ]).resize()
    );
  }

  if (ctx.message.text === "Сауна поменьше 🧖") {
    for (const url of IMG_SMALL_URLS) {
      await ctx.replyWithPhoto(url);
    }
  } else if (ctx.message.text === "Сауна побольше 💦") {
    for (const url of IMG_BIG_URLS) {
      await ctx.replyWithPhoto(url);
    }
  } else {
    await ctx.reply("Выбери кнопку ниже ⬇️");
  }
});

// 🌐 Webhook для Render
app.use(express.json());
app.use(bot.webhookCallback(`/bot${BOT_TOKEN}`));

// 📡 Устанавливаем webhook
bot.telegram.setWebhook(`${SELF_URL}/bot${BOT_TOKEN}`);

// 🚀 Express сервер
app.get("/", (req, res) => res.send("✅ Bot is running via webhook!"));
app.listen(PORT || 10000, () => {
  console.log(`✅ Сервер запущен на порту ${PORT || 10000}`);
});
