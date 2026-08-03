import { createPrismaMemoryStore } from "@anvia/memory-prisma";
import { prisma } from "../../prisma";

export const chatMemory = createPrismaMemoryStore(prisma);
