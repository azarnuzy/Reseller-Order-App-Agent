import { prisma } from "../../prisma";
import type { UpdateProfileInput } from "./schema";
import type { ProfileResponse } from "./types";

const profileSelect = {
  createdAt: true,
  email: true,
  id: true,
  image: true,
  name: true,
  updatedAt: true,
} as const;

export async function getProfile(userId: string): Promise<ProfileResponse> {
  return {
    user: await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: profileSelect,
    }),
  };
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<ProfileResponse> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.image !== undefined ? { image: input.image } : {}),
      name: input.name,
    },
    select: profileSelect,
  });

  return { user };
}
