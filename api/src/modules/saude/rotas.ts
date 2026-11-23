// Rotas de saúde (spec 000, T011; CA1.2, CA1.3), usadas pelo monitor e pelo proxy da VPS.
// - GET /health/live: o processo está de pé. Não toca no banco e fica fora do limite de
//   requisições (o monitor chama sempre).
// - GET /health/ready: o banco responde. Conta no limite; o resultado é guardado por 2 s.
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { ErroIndisponivel } from "../../shared/erros.js";

export function registrarRotasDeSaude(app: FastifyInstance, estaPronta: () => Promise<boolean>): void {
  const rotas = app.withTypeProvider<ZodTypeProvider>();

  rotas.get(
    "/health/live",
    {
      config: { acesso: "publico", rateLimit: false },
      schema: { response: { 200: z.object({ status: z.literal("ok") }) } },
    },
    () => ({ status: "ok" as const }),
  );

  rotas.get(
    "/health/ready",
    {
      config: { acesso: "publico" },
      schema: { response: { 200: z.object({ status: z.literal("ok"), banco: z.literal("ok") }) } },
    },
    async () => {
      if (!(await estaPronta())) throw new ErroIndisponivel();
      return { status: "ok" as const, banco: "ok" as const };
    },
  );
}
