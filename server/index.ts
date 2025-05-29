import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import mqtt from "mqtt";

const fastify = Fastify({ logger: true });
await fastify.register(fastifyWebsocket);

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
