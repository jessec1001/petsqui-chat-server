import { Entity, ManyToOne, PrimaryColumn, Column, UpdateDateColumn, CreateDateColumn, JoinColumn, ManyToMany, JoinTable } from "typeorm";
import { v4 } from "uuid";

import { UserResponse } from "./User";
import { User, Conversation } from "./index";

export enum ChatEventType {
  JOIN = "JOIN",
  MESSAGE = "MESSAGE",
}

@Entity()
export default class ChatEvent {
  private constructor() {
    this.id = v4();
  }

  @PrimaryColumn("varchar", { length: 36 })
  id: string;

  @Column()
  type: ChatEventType;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn()
  owner: User;

  @ManyToMany(() => User, { cascade: true, lazy: true })
  @JoinTable({
    name: "eventReads",
    inverseJoinColumn: {
      name: "userId",
      referencedColumnName: "id",
    },
    joinColumn: {
      name: "eventId",
      referencedColumnName: "id",
    }
  })
  private reads: Promise<User[]>;

  @ManyToOne(() => Conversation, conversation => conversation.events, { cascade: true, eager: true })
  conversation: Conversation;

  @Column()
  text: string;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  setText = (text: string): void => {
    this.text = text;
  };

  getMessage = (): string => {
    if (this.type === ChatEventType.JOIN) {
      const name = (this.owner && this.owner.username) || "Someone";
      return `${name} joined the chat.`;
    }

    return this.text;
  };

  toResponse(): ChatEventResponse {
    return {
      id: this.id,
      owner: this.owner && this.owner.toResponse(),
      text: this.getMessage(),
      type: this.type,
      time: this.createdAt,
      conversationId: this.conversation && this.conversation.id,
    };
  }

  /**
   * @throws Will throw if the user is not part of the conversation.
   **/
  static create(type: ChatEventType, owner: User, conversation: Conversation): ChatEvent {
    if (!conversation.hasParticipant(owner)) {
      throw new Error('User is not part of the conversation.');
    }

    const event = new ChatEvent;
    event.type = type;
    event.owner = owner;
    event.conversation = conversation;
    return event;
  }

  /**
   * @throws Will throw if the user is not part of the conversation.
   **/
  static createUserJoined(owner: User, conversation: Conversation): ChatEvent {
    if (!conversation.hasParticipant(owner)) {
      throw new Error('User is not part of the conversation.');
    }

    return this.create(ChatEventType.JOIN, owner, conversation);
  }

  /**
   * @throws Will throw if the user is not part of the conversation.
   **/
  static createMessage(owner: User, conversation: Conversation, text: string): ChatEvent {
    const event = this.create(ChatEventType.MESSAGE, owner, conversation);
    event.text = text;
    event.reads = new Promise((resolve) => resolve([owner]));
    return event;
  }
}

export interface ChatEventResponse {
  id: string;
  type: ChatEventType;
  text: string;
  owner: UserResponse;
  time: Date;
  conversationId: string;
}
