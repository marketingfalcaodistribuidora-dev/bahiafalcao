// URLs do banco de testes. Só aceita banco cujo nome termina em "_teste",
// para que um teste nunca apague dados de desenvolvimento ou de produção.
function exigir(nome: string): string {
  const url = process.env[nome];
  if (!url) throw new Error(`Defina ${nome} em packages/catalogo-dominio/.env (veja .env.example).`);
  const banco = new URL(url).pathname.slice(1);
  if (!banco.endsWith("_teste")) throw new Error(`${nome} aponta para "${banco}": testes só rodam em banco *_teste.`);
  return url;
}

export function urlsDeTeste() {
  return {
    migracoes: exigir("TESTE_DATABASE_URL_MIGRACOES"),
    painel: exigir("TESTE_DATABASE_URL_PAINEL"),
    publico: exigir("TESTE_DATABASE_URL_PUBLICO"),
  };
}
