require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

// токен и ID админа берём из переменных окружения
const token = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new TelegramBot(token, { polling: true });

// Храним состояние диалога
const userState = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userState[chatId] = { step: "name" };
  bot.sendMessage(chatId, "Здравствуйте! Как вас зовут?");
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  // Игнорируем команды
  if (!msg.text || msg.text.startsWith("/")) return;

  const state = userState[chatId];
  if (!state) return;

  if (state.step === "name") {
    state.name = msg.text;
    state.step = "phone";
    bot.sendMessage(chatId, "Спасибо! Теперь напишите номер телефона 📞");
  } else if (state.step === "phone") {
    state.phone = msg.text;

    bot.sendMessage(
      chatId,
      `Записал: ${state.name}, телефон: ${state.phone}. Мы свяжемся с вами 👍`
    );

    bot.sendMessage(
      ADMIN_ID,
      `📩 Новая запись:\nИмя: ${state.name}\nТелефон: ${state.phone}`
    );

    delete userState[chatId];
  }
});
