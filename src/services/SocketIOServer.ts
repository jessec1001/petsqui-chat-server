import { Socket as IOSocket, Server } from "socket.io";
import debug from "debug";
import Application from "./Application";
import { Conversation } from "../entity";
import { UserResponse } from "../entity/User";
import { ConversationHandler, ChatEventHandler, UserHandler, TypingEventHandler } from "../socket-handlers";

const log = debug("application:socket-server");

export interface Socket extends IOSocket {
  userId: string|null;
  user: UserResponse;
  options: Record<string,any>|null;
}

export default class SocketIOServer {
  private static instance: SocketIOServer;
  private io: Server;
  private clients: Map<string, Set<Socket>>;

  private constructor(application: Application) {
    this.io = new Server(application.getServer(), {
      serveClient: false,
      path: '/io',
    });
    this.clients = new Map();
    this.setup();
  }

  public addClient(id: string, socket: Socket): void {
    id = String(id);
    this.deleteClient(socket);
    if (!this.clients.has(id)) {
      this.clients.set(id, new Set());
    }
    
    this.clients.get(id).add(socket);
  }

  public getClients(id: string): Set<Socket> {
    id = String(id);
    if (this.clients.has(id)) {
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
        client.emit(event, payload);
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
      client.emit(event, payload);
    });
  }

  private setup(): void {
    this.io.on("connection", (socket: Socket) => {
      UserHandler.getInstance().handle(socket);
      ChatEventHandler.getInstance().handle(socket);
      ConversationHandler.getInstance().handle(socket);
      TypingEventHandler.getInstance().handle(socket);
      socket.on("disconnect", () => {
        this.deleteClient(socket);
      });

      // require authentication.
      socket.use((packet, next: Function) => {
        if (packet[0] !== 'users:authenticate' && (!socket.options || !socket.options.token)) {
          socket.emit("users:require_authentication", { event: packet[0], payload: packet[1] });
          return next(new Error("Authentication failed."));
        }
        next();
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
