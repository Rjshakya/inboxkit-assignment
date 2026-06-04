import type { UserSettingSelect } from "@inboxkit-assignment/db/schema/settings";

export interface AppUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AppVariables = {
  user: AppUser | null;
  session: unknown | null;
  user_settings: UserSettingSelect | null;
};
