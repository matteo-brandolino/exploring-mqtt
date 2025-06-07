import { FastifyInstance, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

import { loginSchema, refreshSchema, registerSchema } from "./schemas.js";
import { RegisterBody, User, LoginBody, RefreshBody } from "../@types";
import {
  findUserByEmail,
  hashPassword,
  generateTokens,
  saveRefreshToken,
  comparePassword,
  findRefreshToken,
  removeRefreshToken,
  findUserById,
  users,
} from "../utils/auth/helper.js";

function replyWithTokens(reply: FastifyReply, user: User, message: string) {
  const { accessToken, refreshToken } = generateTokens(user);
  saveRefreshToken(user.id, refreshToken);

  reply.send({
    message,
    user: { id: user.id, email: user.email },
    accessToken,
    refreshToken,
  });
}

async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: RegisterBody }>(
    "/register",
    {
      schema: registerSchema,
    },
    async (request, reply) => {
      try {
        const { email, password } = request.body;

        if (findUserByEmail(email)) {
          return reply.status(409).send({ error: "Email already exists" });
        }

        const hashedPassword = await hashPassword(password);

        const user: User = {
          id: uuidv4(),
          email,
          password: hashedPassword,
          createdAt: new Date(),
        };

        users.push(user);

        replyWithTokens(reply, user, "Registration completed successfully");
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  fastify.post<{ Body: LoginBody }>(
    "/login",
    {
      schema: loginSchema,
    },
    async (request, reply) => {
      try {
        const { email, password } = request.body;

        const user = findUserByEmail(email);
        if (!user) {
          return reply.status(401).send({ error: "User not found" });
        }

        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
          return reply.status(401).send({ error: "User not found" });
        }
        replyWithTokens(reply, user, "Login completed successfully");
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: "Errore interno del server" });
      }
    }
  );

  fastify.post<{ Body: RefreshBody }>(
    "/refresh",
    {
      schema: refreshSchema,
    },
    async (request, reply) => {
      try {
        const { refreshToken } = request.body;

        const tokenRecord = findRefreshToken(refreshToken);
        if (!tokenRecord) {
          return reply
            .status(401)
            .send({ error: "Refresh token is invalid or expired" });
        }

        try {
          jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (error) {
          removeRefreshToken(refreshToken);
          return reply.status(401).send({ error: "Refresh token is invalid" });
        }

        const user = findUserById(tokenRecord.userId);
        if (!user) {
          removeRefreshToken(refreshToken);
          return reply.status(401).send({ error: "User not found" });
        }

        removeRefreshToken(refreshToken);

        const { accessToken, refreshToken: newRefreshToken } =
          generateTokens(user);
        saveRefreshToken(user.id, newRefreshToken);

        reply.send({
          accessToken,
          refreshToken: newRefreshToken,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: "Internal Server Error" });
      }
    }
  );

  fastify.post<{ Body: RefreshBody }>(
    "/logout",
    {
      schema: refreshSchema,
    },
    async (request, reply) => {
      try {
        const { refreshToken } = request.body;

        removeRefreshToken(refreshToken);

        reply.send({ message: "Logout completed successfully" });
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: "Internal Server Error" });
      }
    }
  );
}

export default authRoutes;
