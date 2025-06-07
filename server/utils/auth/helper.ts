import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { RefreshToken, User } from "../../@types";

//TODO ADD POSTGRES DB - store user and refresh token
export const users: User[] = [];
const refreshTokens: RefreshToken[] = [];

// JWT Config
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateTokens = (user: User) => {
  const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(
    { id: user.id, type: "refresh" },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

export const saveRefreshToken = (userId: string, token: string) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const refreshTokenRecord: RefreshToken = {
    id: uuidv4(),
    userId,
    token,
    expiresAt,
    createdAt: new Date(),
  };

  refreshTokens.push(refreshTokenRecord);
};

export const removeRefreshToken = (token: string) => {
  const index = refreshTokens.findIndex((rt) => rt.token === token);
  if (index > -1) {
    refreshTokens.splice(index, 1);
  }
};

export const findUserByEmail = (email: string): User | undefined => {
  return users.find((user) => user.email === email);
};

export const findUserById = (id: string): User | undefined => {
  return users.find((user) => user.id === id);
};

export const findRefreshToken = (token: string): RefreshToken | undefined => {
  return refreshTokens.find(
    (rt) => rt.token === token && rt.expiresAt > new Date()
  );
};
