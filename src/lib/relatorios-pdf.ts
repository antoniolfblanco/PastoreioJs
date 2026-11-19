// Os PDFs do PastoreioJS, com o mesmo conteúdo e visual dos PDFs do app
// Flutter (relatorio_movimentacoes_screen, relatorio_lotacao_areas_screen,
// relatorio_venda_pdf, relatorio_mortes_pdf) e o do Diário.
import { RelatorioPdf, COR_VERDE, COR_VERMELHO, dataBr, hojeIso, reais, type LinhaPdf } from "@/lib/pdf";
import type {
  LinhaMovimentacao,
  LotacaoArea,
  ResumoEspecie,
  TotalCategoriaLotacao,
  ValoresCiclo,
} from "@/lib/actions/relatorios";
import type { EventoDiario } from "@/lib/actions/diario";
import { rotulosTipoDiario } from "@/lib/diario-tipos";

export const rotulosEspecie = { bovino: "Bovino", ovino: "Ovino", equino: "Equino" } as const;

// Agrupa mantendo a ordem de chegada (os dados já vêm na ordem dos grupos
// cadastrados). Se ninguém tem grupo, fica tudo solto, sem linha de bloco,
// como no app; se alguns têm, os sem grupo viram o bloco "Sem grupo".
function porGrupo<T extends { grupo: string | null }>(itens: T[]): [string | null, T[]][] {
  const grupos = new Map<string | null, T[]>();
  for (const i of itens) {
    if (!grupos.has(i.grupo)) grupos.set(i.grupo, []);
    grupos.get(i.grupo)!.push(i);
  }
  const algumGrupo = Array.from(grupos.keys()).some((g) => g !== null);
  return Array.from(grupos.entries()).map(([g, lista]) => [g ?? (algumGrupo ? "Sem grupo" : null), lista]);
}

// Linhas de uma tabela de categorias com o bloco de cada grupo e o subtotal.
function linhasPorCategoria(itens: { categoria: string; grupo: string | null; total: number }[]) {
  const linhas: LinhaPdf[] = [];
  for (const [grupo, lista] of porGrupo(itens)) {
    if (grupo) linhas.push({ celulas: [grupo, String(lista.reduce((s, i) => s + i.total, 0))], estilo: "grupo" });
    for (const i of lista) linhas.push([grupo ? `   ${i.categoria}` : i.categoria, String(i.total)]);
  }
  return linhas;
}

function comSinal(v: number) {
  return `${v > 0 ? "+" : ""}${v}`;
}

// ---------------------------------------------------------------------------
// Resumo de Movimentações (paisagem)

const colunasMov: { rotulo: string; valor: (l: LinhaMovimentacao) => number; sinal?: boolean }[] = [
  { rotulo: "Est. Inicial", valor: (l) => l.estoqueInicial },
  { rotulo: "Compra", valor: (l) => l.compra },
  { rotulo: "Nascim.", valor: (l) => l.nascimento },
  { rotulo: "Transf. E.", valor: (l) => l.transferenciaEntrada },
  { rotulo: "Entr. Cat.", valor: (l) => l.entradaCategoria },
  { rotulo: "Venda", valor: (l) => l.venda },
  { rotulo: "Transf. S.", valor: (l) => l.transferenciaSaida },
  { rotulo: "Morte", valor: (l) => l.morte },
  { rotulo: "Saída Cat.", valor: (l) => l.saidaCategoria },
  { rotulo: "Consumo", valor: (l) => l.consumo },
  { rotulo: "Furto", valor: (l) => l.furto },
  { rotulo: "Acerto", valor: (l) => l.acertoContagem, sinal: true },
  { rotulo: "Est. Atual", valor: (l) => l.estoqueAtual },
];

function somas(linhas: LinhaMovimentacao[]) {
  return colunasMov.map((c) => {
    const s = linhas.reduce((t, l) => t + c.valor(l), 0);
    return c.sinal ? comSinal(s) : String(s);
  });
}

function somaValor(linhas: LinhaMovimentacao[]) {
  return reais(linhas.reduce((t, l) => t + (l.valorAtual ?? 0), 0));
}

export async function gerarPdfMovimentacoes(
  localNome: string,
  cicloNome: string,
  dataFim: string,
  especies: ResumoEspecie[],
  mostrarValores = false,
) {
  const pdf = await RelatorioPdf.criar("paisagem");
  pdf.titulo(`${localNome} - Resumo de Movimentações em ${dataBr(dataFim)}. Ciclo ${cicloNome}`);
  // O valor por categoria é o de hoje; numa data passada, avisa.
  const valorDeHoje = dataFim < hojeIso();

  for (const e of especies) {
    pdf.secao(rotulosEspecie[e.especie]);
    const extra = (itens: LinhaMovimentacao[]) => (mostrarValores ? [somaValor(itens)] : []);
    const linhas: LinhaPdf[] = [];
    for (const [grupo, itens] of porGrupo(e.linhas)) {
      if (grupo) linhas.push({ celulas: [grupo, ...somas(itens), ...extra(itens)], estilo: "grupo" });
      for (const l of itens) {
        linhas.push([
          grupo ? `   ${l.categoria}` : l.categoria,
          ...colunasMov.map((c) => (c.sinal ? comSinal(c.valor(l)) : String(c.valor(l)))),
          ...(mostrarValores ? [reais(l.valorAtual ?? 0)] : []),
        ]);
      }
    }
    pdf.tabela({
      cabecalho: [
        "Categoria",
        ...colunasMov.map((c) => c.rotulo),
        ...(mostrarValores ? [valorDeHoje ? "Valor (hoje)" : "Valor atual"] : []),
      ],
      linhas,
      rodape: [["Total", ...somas(e.linhas), ...extra(e.linhas)]],
      larguras: mostrarValores
        ? [2.6, 1.1, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 1.1, 1.9]
        : [2.8, 1.2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.2],
      direita: [...colunasMov.map((_, i) => i + 1), ...(mostrarValores ? [colunasMov.length + 1] : [])],
    });
    if (mostrarValores && valorDeHoje) {
      pdf.texto("Valor por categoria do rebanho de hoje (a data do relatório é anterior).", { tamanho: 7 });
    }
    if (mostrarValores && e.valores && temMovimentoValor(e.valores)) {
      pdf.espaco(6);
      blocoValores(pdf, e.valores);
    }
    pdf.espaco(12);
  }

  pdf.salvar(`Resumo de Movimentações - ${localNome} - ${dataFim}.pdf`);
}

function temMovimentoValor(v: ValoresCiclo) {
  return v.valorInicial !== 0 || v.valorFinal !== 0 || v.saidas !== 0 || v.entradasAdquiridas !== 0;
}

// Reconciliação de valor embaixo da tabela de cabeças: tudo que muda o
// estoque fica dentro da conta; o lucro fica fora (mede resultado).
function blocoValores(pdf: RelatorioPdf, v: ValoresCiclo) {
  const largura = 300;
  pdf.secao("Movimentação de valores", 10);
  const linhas: LinhaPdf[] = [
    ["Valor inicial do ciclo", reais(v.valorInicial)],
    ["(+) Entradas adquiridas", reais(v.entradasAdquiridas)],
    ["(+) Valorização orgânica", reais(v.valorizacaoOrganica)],
  ];
  if (v.valorizacaoOrganica !== 0) {
    linhas.push(["      nascimentos", reais(v.nascimentos)]);
    linhas.push(["      reavaliação do rebanho", reais(v.reavaliacao)]);
  }
  linhas.push(["(-) Saídas, pelo valor de estoque", "-" + reais(v.saidas)]);
  linhas.push({ celulas: ["= Valor final do rebanho", reais(v.valorFinal)], estilo: "grupo" });
  pdf.tabela({ linhas, larguras: [2.4, 1], direita: [1], largura, tamanhoFonte: 9 });
  pdf.texto(`Saldo (final - inicial): ${reais(v.saldo)}`, { negrito: true, cor: v.saldo < 0 ? COR_VERMELHO : COR_VERDE });

  pdf.espaco(6);
  pdf.secao("Resultado sobre o que saiu", 10);
  const resultado: LinhaPdf[] = [
    ["Vendas - recebido", reais(v.vendasValorRecebido)],
    ["Vendas - valor de estoque", reais(v.vendasValorEstoque)],
    // Sem preço lançado não há lucro a calcular.
    { celulas: ["Lucro sobre vendas", v.lucroVendas == null ? "sem preço lançado" : reais(v.lucroVendas)], estilo: "grupo" },
  ];
  if (v.lucroTransferencias !== 0) resultado.push(["Lucro sobre transferências", reais(v.lucroTransferencias)]);
  pdf.tabela({ linhas: resultado, larguras: [2.4, 1], direita: [1], largura, tamanhoFonte: 9 });
  if (v.vendasSemPreco > 0) pdf.texto(`${v.vendasSemPreco} venda(s) ainda sem preço lançado.`, { tamanho: 8 });
  if (Math.abs(v.diferencaNaoExplicada) >= 0.01)
    pdf.texto(`Diferença não explicada: ${reais(v.diferencaNaoExplicada)}`, { tamanho: 8, cor: COR_VERMELHO });
}

// ---------------------------------------------------------------------------
// Lotação por Área (retrato)

export async function gerarPdfLotacao(
  localNome: string,
  especies: (keyof typeof rotulosEspecie)[],
  areas: LotacaoArea[],
  totais: TotalCategoriaLotacao[] = [],
  mostrarValores = false,
) {
  const pdf = await RelatorioPdf.criar("retrato");
  const hoje = new Date().toLocaleDateString("pt-BR");
  pdf.titulo(`${localNome} - Lotação por Área em ${hoje}`, `Espécies: ${especies.map((e) => rotulosEspecie[e]).join(", ")}`);

  if (areas.length === 0) pdf.texto("Nenhuma área com animais na seleção.");

  const blocos = porGrupo(areas);
  const comGrupos = blocos.some(([g]) => g !== null);

  // Com grupos de áreas: primeiro um quadro com o total de cada grupo.
  if (comGrupos) {
    pdf.secao("Resumo por grupo de áreas", 10);
    pdf.tabela({
      cabecalho: ["Grupo", "Áreas", "Animais"],
      linhas: blocos.map(([g, lista]) => [g ?? "Sem grupo", String(lista.length), String(lista.reduce((s, a) => s + a.total, 0))]),
      rodape: [["Total", String(areas.length), String(areas.reduce((s, a) => s + a.total, 0))]],
      larguras: [3, 1, 1],
      direita: [1, 2],
      tamanhoFonte: 9,
    });
    pdf.espaco(14);
  }

  for (const [grupo, lista] of blocos) {
    if (grupo && lista.length === 1) {
      // Grupo de uma área só: o consolidado seria igual à tabela da área.
      pdf.garantirEspaco(60);
      pdf.secao(grupo, 11);
    } else if (grupo) {
      // Cabeçalho do grupo: o consolidado das áreas dele, por categoria.
      const somadas = new Map<string, { categoria: string; grupo: string | null; total: number }>();
      for (const a of lista)
        for (const i of a.itens) {
          const atual = somadas.get(i.categoria) ?? { ...i, total: 0 };
          atual.total += i.total;
          somadas.set(i.categoria, atual);
        }
      const total = lista.reduce((s, a) => s + a.total, 0);
      pdf.garantirEspaco(80);
      pdf.secao(`${grupo} - ${total} animais em ${lista.length} área(s)`, 11);
      pdf.tabela({
        linhas: [
          { celulas: [`Total do grupo ${grupo}`, String(total)], estilo: "total" },
          ...(somadas.size ? linhasPorCategoria(Array.from(somadas.values())) : [["Sem animais.", ""]]),
        ],
        larguras: [4, 1],
        direita: [1],
        tamanhoFonte: 9,
      });
      pdf.espaco(10);
    }

    for (const area of lista) {
      const linhas = linhasPorCategoria(area.itens);
      pdf.garantirEspaco(60);
      pdf.tabela({
        // A faixa da área no topo, como no app (escura, nome e total).
        linhas: [
          { celulas: [area.areaNome, String(area.total)], estilo: "total" },
          ...(linhas.length ? linhas : [["Sem animais.", ""]]),
        ],
        larguras: [4, 1],
        direita: [1],
        tamanhoFonte: 9,
      });
      pdf.espaco(12);
    }
  }

  // Fechamento: quantidade (e valor) por categoria somando todas as áreas.
  if (totais.length > 0) {
    const comValor = mostrarValores && totais.some((t) => t.valor != null);
    const linhas: LinhaPdf[] = [];
    for (const [grupo, lista] of porGrupo(totais)) {
      if (grupo) {
        const qtd = lista.reduce((s, t) => s + t.total, 0);
        const valor = lista.reduce((s, t) => s + (t.valor ?? 0), 0);
        linhas.push({ celulas: [grupo, String(qtd), ...(comValor ? [reais(valor)] : [])], estilo: "grupo" });
      }
      for (const t of lista) {
        linhas.push([
          grupo ? `   ${t.categoria}` : t.categoria,
          String(t.total),
          ...(comValor ? [reais(t.valor ?? 0)] : []),
        ]);
      }
    }
    const qtdTotal = totais.reduce((s, t) => s + t.total, 0);
    const valorTotal = totais.reduce((s, t) => s + (t.valor ?? 0), 0);
    pdf.garantirEspaco(80);
    pdf.secao("Total por categoria", 11);
    pdf.tabela({
      cabecalho: ["Categoria", "Quantidade", ...(comValor ? ["Valor total"] : [])],
      linhas,
      rodape: [["Total da propriedade", String(qtdTotal), ...(comValor ? [reais(valorTotal)] : [])]],
      larguras: comValor ? [3, 1, 1.6] : [4, 1],
      direita: comValor ? [1, 2] : [1],
      tamanhoFonte: 9,
    });
    if (comValor && qtdTotal > 0) {
      pdf.texto(`Valor médio por cabeça: ${reais(valorTotal / qtdTotal)}`, { tamanho: 8 });
    }
  }

  pdf.salvar(`Lotação por Área - ${localNome}.pdf`);
}

// ---------------------------------------------------------------------------
// Venda (retrato)

export type VendaPdf = {
  data: string;
  descricao: string | null;
  comprador: string | null;
  prazo_recebimento: string | null;
  responsavel: string | null;
  observacoes: string | null;
  animais: {
    identificacao: string;
    categoria_descricao: string;
    peso_venda: number | null;
    valor_venda_previsto: number | null;
    valor_venda_definitivo: number | null;
  }[];
};

function kg(v: number) {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
}

export async function gerarPdfVenda(localNome: string, venda: VendaPdf) {
  const pdf = await RelatorioPdf.criar("retrato");
  pdf.titulo(`${localNome} - Venda`, [venda.descricao, dataBr(venda.data)].filter(Boolean).join(" - "));

  const itens = venda.animais.map((a) => ({ ...a, valor: a.valor_venda_definitivo ?? a.valor_venda_previsto }));
  const total = itens.length;
  const comPeso = itens.filter((i) => i.peso_venda != null);
  const pesoTotal = comPeso.reduce((s, i) => s + i.peso_venda!, 0);
  const pesoMedio = comPeso.length ? pesoTotal / comPeso.length : null;
  const valorTotal = itens.reduce((s, i) => s + (i.valor ?? 0), 0);
  const valorMedio = total ? valorTotal / total : 0;

  pdf.tabela({
    linhas: [
      ["Descrição", venda.descricao ?? "-"],
      ["Comprador", venda.comprador ?? "-"],
      ["Data de carregamento", dataBr(venda.data)],
      ["Data de vencimento", venda.prazo_recebimento ? dataBr(venda.prazo_recebimento) : "-"],
      ["Responsável", venda.responsavel ?? "-"],
      ["Observações", venda.observacoes ?? "-"],
    ],
    larguras: [1.3, 2.5],
    negrito: [0],
  });

  // Por categoria: "preço" é por kg (o que se negocia), "valor" é por cabeça.
  const porCategoria = new Map<string, { qtd: number; peso: number; nPeso: number; valor: number }>();
  for (const i of itens) {
    const c = porCategoria.get(i.categoria_descricao) ?? { qtd: 0, peso: 0, nPeso: 0, valor: 0 };
    c.qtd++;
    if (i.peso_venda != null) {
      c.peso += i.peso_venda;
      c.nPeso++;
    }
    c.valor += i.valor ?? 0;
    porCategoria.set(i.categoria_descricao, c);
  }
  pdf.espaco(14);
  pdf.secao("Por categoria");
  pdf.tabela({
    cabecalho: ["Categoria", "Qtd", "Peso médio", "Preço médio (R$/kg)", "Valor médio/animal", "Valor total"],
    linhas: Array.from(porCategoria.entries())
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
      .map(([cat, c]) => [
        cat,
        String(c.qtd),
        c.nPeso ? kg(c.peso / c.nPeso) : "-",
        c.peso > 0 ? reais(c.valor / c.peso) : "-",
        reais(c.qtd ? c.valor / c.qtd : 0),
        reais(c.valor),
      ]),
    rodape: [
      [
        "Total da venda",
        String(total),
        pesoMedio != null ? kg(pesoMedio) : "-",
        pesoTotal > 0 ? reais(valorTotal / pesoTotal) : "-",
        reais(valorMedio),
        reais(valorTotal),
      ],
    ],
    larguras: [2, 1, 1.2, 1.2, 1.3, 1.4],
  });

  // Animais: quem tem a mesma categoria+peso+valor vira uma linha só (a pista
  // que sobrou de "foi lançado em lote"), com peso e valor somados.
  const grupos = new Map<string, typeof itens>();
  for (const i of itens) {
    const chave = `${i.categoria_descricao}|${i.peso_venda}|${i.valor}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(i);
  }
  const listaGrupos = Array.from(grupos.values()).sort((a, b) => {
    const c = a[0].categoria_descricao.localeCompare(b[0].categoria_descricao, "pt-BR");
    return c !== 0 ? c : (b[0].valor ?? 0) - (a[0].valor ?? 0);
  });
  pdf.espaco(14);
  pdf.secao("Animais vendidos");
  pdf.tabela({
    cabecalho: ["Identificação", "Categoria", "Peso", "Valor"],
    linhas: listaGrupos.map((g) => [
      g.length === 1 ? g[0].identificacao : `${g.length} animais`,
      g[0].categoria_descricao,
      g[0].peso_venda != null ? kg(g[0].peso_venda * g.length) : "-",
      g[0].valor != null ? reais(g[0].valor * g.length) : "-",
    ]),
    rodape: [
      ["Total", `${total} animal(is)`, pesoTotal > 0 ? kg(pesoTotal) : "-", reais(valorTotal)],
      ["Média por animal", "-", pesoMedio != null ? kg(pesoMedio) : "-", reais(valorMedio)],
    ],
    larguras: [2.2, 1.6, 1, 1.2],
  });

  pdf.salvar(`Venda - ${venda.descricao ?? "sem descrição"} - ${venda.data}.pdf`);
}

// ---------------------------------------------------------------------------
// Mortes (paisagem): os dois resumos e a listagem, no recorte da tela.

export type MortePdf = {
  data: string;
  quantidade: number;
  categoria: string;
  causa: string;
  area: string;
  responsavel: string | null;
  tratada: boolean | null;
  observacoes: string | null;
};

export async function gerarPdfMortes(
  localNome: string,
  subtitulo: string,
  mortes: MortePdf[],
  porCategoria: { rotulo: string; quantidade: number }[],
  porCausa: { rotulo: string; quantidade: number }[],
) {
  const pdf = await RelatorioPdf.criar("paisagem");
  pdf.titulo(`${localNome} - Mortes e Baixas`, subtitulo);

  const resumo = (linhas: { rotulo: string; quantidade: number }[]) => ({
    cabecalho: ["Descrição", "Qtd"],
    linhas: linhas.map((l) => [l.rotulo, String(l.quantidade)]),
    rodape: [["Total", String(linhas.reduce((s, l) => s + l.quantidade, 0))]],
    larguras: [3, 1],
    direita: [1],
  });
  pdf.ladoALado({ titulo: "Por categoria", tabela: resumo(porCategoria) }, { titulo: "Por causa", tabela: resumo(porCausa) });

  pdf.espaco(14);
  pdf.secao("Mortes registradas");
  const total = mortes.reduce((s, m) => s + m.quantidade, 0);
  pdf.tabela({
    cabecalho: ["Data", "Quantidade", "Categoria", "Causa", "Área", "Responsável", "Tratada", "Observações"],
    linhas: mortes.map((m) => [
      dataBr(m.data),
      String(m.quantidade),
      m.categoria,
      m.causa,
      m.area,
      m.responsavel ?? "-",
      m.tratada == null ? "-" : m.tratada ? "Sim" : "Não",
      m.observacoes ?? "-",
    ]),
    rodape: [["Total", String(total), "", "", "", "", "", ""]],
    larguras: [1.1, 0.9, 1.6, 1.8, 1.4, 1.3, 0.8, 2.5],
  });

  pdf.salvar(`Mortes - ${localNome}.pdf`);
}

// ---------------------------------------------------------------------------
// Diário (retrato): um bloco por dia, uma linha por evento.

export async function gerarPdfDiario(localNome: string, de: string, ate: string, filtro: string | null, eventos: EventoDiario[]) {
  const pdf = await RelatorioPdf.criar("retrato");
  pdf.titulo(
    `${localNome} - Diário da Fazenda`,
    [`De ${dataBr(de)} até ${dataBr(ate)}`, filtro].filter(Boolean).join(" - "),
  );

  if (eventos.length === 0) {
    pdf.texto("Nada registrado no período.");
  }

  const dias: { data: string; eventos: EventoDiario[] }[] = [];
  for (const e of eventos) {
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.data === e.data) ultimo.eventos.push(e);
    else dias.push({ data: e.data, eventos: [e] });
  }

  for (const dia of dias) {
    const d = new Date(dia.data + "T00:00:00");
    const extenso = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    pdf.secao(extenso.charAt(0).toUpperCase() + extenso.slice(1), 10);
    pdf.tabela({
      cabecalho: ["Evento", "Animais", "Detalhe", "Área", "Responsável / valor"],
      linhas: dia.eventos.map((e) => [
        rotulosTipoDiario[e.tipo] ?? "Registro",
        e.total_animais > 0 ? String(e.total_animais) : "-",
        [e.detalhe, e.descricao ? `"${e.descricao}"` : null].filter(Boolean).join("\n") || "-",
        e.area_detalhe ?? "-",
        [e.responsavel, e.valor != null ? reais(e.valor) : null].filter(Boolean).join("\n") || "-",
      ]),
      larguras: [1.3, 0.7, 2.8, 1.8, 1.3],
      direita: [1],
    });
    pdf.espaco(8);
  }

  pdf.salvar(`Diário - ${localNome} - ${de} a ${ate}.pdf`);
}
