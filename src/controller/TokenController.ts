import { getCustomRepository } from 'typeorm';
import {
  NextFunction, Request, Response, Router,
} from 'express';
import ControllerInterface from './ControllerInterface';
import { generate } from "../services/JWTHelpers";
import { FailureResponse, SuccessResponse } from '../dto';
import { User, ChatEvent } from '../entity';
import { ConversationRepository, ChatEventRepository, UserRepository } from '../repository';
import SocketIOServer from '../services/SocketIOServer';

export default class TokenController implements ControllerInterface {
  private userRepository: UserRepository;
  private conversationRepository: ConversationRepository;
  private eventRepository: ChatEventRepository;

  constructor(
    userRepository: UserRepository,
    conversationRepository: ConversationRepository,
    eventRepository: ChatEventRepository
  ) {
    this.userRepository = userRepository;
    this.conversationRepository = conversationRepository;
    this.eventRepository = eventRepository;
  }

  getRouter(): Router {
    const router = Router();
    router.get('/generate/:username', this.generate);
    return router;
  }

  static createInstance(): TokenController {
    return new TokenController(
      getCustomRepository(UserRepository),
      getCustomRepository(ConversationRepository),
      getCustomRepository(ChatEventRepository)
    );
  }

  generate = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const username = request.params.username;
    if (!this.isUsernameValid(username)) {
      response.status(400).send(new FailureResponse("Invalid username.", ['Invalid username.']));
      return;
    }

    // check if user already exists create one if not.
    let user = await this.userRepository.findOne({where: {username}});

    if (!user) {
      user = new User(username);
      await this.userRepository.save(user);

      const masterConversation = await this.conversationRepository.getMasterConversation();
      await masterConversation.addParticipant(user);
      const joinEvent = ChatEvent.createUserJoined(user, masterConversation);

      SocketIOServer.getInstance().emitToConversation(
        masterConversation, "new event", { event: joinEvent.toResponse() }
      );
      await this.eventRepository.save(joinEvent);
      await this.conversationRepository.save(masterConversation);
    }

    const token = await generate(user);
    response.send(new SuccessResponse("Logged in successfully.", { token }));
    next();
  };

  private isUsernameValid(username: string): boolean {
    return typeof username === "string" && username.length > 0 && (/^[a-zA-Z0-9_-]+$/g).test(username);
  }
}
