import { client } from "./api-client";

export const createGameSession = async () => {
  const res = await client.api.game.session.$post({});

  if (!res.ok) {
    throw new Error("Failed to create session");
  }
  const json = await res.json();
  return json.sessionId as string;
};

export const getGameSession = async (sessionId: string) => {
  const res = await client.api.game.session[":id"].$get({
    param: { id: sessionId },
  });

  if (!res.ok) {
    const error = await res.json();
    throw error;
  }

  return res.json();
};

export const startGameSession = async (sessionId: string) => {
  const res = await client.api.game.session[":id"].start.$post({
    param: { id: sessionId },
  });

  if (!res.ok) {
    throw new Error("Failed to start session");
  }

  return res.json();
};

export const getGameSessionPlayers = async (sessionId: string) => {
  const res = await client.api.game.session[":id"].players.$get({
    param: { id: sessionId },
  });

  if (!res.ok) {
    throw new Error("Failed to get players");
  }

  return res.json();
};
