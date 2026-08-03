import { createFileRoute } from "@tanstack/react-router";
import { OrderChatPage } from "../modules/order-chat/order-chat-page";
import { currentUserQueryOptions } from "../modules/profile/hooks/use-profile";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    await context.queryClient.ensureQueryData(currentUserQueryOptions);
  },
  component: OrderChatPage,
});
