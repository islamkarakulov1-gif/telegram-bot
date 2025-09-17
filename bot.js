require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new TelegramBot(token, { polling: true });

// Храним состояние пользователей
const userState = {};

bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  // Игнорируем команды (/что-то)
  if (msg.text.startsWith("/")) return;

  const state = userState[chatId];

  // Если пользователь ещё не начал диалог → спрашиваем имя
  if (!state) {
    userState[chatId] = { step: "name" };
    bot.sendMessage(chatId, "Здравствуйте! Как вас зовут?");
    return;
  }

  // Шаг 1: имя
  if (state.step === "name") {
    state.name = msg.text;
    state.step = "phone";
    bot.sendMessage(chatId, "Спасибо! Теперь напишите номер телефона 📞");
    return;
  }

  // Шаг 2: телефон
  if (state.step === "phone") {
    state.phone = msg.text;

    // Сообщение пользователю
    bot.sendMessage(
      chatId,
      `Спасибо, ${state.name}! 🙂 Мы скоро с вами свяжемся 📞`
    );

    // Сообщение админу
    bot.sendMessage(
      ADMIN_ID,
      `Новая заявка:\nИмя: ${state.name}\nТелефон: ${state.phone}`
    );

    // Чистим состояние
    delete userState[chatId];
    return;
  }
});

