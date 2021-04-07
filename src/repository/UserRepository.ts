import { Repository, EntityRepository, InsertResult } from "typeorm";
import { UserSingleUseToken } from "../entity";
import User from "../entity/User";
import debug from "debug";

const log = debug('application:userrepository');

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
  async setLastOnline(id: string): Promise<User> {
    const user = await this.findByID(id);
    user.lastOnline = new Date();
    this.save(user);
    return user;
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
  async bulkInsertOrUpdate(users: User[]): Promise<User[]> {
    return await this.save(users);
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
        conflict_target: 'PK_cace4a159ff9f2512dd42373760',
      })
      .into(User)
      .values(user)
      .execute();
  }
}
