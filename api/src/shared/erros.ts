// Erros de domínio da API (spec 000; plano §3, "Formato de erro"). O código de máquina de cada um
// é o que vai no campo "erro" da resposta; a mensagem é para pessoas e nunca traz detalhe interno.
// O plugin de erros (src/plugins/erros.ts) transforma cada um na resposta com o status certo.

export abstract class ErroDeDominio extends Error {
  /** Código de máquina, ex.: "conflito". */
  abstract readonly codigo: string;
  /** Status HTTP da resposta. */
  abstract readonly status: number;

  constructor(
    mensagem: string,
    /** Erro por campo, para a tela mostrar no lugar certo. */
    readonly campos: Record<string, string> = {},
  ) {
    super(mensagem);
  }
}

/** Dados de entrada inválidos: 400. */
export class ErroDeValidacao extends ErroDeDominio {
  override readonly name = "ErroDeValidacao";
  readonly codigo = "validacao";
  readonly status = 400;

  constructor(campos: Record<string, string> = {}) {
    super("Há dados inválidos. Confira os campos marcados.", campos);
  }
}

/** Rota ou recurso que não existe: 404. */
export class ErroNaoEncontrado extends ErroDeDominio {
  override readonly name = "ErroNaoEncontrado";
  readonly codigo = "nao_encontrado";
  readonly status = 404;

  constructor() {
    super("Não encontramos o que você procura.");
  }
}

/** Dado que já existe (unicidade) ou versão desatualizada: 409. */
export class ErroDeConflito extends ErroDeDominio {
  override readonly name = "ErroDeConflito";
  readonly codigo = "conflito";
  readonly status = 409;

  constructor(campos: Record<string, string> = {}) {
    super("Já existe um registro com estes dados.", campos);
  }
}

/** Corpo da requisição acima do limite da rota: 413. */
export class ErroMuitoGrande extends ErroDeDominio {
  override readonly name = "ErroMuitoGrande";
  readonly codigo = "muito_grande";
  readonly status = 413;

  constructor() {
    super("O envio passou do tamanho permitido.");
  }
}

/** Corpo num formato que a rota não aceita (a API só aceita JSON): 415. */
export class ErroTipoNaoSuportado extends ErroDeDominio {
  override readonly name = "ErroTipoNaoSuportado";
  readonly codigo = "tipo_nao_suportado";
  readonly status = 415;

  constructor() {
    super("Formato não aceito. Envie os dados em JSON.");
  }
}

/** Requisições demais do mesmo cliente em pouco tempo: 429 (com Retry-After). */
export class ErroMuitasRequisicoes extends ErroDeDominio {
  override readonly name = "ErroMuitasRequisicoes";
  readonly codigo = "muitas_requisicoes";
  readonly status = 429;

  constructor() {
    super("Muitas requisições em pouco tempo. Aguarde um instante e tente de novo.");
  }
}

/** O banco não respondeu a tempo (pool sem conexão livre, banco fora do ar): 503. */
export class ErroIndisponivel extends ErroDeDominio {
  override readonly name = "ErroIndisponivel";
  readonly codigo = "indisponivel";
  readonly status = 503;

  constructor() {
    super("O serviço está indisponível no momento. Tente de novo em instantes.");
  }
}
