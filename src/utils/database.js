const Sequelize = require("sequelize");
const debug = require("debug")("app:database");

const sequelize = new Sequelize(
  process.env["SEQUELIZE_DATABASE"],
  process.env["SEQUELIZE_USERNAME"],
  process.env["SEQUELIZE_PASSWORD"],
  {
    host: process.env["SEQUELIZE_HOST"] || "localhost",
    dialect: "mysql",

    pool: {
      max: 20,
      min: 0
    }
  }
);

sequelize.authenticate().then(function () {
  debug("Sequelize connection established.");
  if (process.env["SEQUELIZE_SYNC"]) {
    sequelize.sync({ force: true });
  }
}).catch(function (err) {
  debug("Sequelize connection failed.");
  debug(err);
});

module.exports = {
  sequelize,
  Sequelize,
};
