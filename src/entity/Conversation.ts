import { Entity, Column, PrimaryColumn, ManyToMany, JoinTable, OneToMany, UpdateDateColumn, CreateDateColumn, Index } from "typeorm";
import { v4 } from "uuid";
import debug from "debug";
import User, { UserResponse } from "./User";
import ChatEvent, { ChatEventResponse } from "./ChatEvent";
const log = debug("application:conversation-entity");
@Entity()
export default class Conversation {
  constructor() {
    this.id = v4();
  }

  @PrimaryColumn("varchar", { length: 36 })
  id: string;

  @ManyToMany(() => User, user => user.conversations, { eager: false, cascade: true })
  @JoinTable()
  participants: Promise<User[]>;

  @OneToMany(() => ChatEvent, event => event.conversation)
  events: Promise<ChatEvent[]>;

  @Column("text", {nullable: true})
  name: string;

  @Column({nullable: true})
  avatar: string;

  @Column("text", {nullable: true})
  publicName: string;

  @Column({nullable: true})
  publicAvatar: string;

  @Column({nullable: true})
  publicKey: string;

  @Column({nullable: true})
  createdBy: string;

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

  async addParticipants(users: User[]): Promise<void> {
    let participants = await this.participants;
    if (!participants) {
      participants = [];
    }
    users.forEach((user) => {
      if (!participants.some(p => p.id === user.id)) {
        participants.push(user);
      }
    });
  }

  async toResponse(loggedInId: string): Promise<ConversationResponse|null> {
    const participants = await this.participants;
    const current = participants.filter(p => p.id == loggedInId).pop();
    if (!current) {
      return null;
    }
    return {
      id: this.id,
      time: this.createdAt,
      name: this.name,
      groupName: this.name,
      publicName: this.publicName,
      key: this.publicKey,
      avatar: this.avatar,
      publicAvatar: this.publicAvatar,
      lastEvent: this.lastEvent && this.lastEvent.toResponse(),
      participants: participants.map(p => p.toResponse()),
      createdBy: this.createdBy
    };
  }
}

export interface ConversationResponse {
  id: string;
  name: string;
  groupName: string;
  publicName: string;
  key: string;
  avatar: string;
  publicAvatar: string;
  time: Date;
  lastEvent: ChatEventResponse;
  participants: UserResponse[];
  createdBy: string;
}
