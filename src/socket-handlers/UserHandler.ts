import { getCustomRepository } from "typeorm";
import debug from "debug";

import { User } from "../entity";
import { UserRepository } from "../repository";
import UsersProviderInterface from "../interfaces/UsersProviderInterface";
import SocketIOServer, { Socket } from "../services/SocketIOServer";
import { SocketHandlerInterface } from ".";
import usersProvider from "../services/UserProvider";

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

  authenticate = (socket: Socket) => async (options: Array<string | number>, fn: Function): Promise<void> => {
    try {
      const payload = await this.usersProvider.authenticate(options);
      const userExists = await this.userRepository.findByID(payload.id);
      let overwriteKeys = false;
      if (userExists) {
        if (!userExists.public_key) {
          overwriteKeys = true;
        }
      }
      const user = User.createFromResponse(payload);
      await this.userRepository.insertOrUpdate(user, overwriteKeys);
      //FIXME: do we need this second query?
      const savedUser = await this.userRepository.findByID(payload.id);
      socket.userId = payload.id;
      socket.user = payload;
      socket.options = options;
      this.server.addClient(payload.id, socket);
      fn({ success: true, user: savedUser.toResponse() });
    } catch (err) {
      log(err);
      fn({ success: false, error: "Authentication failed!" });
    }
  };

  handle(socket: Socket): void {
    socket.on("users:authenticate", this.authenticate(socket));
  }

  public static getInstance(): UserHandler {
    if (!this.instance) {
      this.instance = new UserHandler(
        SocketIOServer.getInstance(),
        usersProvider.getInstance(),
        getCustomRepository(UserRepository)
      );
    }

    return this.instance;
  }
}
