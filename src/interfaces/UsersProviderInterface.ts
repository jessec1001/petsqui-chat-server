import { UserResponse } from "../entity/User";
import { Socket } from "../services/SocketIOServer";

export default interface UsersProviderInterface {
  authenticate(options: Array<string | number>): Promise<UserResponse>;
  getFollowings(socket: Socket, page: number): Promise<UserResponse[]>;
  getSearchResults(socket: Socket, query: string, page: number): Promise<UserResponse[]>;
  pushMessage(socket: Socket, options: Record<string, unknown>): Promise<boolean>;
}
