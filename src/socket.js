const debug = require("debug")("app:socket");
const socketio = require("socket.io");
const { server } = require("./app");
const { getUserFromToken } = require("./utils/authentication");

const io = socketio(server);
const clients = new Map();

const addSocket = (socket, userId) => clients.set(userId, socket);
const getSocket = (userId) => clients.has(userId) && clients.get(userId);
const deleteSocket = (userId) => clients.has(userId) && clients.delete(userId);
const isConnected = (userId) => clients.has(userId);

module.exports = {
  io,
  getSocket,
  isConnected,
  setup() {
    io.on("connection", function (socket) {
      socket.emit("require auth", async (token) => {
        try {
          const user = await getUserFromToken(token);
          socket.user = user;
          addSocket(user.id, socket);
        } catch (err) {
          debug(err);
          socket.emit("auth failed", err.toString());
          socket.disconnect(true);
        }
      });

      socket.on("disconnect", function () {
        deleteSocket(socket.user.id);
      });
    });
  }
};
