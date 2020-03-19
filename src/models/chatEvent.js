const { Sequelize, sequelize } = require("../utils/database");
const { User } = require("./user");
const { Conversation } = require("./conversation");


const ChatEventTypes = {
  JOIN: "JOIN",
  MESSAGE: "MESSAGE",
};

class ChatEvent extends Sequelize.Model {
  getText() {
    if (this.type === ChatEventTypes.JOIN) {
      return `${this.owner.username} joined the chat.`;
    }

    return this.text;
  }
}
ChatEvent.init({
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: Sequelize.ENUM(Object.values(ChatEventTypes)),
    allowNull: false,
  },
  message: Sequelize.CITEXT,
}, {
  sequelize,
  modelName: "chat_event",
});

ChatEvent.hasOne(User, { as: "owner" });
ChatEvent.hasOne(Conversation);

/**
 * @param {User} user
 * @param {Conversation} conversation
 * @returns {ChatEvent}
 */
async function createUserJoined(user, conversation) {
  const exists = await conversation.hasParticipant(user);
  if (!exists) {
    throw new Error("User doens't have access to conversation.");
  }

  return ChatEvent.build({
    owner: user,
    conversation,
    type: ChatEventTypes.JOIN
  });
}

/**
 * @param {User} user
 * @param {Conversation} conversation
 * @param {string} message
 * @returns {ChatEvent}
 */
async function createMessageEvent(user, conversation, message) {
  const exists = await conversation.hasParticipant(user);
  if (!exists) {
    throw new Error("User doens't have access to conversation.");
  }

  return ChatEvent.build({
    owner: user,
    conversation,
    type: ChatEventTypes.MESSAGE,
    message,
  });
}

module.exports = {
  ChatEvent,
  ChatEventTypes,
  createUserJoined,
  createMessageEvent,
};
