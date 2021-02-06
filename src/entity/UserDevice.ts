import { Entity, ManyToOne, PrimaryColumn, Column, DeleteDateColumn, UpdateDateColumn, CreateDateColumn, JoinColumn, ManyToMany, JoinTable } from "typeorm";
import { v4 } from "uuid";

import { User } from "./index";

@Entity()
export default class UserDevice {
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

    @PrimaryColumn("varchar", { length: 8 })
    os: string;

    @UpdateDateColumn()
    updatedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;
        
    toResponse(): UserDeviceResponse {
      return {
        id: this.id,
        token: this.token,
        os: this.os,
        updated: this.updatedAt,
        time: this.createdAt,
      };
    }

}

export interface UserDeviceResponse {
    id: string;
    token: string;
    os: string;
    updated: Date;
    time: Date;
}
