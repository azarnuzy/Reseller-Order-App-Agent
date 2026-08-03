import { createFileRoute } from "@tanstack/react-router";
import { currentUserQueryOptions } from "../modules/profile/hooks/use-profile";
import { ProfilePage } from "../modules/profile/profile-page";

export const Route = createFileRoute("/profile")({
  beforeLoad: async ({ context }) => {
    await context.queryClient.ensureQueryData(currentUserQueryOptions);
  },
  component: ProfilePage,
});
