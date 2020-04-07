import IO = require("socket.io");
import debug from "debug";
import Application from "./Application";
import Conversation from "../entity/Conversation";
import { ConversationHandler, ChatEventHandler, UserHandler } from "../socket-handlers";
import { UserResponse } from "../entity/User";

const log = debug("application:socket-server");

export interface Socket extends IO.Socket {
  userId: string|null;
  user: UserResponse;
  token: string|null;
}

export default class SocketIOServer {
  private static instance: SocketIOServer;
  private io: IO.Server;
  private clients: Map<string, Set<Socket>>;

  private constructor(application: Application) {
    this.io = IO(application.getServer(), {
      serveClient: false,
      path: '/io',
    });
    this.clients = new Map();
    this.setup();
  }

  public addClient(id: string, socket: Socket): void {
    log("add client", id, socket.userId);
    this.deleteClient(socket);
    if (!this.clients.has(id)) {
      this.clients.set(id, new Set());
    }

    this.clients.get(id).add(socket);
  }

  public getClients(id: string): Set<Socket> {
    log("get clients", id);
    if (this.clients.has(id)) {
      log("got clients", id);
      return this.clients.get(id);
    }

    return new Set();
  }

  public deleteClient(socket: Socket): void {
    if (socket.userId && this.clients.has(socket.userId)) {
      log("delete clients", socket.userId, socket.userId);
      this.clients.get(socket.userId).delete(socket);
    }
  }

  public async emitToConversation(
    conversation: Conversation,
    event: string,
    payload: {},
    skip: string[] = []
  ): Promise<void> {
    const participants = (await conversation.participants);
    participants.filter(p => skip.indexOf(p.id) < 0).forEach(p => {
      const clients = this.getClients(p.id);
      clients.forEach(client => {
        client.json.emit(event, payload);
      });
    });
  }

  public emitToUser(
    id: string,
    event: string,
    payload: {}
  ): void {
    const clients = this.getClients(id);
    clients.forEach(client => {
      client.json.emit(event, payload);
    });
  }

  private setup(): void {
    this.io.on("connection", (socket: Socket) => {
      UserHandler.getInstance().handle(socket);
      ChatEventHandler.getInstance().handle(socket);
      ConversationHandler.getInstance().handle(socket);

      socket.on("disconnect", () => {
        this.deleteClient(socket);
      });
    });
  }

  static start(application: Application = null): void {
    if (!application) {
      application = Application.getInstance();
    }

    this.instance = new SocketIOServer(application);
  }

  static getInstance(): SocketIOServer {
    if (!this.instance) {
      this.start();
    }

    return this.instance;
  }
}
