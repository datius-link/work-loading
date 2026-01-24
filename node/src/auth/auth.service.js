import db from "../db/index.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { generateVerifyToken, generateAuthToken } from "./auth.tokens.js";
import { v4 as uuidv4 } from "uuid";

export async function registerUser(email, password) {
  const exists = await db("provider_users").where({ email }).first();
  if (exists) throw new Error("EMAIL_EXISTS");

  const uuid = uuidv4();
  const hashed = await hashPassword(password);

  await db("provider_users").insert({
    uuid,
    email,
    password: hashed,
    is_verified: false,
  });

  return {
    uuid,
    verifyToken: generateVerifyToken(uuid),
  };
}

export async function loginUser(email, password) {
  const user = await db("provider_users").where({ email }).first();
  if (!user) throw new Error("INVALID_CREDENTIALS");

  const match = await comparePassword(password, user.password);
  if (!match) throw new Error("INVALID_CREDENTIALS");

  if (!user.is_verified) {
    return {
      requireVerification: true,
      uuid: user.uuid,
      verifyToken: generateVerifyToken(user.uuid),
    };
  }

  return {
    token: generateAuthToken(user.uuid),
  };
}
