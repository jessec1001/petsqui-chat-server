import { RestClient } from "typed-rest-client";
import debug from "debug";
import { IRequestOptions } from "typed-rest-client";
import { ObjectLiteral } from "typeorm";
import { UserResponse } from "../entity/User";
import UsersProviderInterface from "../interfaces/UsersProviderInterface";
import { Socket } from "./SocketIOServer";
const log = debug("application:petsqui-api");

export interface UserResponseInterface {
  id: string;
  url: string;
  uuid: string;
  username: string;
  date_joined: string;
  last_login: string;
  verified: boolean;

  avatar: Partial<{
      id: number;
      url: string;
      thumbnail: null;
      parent: null;
      owner: number;
      extra_kwargs: string;
      created: string;
      title: string;
      descrip: string;
      media_type: string;
      locale: string;
      site_name: string;
      thumbnails: string;
  }>;

  color: Partial<{
      id: number;
      name: string;
      color: string;
  }>;
}

interface ApiResponseInterface {
  count: number;
  next: string;
  previous: string;
}

interface FollowingsResponseInterface extends ApiResponseInterface {
  results: Array<{
    following_user: UserResponseInterface;
    following_pet: ObjectLiteral;
  }>;
}

interface SearchResultsInterface {
  user: {
    results: UserResponseInterface[];
    next: string;
    previous: string;
  };
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
        `/api/v1/search/`,
        {
          ...this.getDefaultOptions(socket.options),
          queryParameters: {
            params: {
              q: query,
              limit: 10,
              offset: (page - 1) * 10
            },
          },
        },
      );

      return response.result.user.results.map(user => {
        return {
          id: user.uuid,
          username: user.username,
          avatar: user.avatar && user.avatar.url,
          color: user.color && user.color.color,
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
      const response = await this.client.get<UserResponseInterface>(
        "/api/users/me/",
        this.getDefaultOptions(options),
      );
      return {
        id: response.result.id,
        username: response.result.username,
        avatar: response.result.avatar && response.result.avatar.url,
        color: response.result.color&& response.result.color.color,
      };
    } catch (err) {
      log(err);
      return null;
    }
  }

  async getFollowings(socket: Socket, page: number): Promise<UserResponse[]> {
    if (!page || page < 1) {
      page = 1;
    }

    try {
      const response = await this.client.get<FollowingsResponseInterface>(
        `/api/v1/users/${socket.userId}/followings/`,
        {
          ...this.getDefaultOptions(socket.options),
          queryParameters: {
            params: {
              limit: 10,
              offset: (page - 1) * 10,
            }
          }
        },
      );

      return response.result.results.filter(result => {
        return result && result.following_user && result.following_user.username;
      }).map(result => {
        const user = result.following_user;

        return {
          id: user.uuid,
          username: user.username,
          avatar: user.avatar && user.avatar.url,
          color: user.color && user.color.color,
        };
      });
    } catch (err) {
      log(err);
      return [];
    }
  }

  public static getInstance(): WeviveApi {
    if (!this.instance) {
      this.instance = new WeviveApi();
    }

    return this.instance;
  }
}
