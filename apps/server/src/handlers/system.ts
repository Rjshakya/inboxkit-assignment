import { createRegistry } from "./types";

export const systemHandlers = createRegistry({
  ping: async (_ctx, _payload) => {
    // TODO: Implement ping handler
    // This should respond with a pong or keep the connection alive.
  },
});
