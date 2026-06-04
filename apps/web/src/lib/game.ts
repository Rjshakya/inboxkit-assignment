import { client } from "./api-client";

export const createGameSession = async () => {
  const res = await client.api.game.session.$post({});
  if (!res.ok) {
    throw new Error("Failed to create session");
  }
  const json = await res.json();
  return json.sessionId as string;
};
