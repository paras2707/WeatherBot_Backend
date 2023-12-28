const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({
  bot_token: {
    type: String,
    required: true,
  },
  openweathermap_api_key: {
    type: String,
    required: true,
  },
});

const setting = mongoose.model("Setting", settingSchema);

module.exports = setting;
