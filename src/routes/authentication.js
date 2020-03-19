const debug = require("debug")("app:authentication-controller");
const express = require("express");
const router = express.Router();

const { createUser, findUserByUsername } = require("../models/user");
const { sendErrorResponse } = require("../utils/responses");
const { generateToken } = require("../utils/authentication");
const { getGlobalConversation } = require("../models/conversation");

router.post("/register", async (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;
  let user = await findUserByUsername(username);

  if (!user) {
    try {
      user = await createUser(username, password);
      await user.save();
      const conversation = await getGlobalConversation();
      conversation.addParticipant(user);
      await conversation.save();
    } catch (err) {
      debug(err);
      sendErrorResponse(res, [err.toString()]);
      return;
    }
  }

  const isPasswordValid = await user.checkPassword(password);
  if (!isPasswordValid) {
    sendErrorResponse(res, ["Username exists and password is invalid."]);
  }

  res.send({
    success: 1,
    data: {
      token: generateToken(user)
    }
  });
  next();
});

module.exports = router;
