import { betterAuthConfig } from "@repo/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../../prisma";

export const auth = betterAuth({
  appName: "Reseller Order",
  baseURL: betterAuthConfig.url,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: betterAuthConfig.secret,
  trustedOrigins: betterAuthConfig.trustedOrigins,
});

export type AuthSession = typeof auth.$Infer.Session.session;
export type AuthUser = typeof auth.$Infer.Session.user;
