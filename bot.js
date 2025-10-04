import "./keepalive.js";
import { Telegraf, Markup } from "telegraf";
import fetch from "node-fetch";
import "./keep_alive.js";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;
const KEEPALIVE_URL = process.env.KEEPALIVE_URL;

// 🔁 Чтобы Render не засыпал
setInterval(() => {
  fetch(KEEPALIVE_URL).catch(() => {});
}, 600000); // каждые 10 минут

// 🧾 Состояние пользователей
const userState = {};

bot.start((ctx) => {
  ctx.reply(
    "Салем! 👋 / Привет! Выберите сауну:",
    Markup.keyboard([["Сауна поменьше"], ["Сауна побольше"]]).resize()
  );
});

bot.on("text", async (ctx) => {
  const text = ctx.message.text;
  const id = ctx.chat.id;

  if (text === "Сауна поменьше") {
    await ctx.replyWithPhoto("тут_вставь_URL_или_путь_к_фото_поменьше.jpg", {
      caption:
        "Сауна до 5 человек.\n7000₸ за час, минимум 2 часа.\nДоплата 1000₸ за каждого сверх 5.\n❌ Кухни нет.\n📍 Адрес: [Открыть на карте](ССЫЛКА_НА_КАРТУ_МЕНЬШЕЙ)",
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("Забронировать", "book_small")],
      ]),
    });
  } else if (text === "Сауна побольше") {
    await ctx.replyWithPhoto("тут_вставь_URL_или_путь_к_фото_побольше.jpg", {
      caption:
        "Сауна до 8 человек.\n10000₸ за час, минимум 2 часа.\nДоплата 2000₸ за каждого сверх 8.\n✅ Есть кухня.\n📍 Адрес: [Открыть на карте](ССЫЛКА_НА_КАРТУ_БОЛЬШОЙ)",
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("Забронировать", "book_big")],
      ]),
    });
  } else if (userState[id]?.step === "name") {
    userState[id].name = text;
    userState[id].step = "phone";
    ctx.reply("📞 Введите ваш номер телефона:");
  } else if (userState[id]?.step === "phone") {
    userState[id].phone = text;
    userState[id].step = "hours";
    ctx.reply("⏱ На сколько часов хотите забронировать?");
  } else if (userState[id]?.step === "hours") {
    userState[id].hours = text;

    const saunaType = userState[id].saunaType;
    const message = `🧖‍♂️ Новая бронь!\n\nСауна: ${saunaType}\nИмя: ${userState[id].name}\nТелефон: ${userState[id].phone}\nЧасы: ${userState[id].hours}`;

    await bot.telegram.sendMessage(ADMIN_ID, message);
    ctx.reply("✅ Спасибо! Ваша бронь отправлена администратору.");
    delete userState[id];
  } else {
    ctx.reply("Выберите сауну ниже 👇", Markup.keyboard([["Сауна поменьше"], ["Сауна побольше"]]).resize());
  }
});

bot.action("book_small", (ctx) => {
  const id = ctx.chat.id;
  userState[id] = { saunaType: "Сауна поменьше", step: "name" };
  ctx.reply("Введите ваше имя:");
});

bot.action("book_big", (ctx) => {
  const id = ctx.chat.id;
  userState[id] = { saunaType: "Сауна побольше", step: "name" };
  ctx.reply("Введите ваше имя:");
});

bot.launch();
console.log("🚀 Бот запущен!");
