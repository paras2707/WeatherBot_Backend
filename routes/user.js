const express = require("express");
const User = require("../models/user");

const router = express.Router();

router.get("/", async (req, res) => {
  const users = await User.find({});
  res.send(users);
});

router.delete("/:id", async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  res.send(user);
});

router.put("/:id", async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, {
    isBlocked: req.body.isBlocked,
  });
  res.send(user);
});

module.exports = router;
