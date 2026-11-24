// Relógio injetado (prompt §6, "Dependências injetadas"): a regra de negócio nunca chama
// Date.now() direto; os testes passam um relógio que só anda quando eles mandam.

export interface Relogio {
  /** Agora, em milissegundos desde 1970 (como Date.now()). */
  agora(): number;
}

export const relogioDoSistema: Relogio = { agora: () => Date.now() };
