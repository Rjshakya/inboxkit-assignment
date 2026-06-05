import { authClient } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";

export const useSession = () => {
  const { data, isPending } = authClient.useSession();
  const navigate = useNavigate();
  if (!isPending && !data) {
    navigate({ to: "/login" });
  }

  return data;
};
