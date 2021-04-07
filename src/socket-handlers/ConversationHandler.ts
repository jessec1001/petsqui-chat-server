import debug from "debug";

import { getCustomRepository, getConnection } from "typeorm";
import { Conversation, User, ChatEvent } from "../entity";
import { ConversationResponse } from "../entity/Conversation";
import { UserResponse } from "../entity/User";
import { ConversationRepository, UserRepository, ChatEventRepository } from "../repository";
import SocketIOServer, { Socket } from "../services/SocketIOServer";

const log = debug("application:conversation-handler");

export default class ConversationHandler {
  private static instance: ConversationHandler;
  private conversationRepository: ConversationRepository;
  private eventsRepository: ChatEventRepository;
  private userRepository: UserRepository;
  server: SocketIOServer;

  constructor(
    conversationRepository: ConversationRepository,
    userRepository: UserRepository,
    eventsRepository: ChatEventRepository,
    server: SocketIOServer
  ) {
    this.conversationRepository = conversationRepository;
    this.userRepository = userRepository;
    this.eventsRepository = eventsRepository;
    this.server = server;
  }

  fetch = (socket: Socket) => async (
    { since }: { since: number }, fn: Function
  ): Promise<void> => {
    try {
      let conversations = await this.conversationRepository
        .getConversations(socket.userId, 0, 999999, since);
      //log(conversations);
      conversations = await this.eventsRepository.mapLastEvent(conversations);
      //log(conversations);
      await this.userRepository.setLastOnline(socket.userId);
      
      const transformConversation = async (c: Conversation): Promise<ConversationResponse> => {
        return c.toResponse(socket.userId);
      };

      const transformedConversations = await Promise.all(conversations.map(transformConversation));
      //log(transformedConversations);
      fn(
        { success: true, conversations: transformedConversations }
      );
    } catch (err) {
      //log(err);
      fn({ success: false, conversations: [] });
    }
  };

  create = (socket: Socket) => async (
    { participants, name, avatar }: { participants: UserResponse[], name: string, avatar: string }, fn: Function
  ): Promise<void> => {
    try {
      if (socket.user) {
        const conversation = new Conversation();
        conversation.name = name;
        conversation.avatar = avatar;
        conversation.createdBy = socket.userId;
        participants.push(socket.user);
        const users = participants.map(p => User.createFromResponse(p));
        await this.userRepository.bulkInsertOrUpdate(users);
        await this.userRepository.setLastOnline(socket.userId);
        conversation.addParticipants(users);
        getConnection().transaction(async entityManager => {
          await entityManager.getCustomRepository(ConversationRepository).save(conversation);
          const conversationResponse = await conversation.toResponse(socket.userId);
          this.server.emitToConversation(conversation, "conversations:created", { conversation: conversationResponse }, [socket.userId]);
          fn({ success: true, conversation: conversationResponse });
        });    
      } else {
        throw new Error("Authentication failed!");
      }
    } catch (err) {
      log("ERROR", err);
      fn({ success: false, error: err });
    }
  };

  delete = (socket: Socket) => async (
    { conversationId, hidden }: { conversationId: string, hidden: boolean }, fn: Function
  ): Promise<void> => {
    try {
      const conversation = await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new Error("Conversation was not found!");
      }

      const participants = await conversation.participants;
      const owner = participants.find(participant => participant.id == socket.userId);
      if (!owner) {
        throw new Error("Invalid conversation.");
      }
      const newParticipants = participants.filter(participant => participant.id != socket.userId);
      conversation.participants = new Promise((resolve) => resolve(newParticipants));
      if (!hidden) {
        const leftEvent = ChatEvent.createUserLeft(owner, conversation);
        this.eventsRepository.save(leftEvent);
      } else {
        this.conversationRepository.save(conversation);
      }
      return fn({ success: true });
    } catch (error) {
      log(error);
      return fn({ success: false, error });
    }
  };

  updateAvatar = (socket: Socket) => async (
    { conversationId, name, avatar }: { conversationId: string, name: string, avatar: string }, fn: Function
  ): Promise<void> => {
    try {
      const conversation = await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new Error("Conversation was not found!");
      }
      if (conversation.createdBy != socket.userId) {
        throw new Error("Conversation was not found!");
      }
      conversation.name = name;
      conversation.avatar = avatar;
      this.conversationRepository.save(conversation);
      
      return fn({ success: true });
    } catch (error) {
      log(error);
      return fn({ success: false, error });
    }
  };

  public handle(socket: Socket): void {
    socket.on("conversations:fetch", this.fetch(socket));
    socket.on("conversations:create", this.create(socket));
    socket.on("conversations:updateAvatar", this.updateAvatar(socket));
    socket.on("conversations:delete", this.delete(socket));
  }

  public static getInstance(): ConversationHandler {
    if (!this.instance) {
      this.instance = new ConversationHandler(
        getCustomRepository(ConversationRepository),
        getCustomRepository(UserRepository),
        getCustomRepository(ChatEventRepository),
        SocketIOServer.getInstance()
      );
    }

    return this.instance;
  }
}
