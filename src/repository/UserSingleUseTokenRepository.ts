import { Repository, EntityRepository, InsertResult } from "typeorm";
import { UserSingleUseToken } from "../entity";
import User from "../entity/User";

@EntityRepository(UserSingleUseToken)
export default class UserSingleUseTokenRepository extends Repository<User> {
  async findByToken(token: string): Promise<User> {
    return this.findOne({
      where: {
        token,
      }
    });
  }
  async findByID(id: string): Promise<User> {
    return this.findOne({
      where: {
        id,
      }
    });
  }
}
