import { getCustomRepository } from "typeorm";
import debug from "debug";

import { ConversationRepository, UserRepository } from "../repository";
import SocketHandlerInterface from "./SocketHandlerInterface";
import SocketIOServer, { Socket } from "../services/SocketIOServer";

const log = debug("application:event-handler");

export default class TypingEventHandler implements SocketHandlerInterface {
  conversationRepository: ConversationRepository;
  userRepository: UserRepository;
  server: SocketIOServer;
  private static instance: TypingEventHandler;

  constructor(
    conversationRepository: ConversationRepository,
    userRepository: UserRepository,
    server: SocketIOServer
  ) {
    this.conversationRepository = conversationRepository;
    this.userRepository = userRepository;
    this.server = server;
  }

  newMessage = (socket: Socket) => async (
    { conversationId, message },
    fn: Function
  ): Promise<void> => {

    try {
      // get the conversation.
      const conversation = await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new Error("Invalid conversation.");
      }

      // find message owner.
      const owner = await this.userRepository.findOne(socket.userId);
      if (!owner) {
        throw new Error("Invalid user logged in.");
      }

      // send to all participants.
      this.server.emitToConversation(conversation, "events:typing", { userId: socket.userId });

      // notify the user.
      if (fn) {
        fn({ success: true });
      }
    } catch (err) {
      log(err);
      return fn && fn({ success: false, error: (err as Error).message });
    }

  };


  handle(socket: Socket): void {
    socket.on("events:typing", this.newMessage(socket));
  }

  static getInstance(): TypingEventHandler {
    if (!this.instance) {
      this.instance = new TypingEventHandler(
        getCustomRepository(ConversationRepository),
        getCustomRepository(UserRepository),
        SocketIOServer.getInstance()
      );
    }

    return this.instance;
  }
}
