import { getCustomRepository } from "typeorm";
import debug from "debug";

import { User } from "../entity";
import { UserRepository } from "../repository";
import UsersProviderInterface from "../interfaces/UsersProviderInterface";
import SocketIOServer, { Socket } from "../services/SocketIOServer";
import { SocketHandlerInterface } from ".";
import usersProvider from "../services/UserProvider";

const log = debug("application:user-handler");

export default class SocialHandler implements SocketHandlerInterface {
  private static instance: SocialHandler;
  private server: SocketIOServer;
  private usersProvider: UsersProviderInterface;
  private userRepository: UserRepository;

  constructor(server: SocketIOServer, usersProvider: UsersProviderInterface, userRepository: UserRepository) {
    this.server = server;
    this.usersProvider = usersProvider;
    this.userRepository = userRepository;
  }

  getFollowings = (socket: Socket) => async ({ page = 1 }, fn: Function): Promise<void> => {
    try {
      const followings = await this.usersProvider.getFollowings(socket, page);
      const keys = await this.userRepository.bulkSelectKeys(followings.map(p=>p.id));
      const keysMap  = {};
      keys.map(k=>{
        keysMap[k.id] = k.public_key;
      });
      const followingsWithKeys = followings.map(p => {
        if (keysMap[p.id]) {
          p.public_key = keysMap[p.id];
        } else {
          p.public_key = "";
        }
        return p;
      });
      const users = followings.map(p => User.createFromResponse(p));
      this.userRepository.bulkInsertOrUpdate(users);
      fn({ success: true, followings: followingsWithKeys });
    } catch (err) {
      log(err);
      fn({ success: false, followings: [] });
    }
  };

  search = (socket: Socket) => async ({query, page = 1}, fn: Function): Promise<void> => {
    try {
      const results = await this.usersProvider.getSearchResults(socket, query, page);
      fn({ success: true, results });
    } catch (err) {
      log(err);
      fn({ success: false, results: [] });
    }
  };

  handle(socket: Socket): void {
    socket.on("users:get_followings", this.getFollowings(socket));
    socket.on("users:search", this.search(socket));
  }

  public static getInstance(): SocialHandler {
    if (!this.instance) {
      this.instance = new SocialHandler(
        SocketIOServer.getInstance(),
        usersProvider.getInstance(),
        getCustomRepository(UserRepository)
      );
    }

    return this.instance;
  }
}
