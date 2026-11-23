// Porta de entrada do processo da API (spec 000, T011): sobe o servidor com o ambiente e
// desliga com calma ao receber SIGTERM ou SIGINT (termina o que está em andamento e fecha o
// banco). Com configuração inválida, mostra os nomes das variáveis e sai com código 1.
import { ErroDeConfiguracao } from "./config/env.js";
import { iniciarServidor } from "./servidor.js";

try {
  const servidor = await iniciarServidor(process.env);
  servidor.app.log.info({ endereco: servidor.endereco }, "API no ar");

  const desligar = (sinal: string) => {
    servidor.app.log.info({ sinal }, "desligando");
    servidor.encerrar().then(
      () => process.exit(0),
      (erro: unknown) => {
        servidor.app.log.error({ tipo: erro instanceof Error ? erro.name : typeof erro }, "falha ao desligar");
        process.exit(1);
      },
    );
  };
  process.once("SIGTERM", () => {
    desligar("SIGTERM");
  });
  process.once("SIGINT", () => {
    desligar("SIGINT");
  });
} catch (erro) {
  if (erro instanceof ErroDeConfiguracao) {
    console.error(erro.message);
    process.exit(1);
  }
  throw erro;
}
