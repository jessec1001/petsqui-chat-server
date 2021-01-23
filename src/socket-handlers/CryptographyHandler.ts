import { getCustomRepository } from "typeorm";
import debug from "debug";

import { User, UserSingleUseToken } from "../entity";
import { UserRepository } from "../repository";
import SocketIOServer, { Socket } from "../services/SocketIOServer";
import { SocketHandlerInterface } from ".";

const log = debug("application:user-handler");

export default class CryptographyHandler implements SocketHandlerInterface {
  private static instance: CryptographyHandler;
  private server: SocketIOServer;
  private userRepository: UserRepository;

  constructor(server: SocketIOServer, userRepository: UserRepository) {
    this.server = server;
    this.userRepository = userRepository;
  }

  updateKey = (socket: Socket) => async ({ public_key }: {public_key: string}, fn: Function): Promise<void> => {
    try {
      const savedUser = await this.userRepository.findByID(socket.userId);
      savedUser.public_key = public_key;
      await this.userRepository.insertOrUpdate(savedUser, true);
      fn({ success: true, user: savedUser.toResponse(true) });
    } catch (err) {
      log(err);
      fn({ success: false, error: "Authentication failed!" });
    }
  };
  addOTKs = (socket: Socket) => async ({ tokens }: {tokens: Array<string>}, fn: Function): Promise<void> => {
    try {
      const user = await this.userRepository.findByID(socket.userId);
      const newTokens = tokens.map(token => {
        return UserSingleUseToken.create(user);
      });
      this.userRepository.addTokens(socket.userId, newTokens);
      fn({ success: true });
    } catch (err) {
      log(err);
      fn({ success: false, error: "Authentication failed!" });
    }
  };
  removeOTKs = (socket: Socket) => async ({ tokens }: {tokens: Array<string>}, fn: Function): Promise<void> => {
    try {
      const user = await this.userRepository.findByID(socket.userId);
      const newTokens = tokens.map(token => {
        return UserSingleUseToken.create(user);
      });
      this.userRepository.addTokens(socket.userId, newTokens);
      fn({ success: true });
    } catch (err) {
      log(err);
      fn({ success: false, error: "Authentication failed!" });
    }
  };

  handle(socket: Socket): void {
    socket.on("users:updateKey", this.updateKey(socket));
    socket.on("users:addOTKs", this.addOTKs(socket));
    socket.on("users:removeOTKs", this.removeOTKs(socket));
  }

  public static getInstance(): CryptographyHandler {
    if (!this.instance) {
      this.instance = new CryptographyHandler(
        SocketIOServer.getInstance(),
        getCustomRepository(UserRepository)
      );
    }

    return this.instance;
  }
}
