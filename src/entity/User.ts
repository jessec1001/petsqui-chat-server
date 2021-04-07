import {
  Entity, PrimaryColumn, Column, ManyToMany, Index, UpdateDateColumn, CreateDateColumn, OneToMany
} from "typeorm";
import { v4 } from "uuid";
import Conversation from "./Conversation";
import ChatEvent from "./ChatEvent";
import UserDevice from "./UserDevice";
import UserSingleUseToken from "./UserSingleUseToken";
@Entity()
export default class User {
  constructor(username: string) {
    this.id = v4();
    this.username = String(username);
  }

  @PrimaryColumn("varchar", { length: 36 })
  id: string;

  @Index()
  @Column()
  username: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  salt: string;

  @Column({ nullable: true })
  public_key: string;

  @Column({ nullable: true })
  color: string;
  
  @Column({ nullable: true })
  lastOnline: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => Conversation, conversation => conversation.participants)
  conversations: Promise<Conversation[]>;

  @OneToMany(() => ChatEvent, event => event.owner)
  events: Promise<ChatEvent[]>;

  @OneToMany(() => UserDevice, device => device.owner)
  devices: Promise<UserDevice[]>;

  @OneToMany(() => UserSingleUseToken, token => token.owner)
  tokens: Promise<UserSingleUseToken[]>;

  toResponse(include_salt=false): UserResponse {
    return {
      id: this.id,
      name: this.name,
      username: this.username,
      color: this.color,
      avatar: this.avatar,
      public_key: this.public_key,
      lastOnline: this.lastOnline,
      salt: "SALT",
    };
  }

  static createFromResponse(userResponse: UserResponse): User {
    const user = new User(userResponse.id);
    user.id = String(userResponse.id);
    user.updateFromResponse(userResponse);
    return user;
  }

  updateFromResponse(userResponse: UserResponse): void {
    this.username = userResponse.username;
    this.name = userResponse.name;
    if (userResponse.avatar) {
      this.avatar = userResponse.avatar;
    }

    if (userResponse.color) {
      this.color = userResponse.color;
    }
  }
}

export interface UserResponse {
  id: string;
  name?: string;
  username: string;
  phone_number?: string;
  nickname?: string;
  color?: string;
  avatar?: string;
  public_key ?: string;
  salt ?: string;
  lastOnline ?: string;
}
