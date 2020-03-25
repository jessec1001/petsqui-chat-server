import { Entity, PrimaryColumn, ManyToMany, JoinTable, OneToMany, UpdateDateColumn, CreateDateColumn } from "typeorm";
import { v4 } from "uuid";
import User, { UserResponse } from "./User";
import ChatEvent, { ChatEventResponse } from "./ChatEvent";

@Entity()
export default class Conversation {
  constructor() {
    this.id = v4();
  }

  @PrimaryColumn("varchar", { length: 36 })
  id: string;

  @ManyToMany(() => User, user => user.conversations, { cascade: true })
  @JoinTable()
  participants: Promise<User[]>;

  @OneToMany(() => ChatEvent, event => event.conversation)
  events: Promise<ChatEvent[]>;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  lastEvent: ChatEvent|null;

  async hasParticipant(user: User): Promise<boolean> {
    const participants = await this.participants;
    return participants && participants.some(participant => participant.id === user.id);
  }

  async addParticipant(user: User): Promise<void> {
    let participants = await this.participants;
    if (!participants) {
      participants = [];
    }

    if (!participants.some(p => p.id === user.id)) {
      participants.push(user);
    }
  }

  async getNameFor(owner: User, participants: User[] = null): Promise<string> {
    if (this.id === "master") {
      return "All Users";
    }

    if (!participants) {
      participants = await this.participants;
    }

    if (!participants) {
      return "";
    }

    return participants.filter(participant => participant.id !== owner.id).join(', ');
  }

  async toResponse(loggedInUsername: string): Promise<ConversationResponse|null> {
    const participants = await this.participants;
    const current = participants.filter(p => p.username === loggedInUsername).pop();
    if (!current) {
      return null;
    }

    return {
      id: this.id,
      name: await this.getNameFor(current, participants),
      lastEvent: this.lastEvent && this.lastEvent.toResponse(),
      participants: participants.map(p => p.toResponse()),
    };
  }
}

export interface ConversationResponse {
  id: string;
  name: string;
  lastEvent: ChatEventResponse;
  participants: UserResponse[];
}
