const TelegramBot = require("node-telegram-bot-api");

//  Токен бота от BotFather
const token = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

// ID админа (узнать через @userinfobot)
const ADMIN_ID = 1428767630;

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

  // Игнорируем команду /start, чтобы не мешала
  if (msg.text.startsWith("/")) return;

  const state = userState[chatId];

  if (!state) return;

  if (state.step === "name") {
    state.name = msg.text;
    state.step = "phone";
    bot.sendMessage(chatId, "Спасибо! Теперь напишите номер телефона 📞");
  } else if (state.step === "phone") {
    state.phone = msg.text;

    // Сообщаем клиенту
    bot.sendMessage(
      chatId,
      `Записал: ${state.name}, телефон: ${state.phone}. Мы свяжемся с вами 👍`
    );

    // Отправляем админу
    bot.sendMessage(
      ADMIN_ID,
      ` Новая запись:\nИмя: ${state.name}\nТелефон: ${state.phone}`
    );

    // Сбрасываем состояние
    delete userState[chatId];
  }
});
