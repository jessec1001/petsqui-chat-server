import * as express from "express";
import * as bodyParser from "body-parser";
import { createServer, Server } from 'http';
import debug from "debug";
import TokenController from "../controller/TokenController";

export default class Application {
  private static instance: Application;

  private app: express.Application;
  private server: Server;

  static getInstance(): Application {
    if (!this.instance) {
      this.instance = new Application();
    }

    return this.instance;
  }

  private constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.app.use(bodyParser.json());

    this.configureRoutes();
  }

  private configureRoutes(): void {
    // this.app.use('/api/token', TokenController.createInstance().getRouter());
  }

  start(): void {
    this.server.listen(process.env['PORT'] || 3000);
    debug("application:express")(`Application is running on port: ${process.env['PORT'] || 3000}.`);
  }

  getApp(): express.Application {
    return this.app;
  }

  getServer(): Server {
    return this.server;
  }
}
