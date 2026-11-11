// Cria o cliente Prisma com o adaptador pg (sem motor binário).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export type ClienteBanco = PrismaClient;

export function criarCliente(url: string): ClienteBanco {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
