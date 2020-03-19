const { hash, compare } = require("bcrypt");
const { Sequelize, sequelize } = require("../utils/database");

class User extends Sequelize.Model {
  async checkPassword(password) {
    return comparePassword(password, this.password);
  }
}
User.init({
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
  }
}, {
  sequelize,
  modelName: "user"
});

/**
 * @param {string} password
 * @returns {boolean}
 */
const isPasswordValid = password => {
  return password && (typeof password === "string") && password.length >= 6;
};

/**
 * @param {string} username
 * @returns {boolean}
 */
const isUsernameValid = username => {
  return username && (typeof username === "string") && username.length >= 4;
};

/**
 * Creates a user instance but doesn't insert it.
 * @param {string} username
 * @param {string} plainPassword
 * @returns {User}
 */
const createUser = async (username, plainPassword) => {
  if (!isPasswordValid(plainPassword)) {
    throw new Error("Password needs to be 6 characters or longer.");
  }

  if (!isUsernameValid(username)) {
    throw new Error("Username is invalid.");
  }

  const password = await hashPassword(plainPassword);

  return User.build({
    username,
    password,
  });
};

/**
 * @param {string} id
 * @returns {Promise<User>|Promise<null>}
 */
const findUserById = async (id) => {
  return User.findByPk(id);
};

/**
 * @param {string} username
 * @returns {Promise<User>|Promise<null>}
 */
const findUserByUsername = async (username) => {
  return User.findOne({ where: { username }});
};

/**
 * finds a user using username and password, returns null if either is invalid.
 * @param {string} username
 * @param {string} plainPassword
 * @returns {User|null}
 */
const findUserByUsernameAndPassword = async (username, plainPassword) => {
  const user = await findUserByUsername(username);
  if (!user) {
    return null;
  }

  const isAuthenticated = await comparePassword(plainPassword, user.password);
  if (!isAuthenticated) {
    return null;
  }

  return user;
};

/**
 * @param {string} plainPassword
 * @returns {Promise<string>}
 */
const hashPassword = async (plainPassword) => {
  return hash(plainPassword, 7);
};

/**
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  return compare(plainPassword, hashedPassword);
};

module.exports = {
  User,
  createUser,
  findUserById,
  findUserByUsername,
  findUserByUsernameAndPassword,
  isUsernameValid,
  isPasswordValid,
  hashPassword,
  comparePassword,
};
