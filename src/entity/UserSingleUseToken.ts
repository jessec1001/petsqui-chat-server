import { Entity, ManyToOne, PrimaryColumn, Column, DeleteDateColumn, UpdateDateColumn, CreateDateColumn, JoinColumn, ManyToMany, JoinTable } from "typeorm";
import { v4 } from "uuid";

import { User } from "./index";

@Entity()
export default class UserSingleUseToken {
  private constructor() {
    this.id = v4();
  }

    @PrimaryColumn("varchar", { length: 36 })
    id: string;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn()
    owner: User;

    @Column("text")
    token: string;
  
    @UpdateDateColumn()
    updatedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;
        
    toResponse(): UserSingleUseTokenResponse {
      return {
        id: this.id,
        token: this.token,
        updated: this.updatedAt,
        time: this.createdAt,
      };
    }
    static create(owner: User): UserSingleUseToken {
      const event = new UserSingleUseToken;
      event.owner = owner;
      return event;
    }
}

export interface UserSingleUseTokenResponse {
    id: string;
    token: string;
    updated: Date;
    time: Date;
}
