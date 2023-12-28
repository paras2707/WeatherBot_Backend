const express = require("express");
const setting = require("../models/setting");

const router = express.Router();

router.post("/", async (req, res) => {
  const keys = req.body;
  const bot_token = keys.botToken;
  const openweathermap_api_key = keys.apiKey;
  const settings = await setting.find({});
  if (settings.length > 0) {
    settings[0].bot_token = bot_token;
    settings[0].openweathermap_api_key = openweathermap_api_key;
    settings[0].save();
    res.send(settings[0]);
  } else {
    const newSetting = await setting.create({
      bot_token,
      openweathermap_api_key,
    });
    res.send(newSetting);
  }
});

router.get("/", async (req, res) => {
  const settings = await setting.find({});
  if (settings.length > 0) {
    res.send(settings[0]);
  } else {
    res.send(null);
  }
});

module.exports = router;
