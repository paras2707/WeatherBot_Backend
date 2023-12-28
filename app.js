require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const mongoose = require("mongoose");
const User = require("./models/user");
const cron = require("node-cron");
const cors = require("cors");
const userRouter = require("./routes/user");
const settingRouter = require("./routes/setting");
const setting = require("./models/setting");

const app = express();
app.use(express.json());
app.use(cors());

// ------------------- API Variables ------------------- //
let TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const PORT = process.env.PORT || 3000;

// -------------------Telegram Bot Functions ------------------- //
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const storage = {};

async function getSettings() {
  const settings = await setting.find({});
  if (settings.length > 0) {
    return settings[0];
  } else {
    return null;
  }
}

async function saveUser(userId, username = "", city) {
  const user = await User.findOne({ userId });
  if (user) {
    user.city = city;
    user.save();
    return user;
  } else {
    const newUser = await User.create({ userId, username, city });
    return newUser;
  }
}

function getUserData(chatId) {
  let userData = storage[chatId];
  if (!userData) {
    userData = {
      waitingForCity: false,
      waitingForWeather: false,
    };
    storage[chatId] = userData;
  }
  return userData;
}

function resetUserData(chatId) {
  const userData = getUserData(chatId);
  userData.waitingForCity = false;
  userData.waitingForWeather = false;
}

async function getWeatherData(city, userId, username) {
  try {
    const response = await axios.get(
      `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHERMAP_API_KEY}`
    );
    const weatherData = response.data;
    const weatherDescription = weatherData.weather[0].description;
    const temperature = Math.round(weatherData.main.temp - 273.15);
    const messageText = `Hi ${username}, the weather in ${city} is currently ${weatherDescription} with a temperature of ${temperature}°C.`;
    saveUser(userId, username, city);
    return messageText;
  } catch (error) {
    return "The city you entered does not exist. Please try again.";
  }
}

// ------------------- Bot Event Functions ------------------- //
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Hello! This bot can show you the daily weather updates of any city. To use it, please click the button below:",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Get Weather", callback_data: "get_weather" }],
        ],
      },
    }
  );
});

bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const userDataWeather = getUserData(chatId);
  userDataWeather.waitingForCity = true;
  userDataWeather.waitingForWeather = true;
  bot.sendMessage(
    chatId,
    "Please enter the name of the city or send /stop to cancel:"
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from.id;
  const username = msg.from.username;
  const userData = getUserData(chatId);
  if (userData && userData.waitingForCity) {
    const city = text;
    userData.city = city;
    let messageText = "";
    if (userData.waitingForWeather) {
      messageText = await getWeatherData(city, userId, username);
    }
    bot.sendMessage(chatId, messageText);
    resetUserData(chatId);
  }
});

// ------------------- routes ------------------- //
app.get("/", (req, res) => {
  res.send("Weather Bot");
});
app.use("/admin", userRouter);
app.use("/settings", settingRouter);

// ------------------- Cron Job ------------------- //
// Sends weather updates to all users at 10:00 AM everyday according to indian standard time
cron.schedule(
  "0 0 10 * * *",
  async () => {
    const users = await User.find({});
    users.forEach(async (user) => {
      if (!user.isBlocked) {
        const messageText = await getWeatherData(
          user.city,
          user.userId,
          user.username
        );
        bot.sendMessage(user.userId, messageText);
      }
    });
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

// ------------------- Checking Api Keys ------------------- //
setInterval(async () => {
  const settings = await getSettings();
  if (settings && settings.bot_token && settings.openweathermap_api_key) {
    TELEGRAM_BOT_TOKEN = settings.bot_token;
    OPENWEATHERMAP_API_KEY = settings.openweathermap_api_key;
  }
}, 15000);

// ------------------- Server ------------------- //
app.listen(PORT, () => {
  mongoose
    .connect(process.env.MONGODB_URL)
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((err) => console.log(err));
  console.log("Example app listening on port 3000!");
});
