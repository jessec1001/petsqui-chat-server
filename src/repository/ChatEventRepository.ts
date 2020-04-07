import { Repository, EntityRepository } from "typeorm";
import ChatEvent from "../entity/ChatEvent";

@EntityRepository(ChatEvent)
export default class ChatEventRepository extends Repository<ChatEvent> {
}
