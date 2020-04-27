import { Repository, EntityRepository } from "typeorm";
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
      masterConversation = this.create({
        id: "master"    });
      await this.save(masterConversation);
    }

    return masterConversation;
  }

  async getConversations(id: string, page = 1, take = 20): Promise<Conversation[]> {
    return this.createQueryBuilder("conversation")
      .leftJoin("conversation.participants", "participants")
      .leftJoinAndMapOne("conversation.lastEvent", (subQuery) => {
        return subQuery.select()
          .from(ChatEvent, 'lastEvent')
          .orderBy('createdAt', 'DESC');
      }, "lastEvent", "lastEvent.`conversationId` = conversation.id")
      .where("participants.id = :id", { id })
      .take(20)
      .skip((page - 1) * take)
      .orderBy("conversation.updatedAt", "DESC")
      .getMany();
  }
}
