export type User = {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
};

export type RefreshToken = {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
};

export type LoginBody = {
  email: string;
  password: string;
};

export type RegisterBody = {
  email: string;
  password: string;
};

export type RefreshBody = {
  refreshToken: string;
};
