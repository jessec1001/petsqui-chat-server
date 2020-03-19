const { sign, verify } = require("jsonwebtoken");
const { promisify } = require("util");
const debug = require("debug")("app:authentication");

const { User, findUserById } = require("../models/user");
const { sendErrorResponse } = require("./responses");

const SECRET = process.env["JWT_SECRET"];

const getUserFromToken = async token => {
  try {
    const payload = await promisify(verify)(token, SECRET);
    const user = await findUserById(payload.id);
    if (!user) {
      throw new Error("User id was not found.");
    }
    return user;
  } catch (err) {
    debug(err);
    throw new Error("Invalid token.");
  }
};

module.exports = {
  getUserFromToken,

  /**
   * @param {User} user
   * @returns {string}
   */
  generateToken(user) {
    if (!(user instanceof User)) {
      throw new Error("Invalid user parameter.");
    }

    const payload = {
      id: user.id,
      username: user.username,
    };

    return sign(payload, SECRET, { expiresIn: "6h" });
  },

  /**
   * @param {request} req
   * @param {response} res
   * @param {Function} next
   * @returns {void}
   */
  requireAuthentication(req, res, next) {
    if (!req.headers.authorization || req.headers.authorization.split(" ")[0] !== "Bearer") {
      sendErrorResponse(res, "Authentication required.");
      return;
    }

    const token = req.headers.authorization.split(" ")[1];
    getUserFromToken(token).then(user => {
      req.authenticated = user;
      next();
    }).catch(err => {
      sendErrorResponse(res, [err.toString()]);
      return;
    });
  }
};
