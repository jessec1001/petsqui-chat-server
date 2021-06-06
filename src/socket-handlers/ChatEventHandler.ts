import { getCustomRepository } from "typeorm";
import debug from "debug";

import { ChatEvent } from "../entity";
import { ConversationRepository, ChatEventRepository, UserRepository } from "../repository";
import SocketHandlerInterface from "./SocketHandlerInterface";
import SocketIOServer, { Socket } from "../services/SocketIOServer";

import usersProvider from "../services/UserProvider";
import UsersProviderInterface from "../interfaces/UsersProviderInterface";

const log = debug("application:event-handler");

export default class ChatEventHandler implements SocketHandlerInterface {
  conversationRepository: ConversationRepository;
  eventRepository: ChatEventRepository;
  userRepository: UserRepository;
  server: SocketIOServer;
  private usersProvider: UsersProviderInterface;
  private static instance: ChatEventHandler;
  
  constructor(
    conversationRepository: ConversationRepository,
    eventRepository: ChatEventRepository,
    userRepository: UserRepository,
    usersProvider: UsersProviderInterface,
    server: SocketIOServer
  ) {
    this.conversationRepository = conversationRepository;
    this.eventRepository = eventRepository;
    this.userRepository = userRepository;
    this.usersProvider = usersProvider;
    this.server = server;
  }

  newMessage = (socket: Socket) => async (
    { conversationId, message, nonce },
    fn: Function
  ): Promise<void> => {

    try {
      if (typeof message !== 'string' || message.trim().length <= 0) {
        throw new Error("Invalid Message.");
      }

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
      await this.userRepository.setLastOnline(socket.userId);
      // create message event.
      const event = ChatEvent.createMessage(owner, conversation, message);
      await this.eventRepository.save(event);

      const eventResponse = event.toResponse();
      eventResponse.conversationId = conversationId;
      const participants = (await conversation.participants);
      const skip = [socket.userId];
      const recipients = participants.filter(p => skip.indexOf(p.id) < 0);
      recipients.map(async (r) => {
        const stats = await this.eventRepository.getUnreadStats(r.id);
        let unread = 0;
        stats.map(s=>{
          unread += s.unreadCount;
        });
        this.usersProvider.pushMessage(socket, {
          "badge": unread
        });
      });
      // send to all participants.
      this.server.emitToConversation(conversation, "events:event_created", { event: eventResponse });

      // notify the user.
      if (fn) {
        fn({ success: true, event: eventResponse, nonce });
      }
    } catch (err) {
      log(err);
      return fn && fn({ success: false, error: (err as Error).message, nonce });
    }

  };

  fetch = (socket: Socket) => (
    async ({ conversationId, skip = 0 }, fn: Function): Promise<void> => {
      if (!conversationId) {
        fn && fn({ success: false });
      }
      try {
        // get the conversation.
        const conversation = await this.conversationRepository.findById(conversationId);
        if (!conversation) {
          throw new Error("Invalid conversation.");
        }

        const events = await this.eventRepository.find({
          where: { conversation: { id: conversationId } },
          take: 20,
          skip: skip,
          order: { createdAt: "DESC" },
          loadEagerRelations: false,
          relations: ['owner']
        });
        await this.userRepository.setLastOnline(socket.userId);
        fn && fn({ success: true, events: events.map(e => e.toResponse()) });
      } catch (err) {
        log(err);
        fn && fn({ success: false, events: [] });
      }
    }
  );

  getUnreadEventsCount = (socket: Socket) => async (fn): Promise<void> => {
    try {
      if (!socket.userId) {
        fn && fn({ success: false, stats: [] });
        return;
      }
      const stats = await this.eventRepository.getUnreadStats(socket.userId);
      fn && fn({ success: true, stats });
    } catch (err) {
      log(err);
      fn && fn({ success: false, stats2: [] });
    }
  };
  
  markRead = (socket: Socket) => async ({ conversationId, eventId }, fn): Promise<void> => {
    try {
      if (socket.userId) {
        if (!conversationId) {
          fn && fn({ success: false });
        }
        const conversation = await this.conversationRepository.findById(conversationId);
        if (!conversation) {
          throw new Error("Invalid conversation.");
        }
        this.server.emitToConversation(conversation, "events:read_event", { conversationId, eventId, userId: socket.userId }, [socket.userId]);
        if (!eventId) {
          const success = await this.eventRepository.markConversationRead(conversationId, socket.userId);
          fn && fn({ success });
        } else {
          const success = await this.eventRepository.markEventRead(eventId, socket.userId);
          fn &&fn({ success });
        }
      } else {
        fn && fn({ success: false });
      }
    } catch (err) {
      log(err);
      fn && fn({ success: false, stats: [] });
    }
  };

  handle(socket: Socket): void {
    socket.on("events:new_message", this.newMessage(socket));
    socket.on("events:fetch", this.fetch(socket));
    socket.on("events:get_unread_count", this.getUnreadEventsCount(socket));
    socket.on("events:mark_read", this.markRead(socket));
  }

  static getInstance(): ChatEventHandler {
    if (!this.instance) {
      this.instance = new ChatEventHandler(
        getCustomRepository(ConversationRepository),
        getCustomRepository(ChatEventRepository),
        getCustomRepository(UserRepository),
        usersProvider.getInstance(),
        SocketIOServer.getInstance()
      );
    }

    return this.instance;
  }
}
