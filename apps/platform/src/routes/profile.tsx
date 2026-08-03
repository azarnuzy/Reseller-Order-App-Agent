import { createFileRoute, redirect } from "@tanstack/react-router";
import { UnauthorizedError } from "../modules/auth/auth-api";
import { meQueryOptions } from "../modules/auth/hooks/use-auth";
import { ProfilePage } from "../modules/profile/profile-page";

export const Route = createFileRoute("/profile")({
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(meQueryOptions);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw redirect({ to: "/login" });
      }

      throw error;
    }
  },
  component: ProfilePage,
});
