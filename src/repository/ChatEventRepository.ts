import { Repository, EntityRepository, MoreThan, LessThan } from "typeorm";
import ChatEvent from "../entity/ChatEvent";

interface OptionsInput {
  username: string;
  conversationId: string;
  from: string|Date;
  to: string|Date;
  page: number;
}

@EntityRepository(ChatEvent)
export default class ChatEventRepository extends Repository<ChatEvent> {
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
