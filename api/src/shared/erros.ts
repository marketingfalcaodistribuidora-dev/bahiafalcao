// Erros de domínio da API (spec 000; plano §3, "Formato de erro"). O código de máquina de cada um
// é o que vai no campo "erro" da resposta; a mensagem é para pessoas e nunca traz detalhe interno.
// A T008 completa a lista e liga cada um ao status HTTP no formato único de erro.

export abstract class ErroDeDominio extends Error {
  /** Código de máquina, ex.: "conflito". */
  abstract readonly codigo: string;

  constructor(
    mensagem: string,
    /** Erro por campo, para a tela mostrar no lugar certo. */
    readonly campos: Record<string, string> = {},
  ) {
    super(mensagem);
  }
}

/** Dado que já existe (unicidade) ou versão desatualizada: 409. */
export class ErroDeConflito extends ErroDeDominio {
  override readonly name = "ErroDeConflito";
  readonly codigo = "conflito";

  constructor(campos: Record<string, string> = {}) {
    super("Já existe um registro com estes dados.", campos);
  }
}

/** O banco não respondeu a tempo (pool sem conexão livre, banco fora do ar): 503. */
export class ErroIndisponivel extends ErroDeDominio {
  override readonly name = "ErroIndisponivel";
  readonly codigo = "indisponivel";

  constructor() {
    super("O serviço está indisponível no momento. Tente de novo em instantes.");
  }
}
