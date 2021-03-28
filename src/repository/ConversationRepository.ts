import { Repository, EntityRepository } from "typeorm";
import { ChatEvent } from "../entity";
import Conversation from "../entity/Conversation";

@EntityRepository(Conversation)
export default class ConversationRepository extends Repository<Conversation> {
  async findById(id: string): Promise<Conversation> {
    return this.findOne(
      {
        where: { id },
        relations: ['participants']
      }
    );
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
      .leftJoinAndMapOne("lastEvent", subQuery => {
        return subQuery
          .select()
          .from(ChatEvent, 'lastEvent')
          .orderBy('"createdAt"', 'DESC')
          .limit(1);
      }, "events", 'events."conversation_id" = conversation.id')
      .where("participants.id = :id", { id })
      .where('conversation.createdAt >= to_timestamp(cast(:since as bigint))::date', {since})
      .take(take)
      .skip(skip)
      .orderBy("conversation.updatedAt", "DESC")
      .getMany();
  }
}
