import { describe, expect, it } from "vitest";
import { formatar } from "./formatar";

describe("formatar: o que é permitido", () => {
  it("transforma **texto** em negrito", () => {
    const html = formatar("Rosca **M14 x 1,5** fina");

    expect(html).toBe("<p>Rosca <strong>M14 x 1,5</strong> fina</p>");
  });

  it("transforma linhas que começam com '- ' em uma lista", () => {
    const html = formatar("- Scania 124\n- Volvo FH");

    expect(html).toBe("<ul><li>Scania 124</li><li>Volvo FH</li></ul>");
  });

  it("aceita negrito dentro de um item de lista", () => {
    const html = formatar("- **Diâmetro:** 22 mm");

    expect(html).toBe("<ul><li><strong>Diâmetro:</strong> 22 mm</li></ul>");
  });

  it("transforma linhas que começam com '## ' em subtítulo", () => {
    const html = formatar("## Linha Mercedes-Benz");

    expect(html).toBe("<h3>Linha Mercedes-Benz</h3>");
  });

  it("separa parágrafos por linha em branco e mantém quebras simples dentro do parágrafo", () => {
    const html = formatar("Primeira linha\nsegunda linha\n\nOutro parágrafo");

    expect(html).toBe("<p>Primeira linha<br>segunda linha</p><p>Outro parágrafo</p>");
  });

  it("monta um texto misto na ordem em que foi escrito", () => {
    const html = formatar("## Aplicação\n- Scania 124\n- Scania 114\nVerificar o modelo do eixo.");

    expect(html).toBe(
      "<h3>Aplicação</h3><ul><li>Scania 124</li><li>Scania 114</li></ul><p>Verificar o modelo do eixo.</p>",
    );
  });

  it("devolve texto vazio para entrada vazia ou só com espaços", () => {
    expect(formatar("")).toBe("");
    expect(formatar("  \n \n")).toBe("");
  });

  it("aceita quebras de linha do Windows", () => {
    const html = formatar("- Scania\r\n- Volvo");

    expect(html).toBe("<ul><li>Scania</li><li>Volvo</li></ul>");
  });
});

describe("formatar: todo o resto é escapado", () => {
  it("escapa tags HTML", () => {
    const html = formatar('<script>alert("x")</script>');

    expect(html).toBe("<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>");
  });

  it("escapa atributos perigosos em imagens", () => {
    const html = formatar("<img src=x onerror='roubar()'>");

    expect(html).toBe("<p>&lt;img src=x onerror=&#39;roubar()&#39;&gt;</p>");
  });

  it("não cria links a partir da sintaxe do Markdown", () => {
    const html = formatar("[clique](javascript:alert(1))");

    expect(html).toBe("<p>[clique](javascript:alert(1))</p>");
  });

  it("escapa HTML dentro do negrito, da lista e do subtítulo", () => {
    const html = formatar("## <b>t</b>\n- <i>x</i>\n**<u>y</u>**");

    expect(html).toBe(
      "<h3>&lt;b&gt;t&lt;/b&gt;</h3><ul><li>&lt;i&gt;x&lt;/i&gt;</li></ul><p><strong>&lt;u&gt;y&lt;/u&gt;</strong></p>",
    );
  });

  it("escapa o & para não formar entidades HTML", () => {
    const html = formatar("Rolamento &amp; retentor &lt;");

    expect(html).toBe("<p>Rolamento &amp;amp; retentor &amp;lt;</p>");
  });

  it("deixa ** sem par como texto", () => {
    const html = formatar("Medida **22 mm");

    expect(html).toBe("<p>Medida **22 mm</p>");
  });

  it("não aceita outros títulos, como '# ' e '### '", () => {
    const html = formatar("# Título\n### Outro");

    expect(html).toBe("<p># Título<br>### Outro</p>");
  });
});
