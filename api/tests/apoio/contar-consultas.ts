// Conta as consultas feitas ao banco (spec 000, CA8.3): base dos testes de N+1 das fases
// seguintes ("a lista de 24 produtos faz no máximo 3 consultas"). Soma os dois clientes.
// O banco precisa ter sido criado com registrarConsultas: true.
import type { Banco } from "../../src/shared/banco.js";

interface ClienteComEventos {
  $on(evento: "query", ouvinte: () => void): void;
}

export function contarConsultas(banco: Banco): { total(): number } {
  let total = 0;
  for (const cliente of [banco.publico, banco.administracao]) {
    (cliente as unknown as ClienteComEventos).$on("query", () => {
      total++;
    });
  }
  return { total: () => total };
}
