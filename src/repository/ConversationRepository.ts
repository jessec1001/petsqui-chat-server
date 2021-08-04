import { Repository, EntityRepository } from "typeorm";
import { ChatEvent } from "../entity";
import Conversation from "../entity/Conversation";

@EntityRepository(Conversation)
export default class ConversationRepository extends Repository<Conversation> {
  async findById(id: string): Promise<Conversation> {
    return this.createQueryBuilder("conversation")
      .leftJoinAndSelect("conversation.participants", "participants")
      .where('"conversation"."id" = :id', {id})
      .getOne();
  }

  async getMasterConversation(): Promise<Conversation> {
    let masterConversation = await this.findOne("master", { relations: ['participants'] });
    if (!masterConversation) {
      masterConversation = this.create({id: "master"});
      await this.save(masterConversation);
    }

    return masterConversation;
  }

  async getConversations(id: string, skip = 0, take = 999999, since = 0): Promise<Conversation[]> {
    return this.createQueryBuilder("conversation")
      .leftJoinAndSelect("conversation.participants", "participants")
      .leftJoinAndSelect(subQuery => {
        return subQuery
          .select('"conversationId", MAX("createdAt") "createdAt"')
          .from(ChatEvent, "last")
          .orderBy('"createdAt"', "DESC")
          .groupBy('"conversationId"');
      }, "lastEvent", '"lastEvent"."conversationId" = conversation.id')
      .leftJoinAndSelect(subQuery => {
        return subQuery
          .select('"conversationId", COUNT(*) "count"')
          .from("conversation_participants_user", "participants")
          .where('"participants"."userId" = :id', {id})
          .groupBy('"conversationId"');
      }, "conversationParticipants", '"conversationParticipants"."conversationId" = "conversation"."id"')
      .innerJoinAndMapOne("conversation.lastEvent", ChatEvent, 'events', '"events"."conversationId"="conversation"."id" AND "events"."createdAt" = "lastEvent"."createdAt"')
      .where('"conversationParticipants"."count" > 0')
      .where('"conversation"."updatedAt" > to_timestamp(:since)',{since})
      .take(take)
      .skip(skip)
      .orderBy("conversation.updatedAt", "DESC")
      .getMany();
  }
}
