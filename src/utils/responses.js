// eslint-disable-next-line no-unused-vars
const { response } = require("express");

module.exports = {
  /**
   * sends error response.
   * @param {response} res
   * @param {string[]} errors
   * @returns {void}
   */
  sendErrorResponse(res, errors) {
    res.status(400).send({
      success: 0,
      errors
    });
  },
};
