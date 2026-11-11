// Permissões do painel (plano 003, §2.2). A lista é fixa no código; o perfil guarda quais tem.
// Toda Server Action e todo Route Handler chamam exigirPermissao() na primeira linha.
import { Permissao } from "./generated/prisma/enums";

export type { Permissao };

export const TODAS_AS_PERMISSOES = Object.values(Permissao) as readonly Permissao[];

export type PerfilDeAcesso = {
  /** Perfil Administrador: tem todas as permissões por definição (CA12.6). */
  administrador: boolean;
  permissoes: readonly Permissao[];
};

export type UsuarioAutenticado = {
  id: number;
  nome: string;
  perfil: PerfilDeAcesso;
};

export class SemSessao extends Error {
  constructor() {
    super("É preciso entrar no painel.");
    this.name = "SemSessao";
  }
}

export class SemPermissao extends Error {
  constructor(readonly permissao: Permissao) {
    super("Você não tem permissão para esta ação.");
    this.name = "SemPermissao";
  }
}

export function pode(perfil: PerfilDeAcesso, permissao: Permissao): boolean {
  return perfil.administrador || perfil.permissoes.includes(permissao);
}

export function exigirPermissao<U extends UsuarioAutenticado>(usuario: U | null, permissao: Permissao): U {
  if (!usuario) throw new SemSessao();
  if (!pode(usuario.perfil, permissao)) throw new SemPermissao(permissao);
  return usuario;
}
