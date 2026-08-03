import { prisma } from "./prisma";

export const anonymousUserId = "anonymous-user";

export async function ensureAnonymousUser() {
  return prisma.user.upsert({
    where: { id: anonymousUserId },
    update: {},
    create: {
      email: "anonymous@reseller.local",
      id: anonymousUserId,
      name: "Guest",
    },
  });
}
