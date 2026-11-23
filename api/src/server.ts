// Porta de entrada do processo da API (spec 000, T011): sobe o servidor com o ambiente e
// desliga com calma ao receber SIGTERM ou SIGINT (termina o que está em andamento e fecha o
// banco; veja src/desligamento.ts). Com configuração inválida, mostra os nomes das variáveis
// e sai com código 1.
import { ErroDeConfiguracao } from "./config/env.js";
import { criarDesligamento } from "./desligamento.js";
import { iniciarServidor } from "./servidor.js";

try {
  const servidor = await iniciarServidor(process.env);
  servidor.app.log.info({ endereco: servidor.endereco }, "API no ar");

  const desligar = criarDesligamento({
    encerrar: () => servidor.encerrar(),
    sair: (codigo) => process.exit(codigo),
    log: servidor.app.log,
  });
  process.on("SIGTERM", () => void desligar("SIGTERM"));
  process.on("SIGINT", () => void desligar("SIGINT"));
} catch (erro) {
  if (erro instanceof ErroDeConfiguracao) {
    console.error(erro.message);
    process.exit(1);
  }
  throw erro;
}
