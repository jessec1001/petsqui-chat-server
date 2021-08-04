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
    let from = "1900-01-01";
    if (since != 0){
      var a = new Date(since * 1000);
      var year = a.getFullYear();
      var month = ("0" + (a.getMonth() + 1)).slice(-2)
      var date = ("0" + a.getDate()).slice(-2)
      var hour = a.getHours();
      var min = a.getMinutes();
      var sec = a.getSeconds();
      from = year + '-' + month + '-' + date + ' ' + hour + ':' + min + ':' + sec ;
    }console.log("HERE!", since, from)
    let p = await this.createQueryBuilder("conversation")
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
      .where('"conversation"."updatedAt" > :from',{from})
      .take(take)
      .skip(skip)
      .orderBy("conversation.updatedAt", "DESC")
      .getMany();
      
      return p;
  }
}
