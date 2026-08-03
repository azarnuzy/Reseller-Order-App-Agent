import { prisma } from "../../prisma";
import type { UpdateProfileInput } from "./schema";
import type { ProfileResponse } from "./types";

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
    select: {
      createdAt: true,
      email: true,
      emailVerified: true,
      id: true,
      image: true,
      name: true,
      updatedAt: true,
    },
  });

  return { user };
}
