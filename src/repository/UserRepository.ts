import { Repository, EntityRepository, InsertResult } from "typeorm";
import { UserSingleUseToken } from "../entity";
import User from "../entity/User";

@EntityRepository(User)
export default class UserRepository extends Repository<User> {
  async findByUsername(username: string): Promise<User> {
    return this.findOne({
      where: {
        username,
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
  async bulkSelectKeys(users: string[]): Promise<User[]> {
    return this.createQueryBuilder("user")
      .whereInIds(users)
      .select([
        "user.id","user.public_key"
      ])
      .getMany();
  }
  async addTokens(userId: string, tokens: UserSingleUseToken[]): Promise<void> {
    return this.createQueryBuilder("user")
      .relation(User, "tokens")
      .of(userId)
      .add(tokens);
  }
  async bulkInsertOrUpdate(users: User[]): Promise<InsertResult> {
    return await this.createQueryBuilder()
      .insert()
      .orUpdate({
        overwrite: ["username", "avatar", "color"],
        // eslint-disable-next-line @typescript-eslint/camelcase
        conflict_target: "id",
      })
      .into(User)
      .values(users)
      .execute();
  }

  async insertOrUpdate(user: User, overwriteKeys: boolean): Promise<InsertResult> {
    let overwrite = [];
    if (!overwriteKeys) {
      overwrite = ["username", "avatar", "color"];
    } else {
      overwrite = ["username", "avatar", "color", "public_key", "salt"];
    }
    return await this.createQueryBuilder()
      .insert()
      .orUpdate({
        overwrite,
        // eslint-disable-next-line @typescript-eslint/camelcase
        conflict_target: "id",
      })
      .into(User)
      .values(user)
      .execute();
  }
}
