import {
  Entity, PrimaryColumn, Column, ManyToMany, Index, UpdateDateColumn, CreateDateColumn, OneToMany
} from "typeorm";
import { v4 } from "uuid";
import Conversation from "./Conversation";
import ChatEvent from "./ChatEvent";

@Entity()
export default class User {
  constructor(username: string) {
    this.id = v4();
    this.username = username;
  }

  @PrimaryColumn("varchar", { length: 36 })
  id: string;

  @Index()
  @Column()
  username: string;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => Conversation, conversation => conversation.participants)
  conversations: Promise<Conversation[]>;

  @OneToMany(() => ChatEvent, event => event.owner)
  events: Promise<ChatEvent[]>;

  toResponse(): UserResponse {
    return {
      id: this.id,
      username: this.username,
    };
  }
}

export interface UserResponse {
  id: string;
  username: string;
}
