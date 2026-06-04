import { client } from "./api-client";
import type { UserSettings } from "@/types/settings";

export const getUserSettings = async () => {
  const res = await client.api.user.settings.$get({});
  if (!res.ok) {
    throw new Error("Failed to fetch settings");
  }
  const json = await res.json();
  return json.settings as UserSettings | null;
};

export const updateUserSettings = async (input: { color: string }) => {
  const res = await client.api.user.settings.$post({ json: input });
  if (!res.ok) {
    throw new Error("Failed to update settings");
  }
  const json = await res.json();
  return json.settings as UserSettings;
};
