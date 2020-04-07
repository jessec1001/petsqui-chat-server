import { SocketHandlerInterface } from ".";
import SocketIOServer, { Socket } from "../services/SocketIOServer";
import PetsquiApi from "../services/PetsquiAPI";
import { UserRepository } from "../repository";
import { getCustomRepository } from "typeorm";
import { User } from "../entity";
import UsersProviderInterface from "../interfaces/UsersProviderInterface";

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
      this.server.addClient(payload.username, socket);
      fn({ success: true, user: user.toResponse() });
    } catch (err) {
      fn({ success: false, error: "Authentication failed!" });
    }
  };

  getFollowings = (socket: Socket) => async ({ page = 1 }, fn: Function): Promise<void> => {
    const followings = await this.usersProvider.getFollowings(socket, page);
    fn({ success: true, followings });
  };

  search = (socket: Socket) => async ({query, page = 1}, fn: Function): Promise<void> => {
    const results = await this.usersProvider.getSearchResults(socket, query, page);
    fn({ success: true, results });
  };

  handle(socket: Socket): void {
    socket.on("authenticate", this.authenticate(socket));
    socket.on("get_followings", this.getFollowings(socket));
    socket.on("search_users", this.search(socket));
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