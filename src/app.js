var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var http = require("http");

var indexRouter = require("./routes/index");
var authenticationRouter = require("./routes/authentication");

var app = express();
var server = http.createServer(app);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/auth", authenticationRouter);

module.exports = {
  app,
  server
};
