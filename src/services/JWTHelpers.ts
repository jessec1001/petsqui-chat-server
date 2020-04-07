import { promisify } from "util";
import { sign, verify } from "jsonwebtoken";
import debug from "debug";
import User from "../entity/User";

const SECRET = process.env.JWT_SECRET || 'd21eac993eb73871b12ba4ff6fa3ce75c87f18f0f57175b8855f2358de6afb9a7b75c3c1a9ca39f3afed2c2b46df406ce4212ee1373df98d12dc3510f6e581cb';

interface PayloadInterface {
  id: string;
  username: string;
}

export async function generate(user: User): Promise<string> {
  const payload: PayloadInterface = {
    id: user.id,
    username: user.username,
  };

  return promisify(sign)(payload, SECRET) as Promise<string>;
}

export async function toPayload(token: string): Promise<PayloadInterface|null> {
  try {
    const payload = await promisify(verify)(token, SECRET) as PayloadInterface;

    return {
      id: payload.id,
      username: payload.username,
    };
  } catch (err) {
    debug("application jwt")(err);
  }

  return null;
}
