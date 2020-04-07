import { Socket } from "../services/SocketIOServer";

export default interface SocketHandlerInterface {
    handle(socket: Socket): void;
}
