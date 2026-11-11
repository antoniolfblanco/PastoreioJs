// Gerador de PDF dos relatórios, no navegador. Mesmo visual dos PDFs do app
// Flutter: cabeçalho da tabela blueGrey100, linha de total blueGrey700 com
// texto branco, bloco de grupo blue50, só bordas horizontais finas e texto
// das células em 8,5pt.
//
// jsPDF e o autotable são carregados só na hora de gerar (import dinâmico),
// pra não pesar o carregamento das páginas.
//
// Sem travessão "—" nos textos: a fonte padrão do PDF não garante o glifo
// (o app achou isso na prática) — usar hífen simples.
import type { jsPDF } from "jspdf";

type Rgb = [number, number, number];

const COR_CABECALHO: Rgb = [207, 216, 220]; // blueGrey100
const COR_TOTAL: Rgb = [69, 90, 100]; // blueGrey700
const COR_GRUPO: Rgb = [227, 242, 253]; // blue50
const COR_LINHA: Rgb = [224, 224, 224]; // grey300
const COR_CINZA: Rgb = [97, 97, 97]; // grey700
export const COR_VERMELHO: Rgb = [198, 40, 40];
export const COR_VERDE: Rgb = [46, 125, 50];

const MARGEM = 24;

// Uma linha da tabela: só as células, ou com um estilo (bloco de grupo,
// linha de total no meio da tabela).
export type LinhaPdf = string[] | { celulas: string[]; estilo: "grupo" | "total" };

export type OpcoesTabela = {
  cabecalho?: string[];
  linhas: LinhaPdf[];
  // Linhas de total no fim (fundo escuro, texto branco).
  rodape?: string[][];
  // Larguras relativas das colunas (como FlexColumnWidth no Flutter).
  larguras?: number[];
  // Índices das colunas alinhadas à direita (números).
  direita?: number[];
  // Colunas em negrito no corpo (ex.: rótulos de uma tabela chave-valor).
  negrito?: number[];
  x?: number;
  largura?: number;
  tamanhoFonte?: number;
};

type AutoTable = (doc: jsPDF, opcoes: Record<string, unknown>) => void;

// Texto de PDF: o Intl põe espaço não separável no "R$ 1,00", que a fonte
// padrão às vezes desenha torto, e o travessão some — normaliza os dois.
export function textoPdf(t: string) {
  return t.replace(/ | /g, " ").replace(/[—–]/g, "-");
}

export class RelatorioPdf {
  y = MARGEM;

  private constructor(
    readonly doc: jsPDF,
    private readonly autoTable: AutoTable,
  ) {}

  static async criar(orientacao: "retrato" | "paisagem") {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ orientation: orientacao === "paisagem" ? "landscape" : "portrait", unit: "pt", format: "a4" });
    return new RelatorioPdf(doc, autoTable as unknown as AutoTable);
  }

  get larguraUtil() {
    return this.doc.internal.pageSize.getWidth() - MARGEM * 2;
  }

  private get alturaPagina() {
    return this.doc.internal.pageSize.getHeight();
  }

  // Quebra a página se não couber "altura" a partir do y atual.
  garantirEspaco(altura: number) {
    if (this.y + altura > this.alturaPagina - MARGEM) {
      this.doc.addPage();
      this.y = MARGEM;
    }
  }

  titulo(titulo: string, subtitulo?: string) {
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(textoPdf(titulo), MARGEM, this.y + 12);
    this.y += 18;
    if (subtitulo) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(10);
      this.doc.setTextColor(...COR_CINZA);
      const linhas = this.doc.splitTextToSize(textoPdf(subtitulo), this.larguraUtil) as string[];
      this.doc.text(linhas, MARGEM, this.y + 9);
      this.y += 12 * linhas.length;
    }
    this.y += 10;
  }

  secao(texto: string, tamanho = 12) {
    this.garantirEspaco(tamanho + 40);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(tamanho);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(textoPdf(texto), MARGEM, this.y + tamanho);
    this.y += tamanho + 6;
  }

  texto(texto: string, opcoes: { tamanho?: number; cor?: Rgb; negrito?: boolean; italico?: boolean } = {}) {
    const tamanho = opcoes.tamanho ?? 9;
    this.doc.setFont("helvetica", opcoes.negrito ? "bold" : opcoes.italico ? "italic" : "normal");
    this.doc.setFontSize(tamanho);
    this.doc.setTextColor(...(opcoes.cor ?? [0, 0, 0]));
    const linhas = this.doc.splitTextToSize(textoPdf(texto), this.larguraUtil) as string[];
    this.garantirEspaco(linhas.length * (tamanho + 3));
    this.doc.text(linhas, MARGEM, this.y + tamanho);
    this.y += linhas.length * (tamanho + 3) + 2;
  }

  espaco(pontos: number) {
    this.y += pontos;
  }

  tabela(opcoes: OpcoesTabela) {
    const largura = opcoes.largura ?? this.larguraUtil;
    const x = opcoes.x ?? MARGEM;
    const nColunas = (opcoes.cabecalho ?? opcoes.rodape?.[0] ?? celulas(opcoes.linhas[0]) ?? []).length;
    const pesos = opcoes.larguras ?? Array.from({ length: nColunas }, () => 1);
    const somaPesos = pesos.reduce((s, p) => s + p, 0);
    const direita = new Set(opcoes.direita ?? []);
    const negrito = new Set(opcoes.negrito ?? []);

    const columnStyles: Record<number, Record<string, unknown>> = {};
    pesos.forEach((p, i) => {
      columnStyles[i] = {
        cellWidth: (largura * p) / somaPesos,
        halign: direita.has(i) ? "right" : "left",
        ...(negrito.has(i) ? { fontStyle: "bold" } : {}),
      };
    });

    const estilos = opcoes.linhas.map((l) => (Array.isArray(l) ? null : l.estilo));
    const corpo = opcoes.linhas.map((l) => celulas(l).map(textoPdf));

    this.autoTable(this.doc, {
      startY: this.y,
      margin: { left: x, right: this.doc.internal.pageSize.getWidth() - x - largura, top: MARGEM, bottom: MARGEM },
      tableWidth: largura,
      theme: "plain",
      head: opcoes.cabecalho ? [opcoes.cabecalho.map(textoPdf)] : undefined,
      body: corpo,
      foot: opcoes.rodape?.map((l) => l.map(textoPdf)),
      showHead: "everyPage",
      showFoot: "lastPage",
      styles: {
        font: "helvetica",
        fontSize: opcoes.tamanhoFonte ?? 8.5,
        cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
        textColor: [0, 0, 0],
        overflow: "linebreak",
      },
      headStyles: { fillColor: COR_CABECALHO, fontStyle: "bold" },
      bodyStyles: { lineWidth: { bottom: 0.5 }, lineColor: COR_LINHA },
      footStyles: { fillColor: COR_TOTAL, textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles,
      didParseCell: (dados: {
        section: string;
        row: { index: number };
        column: { index: number };
        cell: { styles: Record<string, unknown> };
      }) => {
        // Cabeçalho e rodapé seguem o alinhamento das colunas de número.
        if (dados.section !== "body") {
          dados.cell.styles.halign = direita.has(dados.column.index) ? "right" : "left";
          return;
        }
        const estilo = estilos[dados.row.index];
        if (estilo === "grupo") {
          dados.cell.styles.fillColor = COR_GRUPO;
          dados.cell.styles.fontStyle = "bold";
        } else if (estilo === "total") {
          dados.cell.styles.fillColor = COR_TOTAL;
          dados.cell.styles.textColor = [255, 255, 255];
          dados.cell.styles.fontStyle = "bold";
        }
      },
    });

    const fim = (this.doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    this.y = (fim ?? this.y) + 4;
  }

  // Duas tabelas lado a lado, cada uma com seu título (ex.: mortes por
  // categoria | por causa). O y segue da mais comprida.
  ladoALado(esquerda: { titulo: string; tabela: OpcoesTabela }, direita: { titulo: string; tabela: OpcoesTabela }) {
    const vao = 24;
    const largura = (this.larguraUtil - vao) / 2;
    this.garantirEspaco(80);
    const inicio = this.y;
    const paginaInicio = this.doc.getCurrentPageInfo().pageNumber;

    const desenhar = (lado: { titulo: string; tabela: OpcoesTabela }, x: number) => {
      this.doc.setPage(paginaInicio);
      this.y = inicio;
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(10);
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(textoPdf(lado.titulo), x, this.y + 10);
      this.y += 14;
      this.tabela({ ...lado.tabela, x, largura });
      return { pagina: this.doc.getCurrentPageInfo().pageNumber, y: this.y };
    };

    const a = desenhar(esquerda, MARGEM);
    const b = desenhar(direita, MARGEM + largura + vao);
    const fim = a.pagina > b.pagina || (a.pagina === b.pagina && a.y > b.y) ? a : b;
    this.doc.setPage(fim.pagina);
    this.y = fim.y;
  }

  salvar(nomeArquivo: string) {
    this.doc.save(nomeArquivo.replace(/[\\/:*?"<>|]+/g, "-"));
  }
}

function celulas(l: LinhaPdf | undefined): string[] {
  if (!l) return [];
  return Array.isArray(l) ? l : l.celulas;
}

// Formatação compartilhada dos relatórios.
export function dataBr(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

export function reais(valor: number) {
  return textoPdf(valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
}

export function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
