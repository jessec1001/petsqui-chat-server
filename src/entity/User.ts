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
    this.username = username;
  }

  @PrimaryColumn("varchar", { length: 36 })
  id: string;

  @Index()
  @Column()
  username: string;

  @Column()
  avatar: string;

  @Column()
  salt: string;

  @Column()
  public_key: string;

  @Column({ nullable: true })
  color: string;

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
      username: this.username,
      color: this.color,
      avatar: this.avatar,
      public_key: this.public_key,
    };
  }

  static createFromResponse(userResponse: UserResponse): User {
    const user = new User(userResponse.username);
    user.id = userResponse.id;
    user.updateFromResponse(userResponse);
    return user;
  }

  updateFromResponse(userResponse: UserResponse): void {
    this.username = userResponse.username;
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
  username: string;
  color?: string;
  avatar?: string;
  public_key ?: string;
}
