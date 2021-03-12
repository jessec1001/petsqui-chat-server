import { Repository, EntityRepository, MoreThan, LessThan } from "typeorm";
import ChatEvent from "../entity/ChatEvent";
import { Conversation } from "../entity";

interface OptionsInput {
  username: string;
  conversationId: string;
  from: string|Date;
  to: string|Date;
  page: number;
}

interface UnreadCount {
  conversationId: string;
  unreadCount: number;
}

@EntityRepository(ChatEvent)
export default class ChatEventRepository extends Repository<ChatEvent> {
  async getUnreadStats(userId: string): Promise<UnreadCount[]> {
    return this.createQueryBuilder("event")
      .select("DISTINCT(conversation.id)", "conversationId")
      .addSelect("COUNT(*)", "unreadCount")
      .innerJoin("event.conversation", "conversation")
      .innerJoin("conversation.participants", "participant", "participant.id = :userId", { userId })
      .leftJoin((qb) => {
        return qb.select("reads.eventId", "eventId")
          .addSelect("reads.userId", "userId")
          .from("eventReads", "reads")
          .where('reads.userId = :userId', { userId });
      }, "reads", 'reads.eventId = event.id')
      .where('reads.userId is null')
      .groupBy("conversation.id")
      .getRawMany();
  }

  async mapLastEvent(conversations: Conversation[]): Promise<Conversation[]> {
    const events = await this.createQueryBuilder()
      .select("event").from(ChatEvent, "event")
      .innerJoinAndSelect("event.conversation", "conversation")
      .innerJoinAndSelect("event.owner", "owner")
      .innerJoin(subQuery => {
        return subQuery
          .select('conversationId, MAX("updatedAt") updatedAt')
          .from(ChatEvent, "last")
          .orderBy('updatedAt', "DESC")
          .groupBy('conversationId');
      }, "last", 'last.conversationId = conversation.id AND last.updatedAt = event.updatedAt')
      .where("conversation.id IN (:ids)", { ids: conversations.map(c => c.id) })
      .getMany();

    return conversations.map(c => {
      const event = events.find(e => e.conversation.id == c.id);
      if (event) {
        c.lastEvent = event;
      }
      return c;
    });
  }

  async markConversationRead(conversationId: string, userId: string): Promise<boolean> {
    try {
      const tableName = this.metadata.tableName;
      /*const query = `
      INSERT INTO eventReads(eventId, userId)
        SELECT event.id, ? FROM ${tableName} event
        INNER JOIN conversation ON conversation.id = event.conversationId
        WHERE conversation.id = ?
        ON CONFLICT (id) DO NOTHING
      `;
      this.query(query, [userId, conversationId]);*/
      return true;
    } catch (err) {
      return false;
    }
  }

  async markEventRead(eventId: string, userId: string): Promise<boolean> {
    try {
      //const query = "INSERT INTO eventReads(eventId, userId) VALUES(?, ?) ON CONFLICT (\"userId\") DO NOTHING";
      //this.query(query, [eventId, userId]);
      return true;
    } catch (err) {
      return false;
    }
  }

  async findByOptions(options: Partial<OptionsInput>): Promise<ChatEvent[]> {
    let page = 1;
    if (options.page && options.page > 0) {
      page = options.page;
    }

    const where: any = {};
    if (options.conversationId) {
      where.conversation = { id: options.conversationId };
    }

    if (options.username) {
      where.owner = { username: options.username };
    }

    if (options.from || options.to) {
      where.createdAt = [];
    }

    if (options.from) {
      where.createdAt.push(MoreThan(options.from));
    }

    if (options.to) {
      where.createdAt.push(LessThan(options.to));
    }

    return this.find({
      where,
      take: 20,
      skip: 20 * (page - 1),
      order: { createdAt: "DESC" },
      loadEagerRelations: false,
      relations: ['owner']
    });
  }
}
