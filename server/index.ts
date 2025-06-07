import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyJWT from "@fastify/jwt";
import jwt from "jsonwebtoken";
import mqtt from "mqtt";
import { findUserById } from "./utils/auth/helper.js";
import authRoutes from "./routes/auth.js";

const fastify = Fastify({ logger: true });
await fastify.register(fastifyWebsocket);
await fastify.register(fastifyJWT, {
  secret: process.env.JWT_SECRET,
});

const mqttClient = mqtt.connect("mqtt://emqx:1883");
const topic = "chat/global";

const sockets = new Set<import("ws").WebSocket>();

mqttClient.on("connect", () => {
  fastify.log.info("Connected to EMQX");
  mqttClient.subscribe(topic);
});

mqttClient.on("message", (topic, message) => {
  fastify.log.info(`Topic: ${topic}`);

  const text = message.toString();
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) {
      socket.send(text);
    }
  }
});

const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const token = request.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return reply.status(401).send({ error: "Missing token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    const user = findUserById(decoded.id);

    if (!user) {
      return reply.status(401).send({ error: "User not found" });
    }

    request.user = { id: user.id, email: user.email };
  } catch (error) {
    return reply.status(401).send({ error: "Token invalid" });
  }
};

fastify.register(authRoutes, { prefix: "/api/auth" });

fastify.get("/chat", { websocket: true }, (socket, req) => {
  sockets.add(socket);

  socket.on("message", (msg) => {
    fastify.log.info(`Msg from client: ${msg}`);
    const message = JSON.parse(msg.toString());
    mqttClient.publish(topic, JSON.stringify(message));
  });

  socket.on("close", () => {
    sockets.delete(socket);
  });
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
