import { env } from "@inboxkit-assignment/env/web";
import { hcWithType } from "server/hc";

export const client = hcWithType(env.VITE_SERVER_URL, {
  init: { credentials: "include" },
});
