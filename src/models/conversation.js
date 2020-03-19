const { Sequelize, sequelize } = require("../utils/database");
const { User } = require("./user");

class Conversation extends Sequelize.Model {
  async getNameFor(user) {
    if (this.name) {
      return this.name;
    }

    const participants = await this.getParticipants();
    return participants.filter(p => p.id !== user.id).join(", ");
  }
}
Conversation.init({
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  name: Sequelize.STRING
}, {
  sequelize,
  modelName: "conversation",
});

User.belongsToMany(Conversation, {
  through: "conversations_participants",
  foreignKey: {
    name: "participant_id",
    allowNull: false,
  },
  as: "Conversation",
  constraints: false
});

Conversation.belongsToMany(User, {
  through: "conversations_participants",
  foreignKey: {
    name: "conversation_id",
    allowNull: false,
  },
  as: "Participant",
  constraints: false
});

const getGlobalConversation = async () => {
  const name = "Everyone";
  return Conversation.findOrCreate({ where: { name }});
};

module.exports = {
  Conversation,
  getGlobalConversation,
};
