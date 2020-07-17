import debug from "debug";

import { getCustomRepository } from "typeorm";
import { Conversation, User, ChatEvent } from "../entity";
import { ConversationResponse } from "../entity/Conversation";
import { UserResponse } from "../entity/User";
import { ConversationRepository, UserRepository, ChatEventRepository } from "../repository";
import { Socket } from "../services/SocketIOServer";

const log = debug("application:conversation-handler");

export default class ConversationHandler {
  private static instance: ConversationHandler;
  private conversationRepository: ConversationRepository;
  private eventsRepository: ChatEventRepository;
  private userRepository: UserRepository;

  constructor(
    conversationRepository: ConversationRepository,
    userRepository: UserRepository,
    eventsRepository: ChatEventRepository
  ) {
    this.conversationRepository = conversationRepository;
    this.userRepository = userRepository;
    this.eventsRepository = eventsRepository;
  }

  fetch = (socket: Socket) => async (fn: Function): Promise<void> => {
    try {
      let conversations = await this.conversationRepository
        .getConversations(socket.userId);

      conversations = await this.eventsRepository.mapLastEvent(conversations);

      const transformConversation = async (c: Conversation): Promise<ConversationResponse> => {
        return c.toResponse(socket.userId);
      };

      fn(
        { success: true, conversations: await Promise.all(conversations.map(transformConversation)) }
      );
    } catch (err) {
      log(err);
      fn({ success: false, conversations: [] });
    }
  };

  create = (socket: Socket) => async (
    { participants }: { participants: UserResponse[] }, fn: Function
  ): Promise<void> => {
    try {
      if (socket.user) {
        const conversation = new Conversation();
        participants.push(socket.user);
        const users = participants.map(p => User.createFromResponse(p));
        this.userRepository.bulkInsertOrUpdate(users);
        users.forEach(u => {
          conversation.addParticipant(u);
        });
        this.conversationRepository.save(conversation);

        fn({ success: true, conversation: await conversation.toResponse(socket.userId) });
      } else {
        throw new Error("Authentication failed!");
      }
    } catch (err) {
      log(err);
      fn({ success: false, error: err });
    }
  };

  delete = (socket: Socket) => async (
    { conversationId }: { conversationId: string }, fn: Function
  ): Promise<void> => {
    try {
      const conversation = await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new Error("Conversation was not found!");
      }

      const participants = await conversation.participants;
      const owner = participants.find(participant => participant.id === socket.userId);
      if (!owner) {
        throw new Error("Invalid conversation.");
      }

      const leftEvent = ChatEvent.createUserLeft(owner, conversation);
      const newParticipants = participants.filter(participant => participant.id != socket.userId);
      conversation.participants = new Promise((resolve) => resolve(newParticipants));

      this.conversationRepository.save(conversation);
      this.eventsRepository.save(leftEvent);

      return fn({ success: true });
    } catch (error) {
      log(error);
      return fn({ success: false, error });
    }
  };

  public handle(socket: Socket): void {
    socket.on("conversations:fetch", this.fetch(socket));
    socket.on("conversations:create", this.create(socket));
    socket.on("conversations:delete", this.delete(socket));
  }

  public static getInstance(): ConversationHandler {
    if (!this.instance) {
      this.instance = new ConversationHandler(
        getCustomRepository(ConversationRepository),
        getCustomRepository(UserRepository),
        getCustomRepository(ChatEventRepository)
      );
    }

    return this.instance;
  }
}
