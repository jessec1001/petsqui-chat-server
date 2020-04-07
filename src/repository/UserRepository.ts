import { Repository, EntityRepository } from "typeorm";
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

  async bulkInsertOrUpdate(users: User[]): Promise<void> {
    await this.createQueryBuilder()
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

  async insertOrUpdate(user: User): Promise<void> {
    await this.createQueryBuilder()
      .insert()
      .orUpdate({
        overwrite: ["username", "avatar", "color"],
        // eslint-disable-next-line @typescript-eslint/camelcase
        conflict_target: "id",
      })
      .into(User)
      .values(user)
      .execute();
  }
}
