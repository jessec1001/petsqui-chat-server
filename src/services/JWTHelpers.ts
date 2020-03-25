import { promisify } from "util";
import { sign, verify } from "jsonwebtoken";
import debug from "debug";
import User from "../entity/User";

const SECRET = process.env.JWT_SECRET;

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
    debug("application:jwt:toPayload")(err);
  }

  return null;
}