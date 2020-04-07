import "reflect-metadata";
import { config } from "dotenv";
config();
import debug from "debug";
import { createConnection } from "typeorm";
import Application from "./services/Application";
import SocketIOServer from "./services/SocketIOServer";

createConnection().then(() => {
  const app = Application.getInstance();
  SocketIOServer.start(app);
  app.start();
}).catch(error => debug("application:database")(error));