import { RestClient } from "typed-rest-client";
import debug from "debug";
import { UserResponse } from "../entity/User";
import { IRequestOptions } from "typed-rest-client";
import { ObjectLiteral } from "typeorm";
import UsersProviderInterface from "../interfaces/UsersProviderInterface";
import { Socket } from "./SocketIOServer";
const log = debug("application:petsqui-api");

export interface UserResponseInterface {
  id: number;
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

export default class PetsquiApi implements UsersProviderInterface {
  private static instance: PetsquiApi;
  client: RestClient;

  constructor(client?: RestClient) {
    if (!client) {
      log(process.env.API_BASE_URL);
      client = new RestClient("Petsqui-Chat", process.env.API_BASE_URL, null, {
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
          ...this.getDefaultOptions(socket.token),
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

  private getDefaultOptions(token: string): IRequestOptions {
    return {
      acceptHeader: "application/json, text/plain, */*",
      additionalHeaders: {
        'Authorization': `Token ${token}`,
        'Accept-encoding': 'gzip, deflate, br',
        'Accept-language': 'en,ru;q=0.9,lt;q=0.8',
        'Content-Type': 'application/json;charset=UTF-8',
        'Origin': 'https://www.petsqui.com/',
        'Referer': 'https://www.petsqui.com/auth',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      },
    };
  }

  async authenticate(token: string): Promise<UserResponse|null> {
    try {
      const response = await this.client.get<UserResponseInterface>(
        "/api/v1/users/me/",
        this.getDefaultOptions(token),
      );

      return {
        id: response.result.uuid,
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
          ...this.getDefaultOptions(socket.token),
          queryParameters: {
            params: {
              limit: 10,
              offset: (page - 1) * 10,
            }
          }
        },
      );

      return response.result.results.map(result => {
        const user = result.following_user && result.following_user;
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

  public static getInstance(): PetsquiApi {
    if (!this.instance) {
      this.instance = new PetsquiApi();
    }

    return this.instance;
  }
}
