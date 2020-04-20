import { getCustomRepository } from "typeorm";
import debug from "debug";

import { User } from "../entity";
import { UserRepository } from "../repository";
import UsersProviderInterface from "../interfaces/UsersProviderInterface";
import SocketIOServer, { Socket } from "../services/SocketIOServer";
import { SocketHandlerInterface } from ".";
import PetsquiApi from "../services/PetsquiApi";

const log = debug("application:user-handler");

export default class UserHandler implements SocketHandlerInterface {
  private static instance: UserHandler;
  private server: SocketIOServer;
  private usersProvider: UsersProviderInterface;
  private userRepository: UserRepository;

  constructor(server: SocketIOServer, usersProvider: UsersProviderInterface, userRepository: UserRepository) {
    this.server = server;
    this.usersProvider = usersProvider;
    this.userRepository = userRepository;
  }

  authenticate = (socket: Socket) => async (token: string, fn: Function): Promise<void> => {
    try {
      const payload = await this.usersProvider.authenticate(token);
      const user = User.createFromResponse(payload);
      await this.userRepository.insertOrUpdate(user);
      socket.userId = payload.id;
      socket.user = payload;
      socket.token = token;
      this.server.addClient(payload.id, socket);
      fn({ success: true, user: user.toResponse() });
    } catch (err) {
      log(err);
      fn({ success: false, error: "Authentication failed!" });
    }
  };

  getFollowings = (socket: Socket) => async ({ page = 1 }, fn: Function): Promise<void> => {
    try {
      const followings = await this.usersProvider.getFollowings(socket, page);
      fn({ success: true, followings });
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
    socket.on("users:authenticate", this.authenticate(socket));
    socket.on("users:get_followings", this.getFollowings(socket));
    socket.on("users:search", this.search(socket));
  }

  public static getInstance(): UserHandler {
    if (!this.instance) {
      this.instance = new UserHandler(
        SocketIOServer.getInstance(),
        PetsquiApi.getInstance(),
        getCustomRepository(UserRepository)
      );
    }

    return this.instance;
  }
}
