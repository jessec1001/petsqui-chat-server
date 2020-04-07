import IO = require("socket.io");
import { getCustomRepository } from "typeorm";
import debug from "debug";
import Application from "./Application";
import { toPayload } from "./JWTHelpers";
import { ConversationRepository } from "../repository";
import Conversation, { ConversationResponse } from "../entity/Conversation";
import ChatEventHandler from "../socket-handlers/ChatEventHandler";

const log = debug("application:socket-io");

export interface Socket extends IO.Socket {
  username: string|null;
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

  private addClient(id: string, socket: Socket): void {
    log("add client", id, socket.id);
    if (!this.clients.has(id)) {
      this.clients.set(id, new Set());
    }

    this.clients.get(id).add(socket);
  }

  public getClients(username: string): Set<Socket> {
    log("get clients", username);
    if (this.clients.has(username)) {
      log("got clients", username);
      return this.clients.get(username);
    }

    return new Set();
  }

  public deleteClient(socket: Socket): void {
    if (this.clients.has(socket.username)) {
      log("delete clients", socket.username, socket.id);
      this.clients.get(socket.username).delete(socket);
    }
  }

  public async emitToConversation(
    conversation: Conversation,
    event: string,
    payload: {},
    skip: string[] = []
  ): Promise<void> {
    const participants = (await conversation.participants);
    participants.filter(p => skip.indexOf(p.username) < 0).forEach(p => {
      const clients = this.getClients(p.username);
      clients.forEach(client => {
        client.json.emit(event, payload);
      });
    });
  }

  public emitToUser(
    username: string,
    event: string,
    payload: {}
  ): void {
    const clients = this.getClients(username);
    clients.forEach(client => {
      client.json.emit(event, payload);
    });
  }

  private setup(): void {
    const conversationsRepository = getCustomRepository(ConversationRepository);

    this.io.on("connection", (socket: Socket) => {
      socket.on("authenticate", async (token: string) => {
        const payload = await toPayload(token);
        socket.username = payload.username;
        this.addClient(payload.username, socket);

        if (socket.username) {
          try {
            const conversations = await conversationsRepository
              .getConversations(socket.username);

            const transformConversation = async (c: Conversation): Promise<ConversationResponse> => {
              return c.toResponse(socket.username);
            };

            socket.json.emit(
              "update conversations",
              await Promise.all(conversations.map(transformConversation))
            );
          } catch (err) {
            log(err);
          }
        }
      });

      ChatEventHandler.getInstance().handle(socket);

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
