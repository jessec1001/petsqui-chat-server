import { getCustomRepository } from "typeorm";
import debug from "debug";

import SocketHandlerInterface from "./SocketHandlerInterface";
import SocketIOServer, { Socket } from "../services/SocketIOServer";
import { ConversationRepository, ChatEventRepository, UserRepository } from "../repository";
import { ChatEvent } from "../entity";

const log = debug("application:socketio:event");

export default class ChatEventHandler implements SocketHandlerInterface {
  conversationRepository: ConversationRepository;
  eventRepository: ChatEventRepository;
  userRepository: UserRepository;
  server: SocketIOServer;
  private static instance: ChatEventHandler;

  constructor(
    conversationRepository: ConversationRepository,
    eventRepository: ChatEventRepository,
    userRepository: UserRepository,
    server: SocketIOServer
  ) {
    this.conversationRepository = conversationRepository;
    this.eventRepository = eventRepository;
    this.userRepository = userRepository;
    this.server = server;
  }

  sendMessage = (socket: Socket) => async (
    { conversationId, message },
    fn: Function
  ): Promise<void> => {

    try {
      // get the conversation.
      const conversation = await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new Error("invalid conversation.");
      }

      // find message owner.
      const owner = await this.userRepository.findOne(socket.userId);
      if (!owner) {
        throw new Error("user doesn't exist.");
      }

      // create message event.
      const event = ChatEvent.createMessage(owner, conversation, message);
      await this.eventRepository.save(event);

      const eventResponse = event.toResponse();
      eventResponse.conversationId = conversationId;

      // send to all participants.
      this.server.emitToConversation(conversation, "new event", { event: eventResponse });

      // notify the user.
      if (fn) {
        fn({ success: true, event: eventResponse });
      }
    } catch (err) {
      log(JSON.stringify(err));
      return fn && fn({ success: false, message: (err as Error).message });
    }

  };

  fetchEvents = (socket: Socket) => (
    async ({ conversationId, page = 1 }, fn: Function): Promise<void> => {
      try {
        const events = await this.eventRepository.find({
          where: { conversation: { id: conversationId } },
          take: 20,
          skip: 20 * (page - 1),
          order: { createdAt: "DESC" },
          loadEagerRelations: false,
          relations: ['owner']
        });

        fn({ success: true, events: events.map(e => e.toResponse()) });
      } catch (err) {
        log(JSON.stringify(err));
        fn({ success: false, events: [] });
      }
    }
  );

  handle(socket: Socket): void {
    socket.on("send message", this.sendMessage(socket));
    socket.on("fetch events", this.fetchEvents(socket));
  }

  static getInstance(): ChatEventHandler {
    if (!this.instance) {
      this.instance = new ChatEventHandler(
        getCustomRepository(ConversationRepository),
        getCustomRepository(ChatEventRepository),
        getCustomRepository(UserRepository),
        SocketIOServer.getInstance()
      );
    }

    return this.instance;
  }
}
