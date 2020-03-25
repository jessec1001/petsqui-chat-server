import { Repository, EntityRepository } from "typeorm";
import Conversation from "../entity/Conversation";

@EntityRepository(Conversation)
export class ConversationRepository extends Repository<Conversation> {
  async getMasterConversation(): Promise<Conversation> {
    let masterConversation = await this.findOne("master", { relations: ['participants' ] });
    if (!masterConversation) {
      masterConversation = this.create({
        id: "master"    });
      await this.save(masterConversation);
    }

    return masterConversation;
  }

  async getConversations(username: string, page = 1, take = 20): Promise<Conversation[]> {
    return this.createQueryBuilder("conversation")
      .leftJoin("conversation.participants", "participants")
      .leftJoinAndMapOne("conversation.lastEvent", "conversation.events", "lastEvent")
      // .leftJoinAndMapOne("conversation.lastEvent", (qb) => {
      //   return qb.select("event")
      //     .from(ChatEvent, "event")
      //     .leftJoinAndMapOne("event.owner", User, "owner", "event.owner = owner.id")
      //     .orderBy("event.createdAt", "DESC")
      //     .take(1);
      // }, "lastEvent", "lastEvent.event_conversationId = conversation.id")
      .where("participants.username = :username", { username })
      .take(20)
      .skip((page - 1) * take)
      .orderBy("conversation.updatedAt", "DESC")
      .getMany();
  }
}