import "reflect-metadata";
import { config } from "dotenv";
config();
import debug from "debug";
import { createConnection, getConnectionOptions } from "typeorm";
import Application from "./services/Application";
import SocketIOServer from "./services/SocketIOServer";
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions";

async function init(): Promise<void> {
  try {
    const connectionOptions = await getConnectionOptions();
    await createConnection({
      ...connectionOptions,
      charset: 'UTF8MB4_GENERAL_CI',
      maxQueryExecutionTime: 1000,
      logging: ["query", "error"],
      logger: "advanced-console"
    } as MysqlConnectionOptions);
  } catch (error) {
    debug("application:database")(error);
  }

  const app = Application.getInstance();
  SocketIOServer.start(app);
  app.start();
}


init();
