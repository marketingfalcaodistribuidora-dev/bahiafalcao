// Desligamento ao receber SIGTERM ou SIGINT (spec 000, T011; CA1.4). Espera o servidor terminar
// o que está em andamento e fechar o banco, e sai com 0. Se falhar, sai com 1. Se passar do
// limite (uma requisição presa, uma conexão que não fecha), força a saída com 1: o gerenciador
// de processos (systemd, Docker) reinicia, em vez de a API ficar pendurada sem atender.
// Separado do server.ts, com a saída do processo injetada, para ser testado.

// Abaixo dos 10 s que o Docker (docker stop) espera antes do SIGKILL: a saída forçada e o log
// dela acontecem antes. Se o gerenciador de processos da VPS (Fase 7) der menos tempo, ajuste aqui.
const LIMITE_PADRAO_MS = 8_000;

export interface OpcoesDoDesligamento {
  /** Termina as requisições em andamento e fecha as conexões com o banco. */
  encerrar: () => Promise<void>;
  /** Sai do processo (process.exit, nos testes um espião). */
  sair: (codigo: number) => void;
  log: {
    info: (dados: object, mensagem: string) => void;
    error: (dados: object, mensagem: string) => void;
  };
  /** Tempo máximo para desligar antes de forçar a saída. */
  limiteMs?: number;
}

/** Devolve a função a chamar com o nome do sinal. Um segundo sinal não encerra de novo. */
export function criarDesligamento({
  encerrar,
  sair,
  log,
  limiteMs = LIMITE_PADRAO_MS,
}: OpcoesDoDesligamento): (sinal: string) => Promise<void> {
  let desligando: Promise<void> | undefined;
  let saiu = false;
  const sairUmaVez = (codigo: number) => {
    if (saiu) return;
    saiu = true;
    sair(codigo);
  };

  return (sinal) => {
    desligando ??= (async () => {
      log.info({ sinal }, "desligando");
      const limite = setTimeout(() => {
        log.error({ limiteMs }, "desligamento passou do limite; saída forçada");
        sairUmaVez(1);
      }, limiteMs);
      // O relógio do limite não segura o processo aberto se todo o resto já fechou.
      limite.unref();
      try {
        await encerrar();
        clearTimeout(limite);
        sairUmaVez(0);
      } catch (erro) {
        clearTimeout(limite);
        log.error({ tipo: erro instanceof Error ? erro.name : typeof erro }, "falha ao desligar");
        sairUmaVez(1);
      }
    })();
    return desligando;
  };
}
