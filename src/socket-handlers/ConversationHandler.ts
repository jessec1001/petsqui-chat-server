import debug from "debug";

import { Socket } from "../services/SocketIOServer";
import { ConversationRepository, UserRepository } from "../repository";
import { getCustomRepository } from "typeorm";
import { Conversation, User } from "../entity";
import { ConversationResponse } from "../entity/Conversation";
import { UserResponse } from "../entity/User";

const log = debug("application conversation-handler");

export default class ConversationHandler {
  private static instance: ConversationHandler;
  private conversationRepository: ConversationRepository;
  private userRepository: UserRepository;

  constructor(conversationRepository: ConversationRepository, userRepository: UserRepository) {
    this.conversationRepository = conversationRepository;
    this.userRepository = userRepository;
  }

  fetchConversations = (socket: Socket) => async (fn: Function): Promise<void> => {
    try {
      const conversations = await this.conversationRepository
        .getConversations(socket.userId);

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

  createConversation = (socket: Socket) => async (
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

  public handle(socket: Socket): void {
    socket.on("fetch_conversations", this.fetchConversations(socket));
    socket.on("create_conversation", this.createConversation(socket));
  }

  public static getInstance(): ConversationHandler {
    if (!this.instance) {
      this.instance = new ConversationHandler(
        getCustomRepository(ConversationRepository),
        getCustomRepository(UserRepository),
      );
    }

    return this.instance;
  }
}
