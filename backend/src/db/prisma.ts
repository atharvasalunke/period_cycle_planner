import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  adapter: process.env.DATABASE_URL,
});

export { prisma };
