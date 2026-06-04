import { env } from "@inboxkit-assignment/env/web";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
});

export const signInWithGoogle = () =>
  authClient.signIn.social({
    provider: "google",
  });
