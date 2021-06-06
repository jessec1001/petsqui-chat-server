import { RestClient } from "typed-rest-client";
import debug from "debug";
import { IRequestOptions } from "typed-rest-client";
import { ObjectLiteral } from "typeorm";
import { UserResponse } from "../entity/User";
import UsersProviderInterface from "../interfaces/UsersProviderInterface";
import { Socket } from "./SocketIOServer";
const log = debug("application:wevive-api");

export interface UserResponseInterface {
  id: string;
  phone_number: string;
  public_key: string;
  name: string;
  username: string;
  avatar: string;
}

interface ApiResponseInterface {
  count: number;
  next: string;
  previous: string;
}

interface PushMesssageResponseInterface {
  success: boolean;
}

interface FollowingsResponseInterface extends ApiResponseInterface {
  results: UserResponseInterface[];
}

interface SearchResultsInterface {
  results: UserResponseInterface[];
}

export default class WeviveApi implements UsersProviderInterface {
  private static instance: WeviveApi;
  client: RestClient;

  constructor(client?: RestClient) {
    if (!client) {
      log(process.env.API_BASE_URL);
      client = new RestClient("Wevive-Chat", process.env.API_BASE_URL, null, {
        allowRedirectDowngrade: true,
      });
    }

    this.client = client;
  }

  async getSearchResults(socket: Socket, query: string, page: number): Promise<UserResponse[]> {
    try {
      if (!page || page < 1) {
        page = 1;
      }

      const response = await this.client.get<SearchResultsInterface>(
        `/api/users/search/`,
        {
          ...this.getDefaultOptions(socket.options),
          queryParameters: {
            params: {
              q: query,
              page
            },
          },
        },
      );

      return response.result.results.map(user => {
        return {
          id: user.id,
          username: user.phone_number,
          name: user.name,
          nickname: user.username,
          avatar: user.avatar,
          //color: user.color && user.color.color,
        };
      });
    } catch (err) {
      log(err);
      return [];
    }
  }

  private getDefaultOptions(options: Record<string, any>): IRequestOptions {
    return {
      acceptHeader: "application/json, text/plain, */*",
      additionalHeaders: {
        'Authorization': `Bearer ${options.token}`,
        'Accept-encoding': 'gzip, deflate, br',
        'Accept-language': 'en',
        'Content-Type': 'application/json;charset=UTF-8',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      },
    };
  }

  async authenticate(options: Record<string, any>): Promise<UserResponse|null> {
    try {
      const response = await this.client.get(
        "/api/users/me/",
        this.getDefaultOptions(options),
      );
      const parsedResponse = <UserResponseInterface>response.result;
      return {
        id: parsedResponse.id,
        username: parsedResponse.phone_number,
        avatar: parsedResponse.avatar,
        name: parsedResponse.name,
        nickname: parsedResponse.username,
        //color: parsedResponse.color && parsedResponse.color.color,
        public_key: options.public_key,
      };
    } catch (err) {
      log("ERROR",  err);
      return null;
    }
  }

  async getFollowings(socket: Socket, page: number): Promise<UserResponse[]> {
    if (!page || page < 1) {
      page = 1;
    }
    try {
      const response = await this.client.get<FollowingsResponseInterface>(
        //`/api/v1/users/${socket.userId}/followings/`,
        `/api/users/search/`,
        {
          ...this.getDefaultOptions(socket.options),
          queryParameters: {
            params: {
              page
            }
          }
        },
      );
      return response.result.results.filter(result => {
        return result && result.phone_number;
      }).map(result => {
        return {
          id: result.id,
          username: result.phone_number,
          phone_number: result.username,
          avatar: result.avatar,
          name: result.name,
          //color: user.color && user.color.color,
        };
      });
    } catch (err) {
      log(err);
      return [];
    }
  }

  async pushMessage(socket: Socket, params: Record<string,any>): Promise<boolean> {
    try {
      const response = await this.client.get<PushMesssageResponseInterface>(
        //`/api/v1/users/${socket.userId}/followings/`,
        `/api/users/pushmessage/`,
        {
          ...this.getDefaultOptions(socket.options),
          queryParameters: {
            params,
          },
        },
      );
      return response.result && response.result.success;
    } catch (err) {
      log(err);
      return false;
    }
  }

  public static getInstance(): WeviveApi {
    if (!this.instance) {
      this.instance = new WeviveApi();
    }

    return this.instance;
  }
}
