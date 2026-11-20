// PDF da genealogia de 5 gerações, no formato do certificado da raça: A4
// deitado; na 1ª coluna o animal no meio com pai em cima e mãe embaixo; nas
// seguintes avós, bisavós e trisavós (16). Quadros com faixa à esquerda
// verde-azulada (macho) ou roxa (fêmea), nome, registro e pelagem.
import type { NoGenealogia } from "@/lib/actions/genealogia";
import { RelatorioPdf, dataBr, textoPdf } from "@/lib/pdf";

type Rgb = [number, number, number];
const COR_MACHO: Rgb = [0, 105, 120];
const COR_FEMEA: Rgb = [142, 68, 173];
const COR_NEUTRA: Rgb = [158, 158, 158];
const COR_BORDA: Rgb = [176, 184, 196];
const COR_REGISTRO: Rgb = [21, 101, 192];
const COR_PELAGEM: Rgb = [150, 110, 0];
const COR_TEXTO: Rgb = [33, 33, 33];
const COR_LINHA: Rgb = [120, 130, 145];

export function nomeAnimal(n: NoGenealogia) {
  return n.nome || n.brinco || n.tatuagem || "Sem identificação";
}

// Registro mostrado no quadro: o definitivo; sem ele, o provisório; sem
// registro, o brinco/tatuagem (quando o nome é outro).
export function registroAnimal(n: NoGenealogia) {
  if (n.registro_definitivo) return n.registro_definitivo;
  if (n.registro_provisorio) return `RP ${n.registro_provisorio}`;
  const ident = [n.brinco, n.tatuagem].filter((v) => v && v !== n.nome).join(" · ");
  return ident || null;
}

function corSexo(n: NoGenealogia | null): Rgb {
  if (!n) return COR_NEUTRA;
  return n.sexo === "macho" ? COR_MACHO : n.sexo === "femea" ? COR_FEMEA : COR_NEUTRA;
}

export async function gerarPdfGenealogia(localNome: string, nos: (NoGenealogia | null)[]) {
  const pdf = await RelatorioPdf.criar("paisagem");
  const doc = pdf.doc;
  const animal = nos[0]!;
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const margem = 24;

  // Cabeçalho discreto, como no certificado.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("5ª GERAÇÃO", margem, margem + 6);
  doc.text(textoPdf(localNome), largura - margem, margem + 6, { align: "right" });
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margem, margem + 12, largura - margem, margem + 12);

  const topo = margem + 26;
  const fundo = altura - margem;
  const h = fundo - topo;

  // Colunas: [pais + animal] | avós | bisavós | trisavós.
  const vao = 18;
  const larguras = [232, 190, 178, 0];
  larguras[3] = largura - margem * 2 - larguras[0] - larguras[1] - larguras[2] - vao * 3;
  const xs = [margem + 8];
  for (let i = 1; i < 4; i++) xs.push(xs[i - 1] + larguras[i - 1] + vao);
  const alturaQuadro = [0, 44, 44, 36, 30]; // por geração (1 = pais ... 4 = trisavós)

  // Centro vertical da posição k da geração g (g >= 1).
  const centro = (g: number, k: number) => topo + ((k + 0.5) * h) / 2 ** g;
  const coluna = (g: number) => g - 1; // pais na coluna 0
  const indice = (g: number, k: number) => 2 ** g - 1 + k;

  function quadro(n: NoGenealogia | null, x: number, yCentro: number, w: number, hq: number, g: number) {
    const y = yCentro - hq / 2;
    doc.setDrawColor(...COR_BORDA);
    doc.setLineWidth(0.6);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, w, hq, 2, 2, n ? "FD" : "D");
    doc.setFillColor(...corSexo(n));
    doc.rect(x, y, 2.2, hq, "F");
    if (!n) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(170, 170, 170);
      doc.text("Não informado", x + 7, yCentro + 2.5);
      return;
    }
    const tamNome = g >= 4 ? 7 : 7.8;
    const linhas: { texto: string; fonte: "helvetica" | "courier"; estilo: string; tam: number; cor: Rgb }[] = [
      { texto: nomeAnimal(n).toUpperCase(), fonte: "helvetica", estilo: "bold", tam: tamNome, cor: COR_TEXTO },
    ];
    const reg = registroAnimal(n);
    if (reg) linhas.push({ texto: reg, fonte: "courier", estilo: "normal", tam: 6.8, cor: COR_REGISTRO });
    if (n.pelagem) linhas.push({ texto: n.pelagem, fonte: "helvetica", estilo: "normal", tam: 6.6, cor: COR_PELAGEM });
    const passo = g >= 4 ? 8 : 9.5;
    let yt = yCentro - ((linhas.length - 1) * passo) / 2 + 2.5;
    for (const l of linhas) {
      doc.setFont(l.fonte, l.estilo);
      doc.setFontSize(l.tam);
      doc.setTextColor(...l.cor);
      const cabe = (doc.splitTextToSize(textoPdf(l.texto), w - 10) as string[])[0] ?? "";
      doc.text(cabe, x + 7, yt);
      yt += passo;
    }
  }

  function chave(xLinha: number, yPai: number, yMae: number, filhos: { y: number; xAte: number }[]) {
    doc.setDrawColor(...COR_LINHA);
    doc.setLineWidth(0.5);
    doc.line(xLinha, yPai, xLinha, yMae);
    for (const f of filhos) doc.line(xLinha, f.y, f.xAte, f.y);
  }

  // Ligações de cada animal (gerações 1 a 3) com os pais na coluna seguinte.
  for (let g = 1; g <= 3; g++) {
    for (let k = 0; k < 2 ** g; k++) {
      const filho = nos[indice(g, k)];
      if (!filho) continue;
      const pai = nos[indice(g + 1, 2 * k)];
      const mae = nos[indice(g + 1, 2 * k + 1)];
      if (!pai && !mae) continue;
      const xPais = xs[coluna(g + 1)];
      const xLinha = xPais - vao / 2;
      const yPai = centro(g + 1, 2 * k);
      const yMae = centro(g + 1, 2 * k + 1);
      const yFilho = centro(g, k);
      chave(xLinha, yPai, yMae, [
        { y: yFilho, xAte: xs[coluna(g)] + larguras[coluna(g)] },
        { y: yPai, xAte: xPais },
        { y: yMae, xAte: xPais },
      ]);
    }
  }

  // Quadros das gerações 1 a 4 (31 - 1 posições).
  for (let g = 1; g <= 4; g++) {
    for (let k = 0; k < 2 ** g; k++) {
      const n = nos[indice(g, k)];
      // Ramo sem ninguém mais acima: não desenha quadro vazio solto.
      const filho = nos[indice(g - 1, Math.floor(k / 2))];
      if (!n && !filho) continue;
      quadro(n, xs[coluna(g)], centro(g, k), larguras[coluna(g)], alturaQuadro[g], g);
    }
  }

  // O animal, no meio da 1ª coluna, ligado ao pai e à mãe pela esquerda.
  const yAnimal = topo + h / 2;
  const wAnimal = larguras[0] - 18;
  const hAnimal = 92;
  const xAnimal = xs[0] - 2;
  const xLinhaAnimal = xs[0] - 8;
  doc.setDrawColor(...COR_LINHA);
  doc.setLineWidth(0.5);
  doc.line(xLinhaAnimal, centro(1, 0), xLinhaAnimal, centro(1, 1));
  doc.line(xLinhaAnimal, centro(1, 0), xs[0], centro(1, 0));
  doc.line(xLinhaAnimal, centro(1, 1), xs[0], centro(1, 1));
  doc.line(xLinhaAnimal, yAnimal, xAnimal, yAnimal);

  const yA = yAnimal - hAnimal / 2;
  doc.setDrawColor(110, 110, 110);
  doc.setLineWidth(0.8);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(xAnimal, yA, wAnimal, hAnimal, 4, 4, "FD");
  let y = yA + 14;
  const xt = xAnimal + 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COR_TEXTO);
  doc.text(animal.sexo === "macho" ? "Macho" : animal.sexo === "femea" ? "Fêmea" : "Sexo não informado", xt, y);
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text((doc.splitTextToSize(textoPdf(nomeAnimal(animal).toUpperCase()), wAnimal - 16) as string[])[0] ?? "", xt, y);
  y += 13;
  const registros = [animal.registro_definitivo, animal.registro_provisorio && `RP ${animal.registro_provisorio}`]
    .filter(Boolean)
    .join(" · ");
  if (registros) {
    doc.setFont("courier", "normal");
    doc.setFontSize(8.5);
    doc.text(textoPdf(registros), xt, y);
    y += 11;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const detalhes = [
    animal.data_nascimento && `Nasc. ${dataBr(animal.data_nascimento)}`,
    [animal.raca, animal.grau_sangue && animal.grau_sangue !== "Desconhecido" ? animal.grau_sangue : null]
      .filter(Boolean)
      .join(" "),
  ].filter(Boolean) as string[];
  for (const d of detalhes) {
    doc.text(textoPdf(d), xt, y);
    y += 10;
  }
  if (animal.pelagem) {
    const texto = textoPdf(animal.pelagem);
    doc.setFontSize(7);
    const wTexto = doc.getTextWidth(texto) + 12;
    doc.setDrawColor(110, 110, 110);
    doc.setLineWidth(0.5);
    doc.roundedRect(xt, y - 6, wTexto, 12, 6, 6, "D");
    doc.text(texto, xt + 6, y + 2.5);
  }

  pdf.salvar(`Genealogia - ${nomeAnimal(animal)}.pdf`);
}
