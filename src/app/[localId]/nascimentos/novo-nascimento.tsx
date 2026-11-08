"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, ArrowRight, MapPin, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { TabelaResumo, contar } from "@/components/tabela-resumo";
import { cn } from "@/lib/utils";
import { registrarNascimentos, type ItemNascimento } from "@/lib/actions/nascimentos";
import { CampoRaca } from "../animais/campo-raca";
import type { OpcaoRaca } from "../animais/page";
import { SeletorAnimalParente } from "../reproducao/externos/seletor-animal-parente";
import type { CandidatoGenealogia } from "../reproducao/externos/page";
import { formatarData, formatarKg, identificacaoNascido } from "./historico-nascimentos";
import type {
  AcasalamentoDisponivel,
  AtivoResumo,
  CategoriaNascimento,
  CicloAtivo,
  Especie,
  Nascido,
  OpcaoArea,
} from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];
const rotulosSexo: Record<string, string> = { macho: "Macho", femea: "Fêmea", desconhecido: "Indefinido" };
const grausSangue = ["PO", "PC", "1/4", "1/2", "SR", "Desconhecido"];

// Duração média da gestação por espécie — só pra sugerir de qual
// acasalamento o terneiro veio (data do acasalamento + gestação ≈ nascimento).
const diasGestacao: Record<Especie, number> = { bovino: 283, ovino: 150, equino: 340 };
// Até quantos dias de diferença da data prevista ainda vale sugerir.
const FOLGA_SUGESTAO = 45;

const rotulosMetodo: Record<string, string> = {
  monta_natural: "Monta natural",
  inseminacao_artificial: "IA",
  te_fiv: "Embrião (TE/FIV)",
};
const rotulosDiagnostico: Record<string, string> = { prenha: "prenha", vazia: "vazia", inconclusivo: "inconclusivo" };

// "Somente a mãe": nascimento ligado à mãe, sem acasalamento.
const SO_MAE = "so-mae";

function somarDias(data: string, dias: number) {
  const d = new Date(data + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function diferencaDias(a: string, b: string) {
  return Math.round((new Date(a + "T00:00:00").getTime() - new Date(b + "T00:00:00").getTime()) / 86_400_000);
}

// Janela de quando o acasalamento pode ter acontecido: um dia só (monta com
// touro, IA, embrião) ou o período do lote RM, onde vale qualquer dia entre
// os touros serem soltos e retirados (sem retirada = até hoje).
function janelaAcasalamento(c: AcasalamentoDisponivel): { de: string; ate: string } | null {
  const hoje = new Date().toISOString().slice(0, 10);
  if (c.rm_lote_inicio) return { de: c.rm_lote_inicio, ate: c.rm_lote_fim ?? hoje };
  // Monta natural com touro: o período do evento (touro solto → retirado).
  if (c.metodo === "monta_natural" && c.evento_inicio) return { de: c.evento_inicio, ate: c.evento_fim ?? hoje };
  return c.data ? { de: c.data, ate: c.data } : null;
}

// O que o terneiro herda do acasalamento, pra mostrar na tela.
function genealogiaDoAcasalamento(c: AcasalamentoDisponivel, maeEscolhida: string) {
  const pai = c.touro ?? (c.rm_lote_nome ? `Lote RM ${c.rm_lote_nome}` : null);
  return c.receptora_id
    ? { mae: c.femea, pai, receptora: maeEscolhida }
    : { mae: maeEscolhida, pai, receptora: null };
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function numero(texto: string): number | null {
  const n = Number(texto.replace(",", "."));
  return texto.trim() && Number.isFinite(n) && n > 0 ? n : null;
}

type Parente = { id: string; resumo: string } | null;

// Um item da lista da direita: o que vai pro servidor + os textos de tela.
type ItemLista = {
  chave: number;
  dados: ItemNascimento;
  especie: Especie;
  areaNome: string;
  categoriaDescricao: string;
  sexo: string;
  racaDescricao: string;
  mae: string | null;
  pai: string | null;
  receptora: string | null;
};

function CampoParente({
  rotulo,
  valor,
  onBuscar,
  onLimpar,
}: {
  rotulo: string;
  valor: Parente;
  onBuscar: () => void;
  onLimpar: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{rotulo}</Label>
      <div className="flex items-center gap-1">
        <Button type="button" variant="outline" className="min-w-0 flex-1 justify-start" onClick={onBuscar}>
          <Search className="size-4 shrink-0" />
          <span className="truncate">{valor?.resumo ?? "Selecionar..."}</span>
        </Button>
        {valor && (
          <Button type="button" variant="ghost" size="icon" className="size-8" title="Remover" onClick={onLimpar}>
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function NovoNascimento({
  localId,
  areas,
  categorias,
  racas,
  candidatos,
  nascidos,
  ativos,
  acasalamentos,
  ciclo,
}: {
  localId: string;
  areas: OpcaoArea[];
  categorias: CategoriaNascimento[];
  racas: OpcaoRaca[];
  candidatos: CandidatoGenealogia[];
  nascidos: Nascido[];
  ativos: AtivoResumo[];
  acasalamentos: AcasalamentoDisponivel[];
  ciclo: CicloAtivo;
}) {
  const racaPadrao = racas.find((r) => r.padrao)?.id ?? "";
  const [aberta, setAberta] = useState(false);

  const [areaId, setAreaId] = useState("");
  const [especie, setEspecie] = useState<Especie>("bovino");
  const [tipo, setTipo] = useState<"individual" | "lote">("individual");

  // Campos comuns
  const [data, setData] = useState(hojeISO);
  const [categoriaId, setCategoriaId] = useState("");
  const [racasLocais, setRacasLocais] = useState(racas);
  const [racaId, setRacaId] = useState(racaPadrao);
  // Muda a key do CampoRaca pra ele reiniciar o texto quando a raça é resetada por fora.
  const [versaoRaca, setVersaoRaca] = useState(0);
  const [grauSangue, setGrauSangue] = useState("Desconhecido");
  const [valor, setValor] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Só individual
  const [brinco, setBrinco] = useState("");
  const [tatuagem, setTatuagem] = useState("");
  const [nome, setNome] = useState("");
  const [peso, setPeso] = useState("");
  const [mae, setMae] = useState<Parente>(null);
  const [pai, setPai] = useState<Parente>(null);
  const [embriao, setEmbriao] = useState(false);
  const [receptora, setReceptora] = useState<Parente>(null);
  const [castrado, setCastrado] = useState(false);
  const [registroProvisorio, setRegistroProvisorio] = useState("");
  const [registroDefinitivo, setRegistroDefinitivo] = useState("");
  const [seletor, setSeletor] = useState<"mae" | "pai" | "receptora" | "maeArea" | null>(null);
  // Individual com acasalamento: a mãe sai da área escolhida e o terneiro
  // herda a genealogia do acasalamento escolhido. Sem acasalamento: pai/mãe
  // informados à mão.
  const [vinculo, setVinculo] = useState<"acasalamento" | "livre">("acasalamento");
  const [maeArea, setMaeArea] = useState<Parente>(null);
  // "" = ainda não escolheu → vale o sugerido (ou "somente a mãe" se não houver).
  const [escolhaAcasalamento, setEscolhaAcasalamento] = useState("");

  // Só lote
  const [quantidade, setQuantidade] = useState("1");

  const [itens, setItens] = useState<ItemLista[]>([]);
  const [proximaChave, setProximaChave] = useState(1);
  const [erroForm, setErroForm] = useState<string | undefined>();
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const area = areas.find((a) => a.id === areaId);
  const categoriasDaEspecie = categorias.filter((c) => c.especie === especie);
  const categoria = categorias.find((c) => c.id === categoriaId);
  const exigeRegistro = grauSangue !== "SR" && grauSangue !== "Desconhecido";
  const candidatosDaEspecie = useMemo(() => candidatos.filter((c) => c.especie === especie), [candidatos, especie]);
  const totalNaLista = itens.reduce((s, i) => s + i.dados.quantidade, 0);

  // Card da área: nascidos no período (ciclo ativo ou últimos 12 meses) +
  // resumo por categoria do rebanho que está lá hoje.
  const inicioPeriodo = useMemo(() => {
    if (ciclo) return ciclo.data_inicio;
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  }, [ciclo]);
  const nascidosDaArea = useMemo(
    () =>
      nascidos
        .filter((n) => n.area_id === areaId && n.especie === especie)
        .filter((n) => !!n.data_nascimento && n.data_nascimento >= inicioPeriodo)
        .sort((a, b) => (b.data_nascimento ?? "").localeCompare(a.data_nascimento ?? "")),
    [nascidos, areaId, especie, inicioPeriodo],
  );
  const resumoArea = useMemo(
    () => contar(ativos.filter((a) => a.area_id === areaId && a.especie === especie).map((a) => a.categoria_descricao)),
    [ativos, areaId, especie],
  );
  const itensDaArea = itens.filter((i) => i.dados.areaId === areaId);

  // Mães possíveis: fêmeas da espécie que estão hoje na área escolhida.
  const maesDaArea: CandidatoGenealogia[] = useMemo(
    () =>
      ativos
        .filter((a) => a.area_id === areaId && a.especie === especie && a.sexo === "femea")
        .map((a) => ({
          id: a.id,
          nome: a.nome,
          brinco: a.brinco,
          tatuagem: a.tatuagem,
          sexo: a.sexo,
          especie: a.especie,
          raca_descricao: a.categoria_descricao,
          castrado: false,
          externo: false,
        })),
    [ativos, areaId, especie],
  );

  // Acasalamentos da mãe escolhida: os dela mesma (monta/IA) e os em que ela
  // é a receptora de um embrião — dá pra escolher entre um e outro.
  const acasalamentosDaMae = useMemo(
    () =>
      maeArea
        ? acasalamentos.filter((c) =>
            c.receptora_id ? c.receptora_id === maeArea.id : c.femea_id === maeArea.id,
          )
        : [],
    [acasalamentos, maeArea],
  );

  // Sugerido: o acasalamento cuja data + gestação cai mais perto da data de
  // nascimento informada (dentro da folga), preferindo diagnóstico de prenha.
  const sugerido = useMemo(() => {
    if (!data) return null;
    let melhor: { c: AcasalamentoDisponivel; distancia: number } | null = null;
    for (const c of acasalamentosDaMae) {
      const janela = janelaAcasalamento(c);
      if (!janela || janela.de > data) continue;
      // Parto previsto: a janela do acasalamento deslocada pela gestação.
      // Dentro dela a distância é zero; fora, conta até a borda mais perto.
      const partoDe = somarDias(janela.de, diasGestacao[especie]);
      const partoAte = somarDias(janela.ate, diasGestacao[especie]);
      let distancia =
        data < partoDe ? diferencaDias(partoDe, data) : data > partoAte ? diferencaDias(data, partoAte) : 0;
      if (distancia > FOLGA_SUGESTAO) continue;
      if (c.ultimo_diagnostico_resultado === "prenha") distancia -= 10;
      if (!melhor || distancia < melhor.distancia) melhor = { c, distancia };
    }
    return melhor?.c ?? null;
  }, [acasalamentosDaMae, data, especie]);

  const acasalamentoEfetivo = escolhaAcasalamento || sugerido?.id || SO_MAE;
  const coberturaEscolhida =
    acasalamentoEfetivo === SO_MAE ? null : (acasalamentosDaMae.find((c) => c.id === acasalamentoEfetivo) ?? null);

  function trocarEspecie(nova: Especie) {
    setEspecie(nova);
    setCategoriaId("");
    setMae(null);
    setPai(null);
    setReceptora(null);
    setMaeArea(null);
    setEscolhaAcasalamento("");
  }

  function trocarArea(nova: string) {
    setAreaId(nova);
    // A mãe com acasalamento tem que estar na área — trocou a área, escolhe de novo.
    setMaeArea(null);
    setEscolhaAcasalamento("");
  }

  function limparIndividuais() {
    setBrinco("");
    setTatuagem("");
    setNome("");
    setPeso("");
    setMae(null);
    setPai(null);
    setEmbriao(false);
    setReceptora(null);
    setCastrado(false);
    setRegistroProvisorio("");
    setRegistroDefinitivo("");
    setObservacoes("");
    setQuantidade("1");
    setMaeArea(null);
    setEscolhaAcasalamento("");
  }

  function adicionar() {
    setErroForm(undefined);
    if (!area) return setErroForm("Selecione a área.");
    if (!categoria) return setErroForm("Selecione a categoria.");
    if (!racaId) return setErroForm("Selecione a raça.");
    if (!data) return setErroForm("Informe a data de nascimento.");

    const qtd = tipo === "lote" ? Number(quantidade) : 1;
    if (!Number.isInteger(qtd) || qtd < 1) return setErroForm("Informe uma quantidade válida.");
    const comAcasalamento = tipo === "individual" && vinculo === "acasalamento";
    if (comAcasalamento && !maeArea) return setErroForm("Selecione a mãe.");
    if (!comAcasalamento && embriao && !receptora) return setErroForm("Selecione a receptora do embrião.");
    const genealogia =
      comAcasalamento && maeArea
        ? coberturaEscolhida
          ? genealogiaDoAcasalamento(coberturaEscolhida, maeArea.resumo)
          : { mae: maeArea.resumo, pai: null, receptora: null }
        : null;

    const brincoNormal = brinco.trim().toUpperCase();
    if (tipo === "individual" && brincoNormal) {
      const repetidoNaLista = itens.some((i) => i.dados.brinco?.toUpperCase() === brincoNormal);
      const repetidoNoRebanho = candidatos.some(
        (c) => !c.externo && c.especie === especie && c.brinco?.toUpperCase() === brincoNormal,
      );
      if (repetidoNaLista || repetidoNoRebanho) {
        return setErroForm(`Já existe um animal com o brinco ${brincoNormal}${repetidoNaLista ? " na lista" : ""}.`);
      }
    }

    const individual = tipo === "individual";
    const dados: ItemNascimento = {
      tipo,
      quantidade: qtd,
      areaId: area.id,
      categoriaId: categoria.id,
      racaId,
      grauSangue,
      dataNascimento: data,
      observacoes: observacoes.trim() || null,
      valor: numero(valor),
      ...(individual && {
        nome: nome.trim() || null,
        brinco: brincoNormal || null,
        tatuagem: tatuagem.trim() || null,
        pesoNascimento: numero(peso),
        coberturaId: comAcasalamento ? (coberturaEscolhida?.id ?? null) : null,
        maeId: comAcasalamento ? (coberturaEscolhida ? null : (maeArea?.id ?? null)) : (mae?.id ?? null),
        paiId: comAcasalamento ? null : (pai?.id ?? null),
        receptoraId: comAcasalamento ? null : embriao ? (receptora?.id ?? null) : null,
        castrado: categoria.sexo === "macho" && castrado,
        registroProvisorio: exigeRegistro ? registroProvisorio.trim() || null : null,
        registroDefinitivo: exigeRegistro ? registroDefinitivo.trim() || null : null,
      }),
    };

    setItens((atual) => [
      ...atual,
      {
        chave: proximaChave,
        dados,
        especie,
        areaNome: area.nome,
        categoriaDescricao: categoria.descricao,
        sexo: categoria.sexo,
        racaDescricao: racasLocais.find((r) => r.id === racaId)?.descricao ?? "—",
        mae: genealogia ? genealogia.mae : individual ? (mae?.resumo ?? null) : null,
        pai: genealogia ? genealogia.pai : individual ? (pai?.resumo ?? null) : null,
        receptora: genealogia ? genealogia.receptora : individual && embriao ? (receptora?.resumo ?? null) : null,
      },
    ]);
    setProximaChave((c) => c + 1);
    // Mantém data, categoria, raça, grau de sangue e valor — costumam se
    // repetir entre os nascimentos lançados na mesma visita.
    limparIndividuais();
  }

  function remover(chave: number) {
    setItens((atual) => atual.filter((i) => i.chave !== chave));
  }

  function limparTudo() {
    limparIndividuais();
    setAreaId("");
    setTipo("individual");
    setData(hojeISO());
    setCategoriaId("");
    setRacaId(racaPadrao);
    setVersaoRaca((v) => v + 1);
    setGrauSangue("Desconhecido");
    setValor("");
    setItens([]);
    setErro(undefined);
    setErroForm(undefined);
  }

  function cancelar() {
    if (itens.length > 0 && !confirm("Descartar os nascimentos da lista?")) return;
    limparTudo();
    setAberta(false);
  }

  async function finalizar() {
    if (itens.length === 0) return;
    setEmAndamento(true);
    setErro(undefined);
    const resultado = await registrarNascimentos(
      localId,
      itens.map((i) => i.dados),
    );
    setEmAndamento(false);
    if (resultado.error) {
      setErro(resultado.error);
      return;
    }
    toast.success(`${resultado.total} nascimento(s) registrado(s).`);
    limparTudo();
    setAberta(false);
  }

  if (!aberta) {
    return (
      <div>
        <Button onClick={() => setAberta(true)}>
          <Plus className="size-4" />
          Novo nascimento
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Registrar nascimentos</h2>
        <div className="flex flex-wrap items-center gap-1">
          {especies.map((e) => (
            <button
              key={e.value}
              onClick={() => trocarEspecie(e.value)}
              // A lista é de uma espécie só.
              disabled={itens.length > 0 && e.value !== especie}
              className={cn(buttonVariants({ variant: especie === e.value ? "secondary" : "ghost", size: "sm" }))}
            >
              {e.rotulo}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={cancelar}>
            <X className="size-4" />
            Cancelar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem_minmax(0,1fr)]">
        {/* Card 1: área */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Área</CardTitle>
            <CardDescription>Onde os animais vão ser incluídos.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Select
              value={areaId}
              onValueChange={(v) => trocarArea(v ?? "")}
              items={areas.map((a) => ({ value: a.id, label: a.nome }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a área" />
              </SelectTrigger>
              <SelectContent>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!area ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                <MapPin className="size-8" />
                <p>Selecione a área pra começar.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Nascidos na área {ciclo ? `no ciclo ${ciclo.nome}` : "nos últimos 12 meses"} (
                    {nascidosDaArea.length + itensDaArea.reduce((s, i) => s + i.dados.quantidade, 0)})
                  </h3>
                  <div className="flex max-h-64 flex-col gap-1 overflow-auto rounded-lg border p-2 text-sm">
                    {itensDaArea.map((i) => (
                      <div key={`lista-${i.chave}`} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {i.dados.tipo === "lote"
                            ? `Lote · ${i.dados.quantidade} animais`
                            : identificacaoNascido({
                                nome: i.dados.nome ?? null,
                                brinco: i.dados.brinco ?? null,
                                tatuagem: i.dados.tatuagem ?? null,
                              })}{" "}
                          <span className="text-xs text-muted-foreground">· {i.categoriaDescricao}</span>
                        </span>
                        <Badge variant="secondary">Na lista</Badge>
                      </div>
                    ))}
                    {nascidosDaArea.map((n) => (
                      <div key={n.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {identificacaoNascido(n)}{" "}
                          <span className="text-xs text-muted-foreground">· {n.categoria_descricao}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatarData(n.data_nascimento)}
                        </span>
                      </div>
                    ))}
                    {nascidosDaArea.length === 0 && itensDaArea.length === 0 && (
                      <p className="py-4 text-center text-muted-foreground">Nenhum nascimento no período.</p>
                    )}
                  </div>
                </div>
                <TabelaResumo titulo="Rebanho da área por categoria" linhas={resumoArea} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Meio: dados do nascimento */}
        <div
          className={cn(
            "flex flex-col gap-3 self-start rounded-xl border bg-muted/30 p-4",
            !area && "pointer-events-none opacity-50",
          )}
        >
          <div className="grid grid-cols-2 gap-1">
            {(["individual", "lote"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={cn(buttonVariants({ variant: tipo === t ? "secondary" : "outline", size: "sm" }))}
              >
                {t === "individual" ? "Individual" : "Em lote"}
              </button>
            ))}
          </div>

          {tipo === "individual" && (
            <div className="grid grid-cols-2 gap-1">
              {(["acasalamento", "livre"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVinculo(v)}
                  className={cn(buttonVariants({ variant: vinculo === v ? "secondary" : "outline", size: "sm" }))}
                >
                  {v === "acasalamento" ? "Com acasalamento" : "Sem acasalamento"}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dataNascimento">Data de nascimento</Label>
            <Input id="dataNascimento" type="date" max={hojeISO()} value={data} onChange={(e) => setData(e.target.value)} />
          </div>

          {tipo === "individual" && vinculo === "acasalamento" && (
            <>
              <CampoParente
                rotulo={`Mãe (${maesDaArea.length} fêmea(s) na área)`}
                valor={maeArea}
                onBuscar={() => setSeletor("maeArea")}
                onLimpar={() => {
                  setMaeArea(null);
                  setEscolhaAcasalamento("");
                }}
              />
              {maeArea && (
                <div className="flex flex-col gap-1.5">
                  <Label>Acasalamento</Label>
                  <div className="flex flex-col gap-1">
                    {acasalamentosDaMae.map((c) => {
                      const g = genealogiaDoAcasalamento(c, maeArea.resumo);
                      const janela = janelaAcasalamento(c);
                      const previstoDe = janela ? somarDias(janela.de, diasGestacao[especie]) : null;
                      const previstoAte = janela ? somarDias(janela.ate, diasGestacao[especie]) : null;
                      const escolhido = acasalamentoEfetivo === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setEscolhaAcasalamento(c.id)}
                          className={cn(
                            "flex flex-col gap-0.5 rounded-md border px-2 py-1.5 text-left text-xs",
                            escolhido ? "border-primary bg-secondary text-secondary-foreground" : "bg-background hover:bg-muted",
                          )}
                        >
                          <span className="flex flex-wrap items-center gap-1 text-sm font-medium">
                            {c.receptora_id ? `Embrião: ${c.femea} × ${g.pai ?? "—"}` : `${rotulosMetodo[c.metodo] ?? c.metodo}: ${g.pai ?? "—"}`}
                            {sugerido?.id === c.id && <Badge variant="outline">Sugerido</Badge>}
                          </span>
                          <span className="text-muted-foreground">
                            {c.rm_lote_inicio
                              ? `Lote solto ${formatarData(c.rm_lote_inicio)}${c.rm_lote_fim ? ` a ${formatarData(c.rm_lote_fim)}` : " (ainda solto)"}`
                              : c.metodo === "monta_natural" && c.evento_inicio
                                ? `Touro solto ${formatarData(c.evento_inicio)}${c.evento_fim ? ` a ${formatarData(c.evento_fim)}` : " (ainda solto)"}`
                                : formatarData(c.data)}
                            {c.evento_nome ? ` · ${c.evento_nome}` : ""}
                            {c.ultimo_diagnostico_resultado
                              ? ` · ${rotulosDiagnostico[c.ultimo_diagnostico_resultado] ?? c.ultimo_diagnostico_resultado}`
                              : ""}
                          </span>
                          {previstoDe && (
                            <span className="text-muted-foreground">
                              {previstoDe === previstoAte
                                ? `Parto previsto ≈ ${formatarData(previstoDe)}`
                                : `Parto previsto entre ${formatarData(previstoDe)} e ${formatarData(previstoAte)}`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setEscolhaAcasalamento(SO_MAE)}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-left text-sm",
                        acasalamentoEfetivo === SO_MAE
                          ? "border-primary bg-secondary font-medium text-secondary-foreground"
                          : "bg-background hover:bg-muted",
                      )}
                    >
                      Informar somente a mãe
                    </button>
                  </div>
                  {acasalamentosDaMae.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Nenhum acasalamento confirmado (e ainda sem parto) pra essa fêmea.
                    </span>
                  ) : (
                    !sugerido && (
                      <span className="text-xs text-muted-foreground">
                        Nenhum acasalamento bate com a data de nascimento — escolha um ou informe só a mãe.
                      </span>
                    )
                  )}
                  {coberturaEscolhida?.receptora_id && (
                    <span className="text-xs text-muted-foreground">
                      Filho do embrião: mãe biológica {coberturaEscolhida.femea}, {maeArea.resumo} como receptora.
                    </span>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categoriaNascimento">Categoria</Label>
            <Select
              value={categoriaId}
              onValueChange={(v) => setCategoriaId(v ?? "")}
              items={categoriasDaEspecie.map((c) => ({ value: c.id, label: c.descricao }))}
            >
              <SelectTrigger id="categoriaNascimento" className="w-full">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoriasDaEspecie.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoria ? (
              <span className="text-xs text-muted-foreground">
                Sexo: {rotulosSexo[categoria.sexo]} (definido pela categoria)
              </span>
            ) : (
              categoriasDaEspecie.length === 0 && (
                <span className="text-xs text-amber-700 dark:text-amber-400">
                  Nenhuma categoria válida pra nascimento nesta espécie — cadastre em Categorias.
                </span>
              )
            )}
          </div>

          {tipo === "lote" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quantidadeNascimento">Quantidade</Label>
              <Input
                id="quantidadeNascimento"
                type="number"
                min="1"
                step="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
          ) : (
            <>
              {categoria?.sexo === "macho" && (
                <div className="flex items-center gap-2">
                  <Checkbox id="castradoNascimento" checked={castrado} onCheckedChange={(v) => setCastrado(v === true)} />
                  <Label htmlFor="castradoNascimento">Castrado ao nascer</Label>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="brincoNascimento">Brinco</Label>
                  <Input id="brincoNascimento" value={brinco} onChange={(e) => setBrinco(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pesoNascimento">Peso ao nascer (kg)</Label>
                  <Input
                    id="pesoNascimento"
                    type="number"
                    step="0.1"
                    min="0"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tatuagemNascimento">Tatuagem</Label>
                  <Input id="tatuagemNascimento" value={tatuagem} onChange={(e) => setTatuagem(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nomeNascimento">Nome</Label>
                  <Input id="nomeNascimento" value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
              </div>

              {vinculo === "livre" && (
                <>
                  <CampoParente
                    rotulo={embriao ? "Mãe biológica (doadora)" : "Mãe"}
                    valor={mae}
                    onBuscar={() => setSeletor("mae")}
                    onLimpar={() => setMae(null)}
                  />
                  <CampoParente rotulo="Pai" valor={pai} onBuscar={() => setSeletor("pai")} onLimpar={() => setPai(null)} />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="embriaoNascimento"
                      checked={embriao}
                      onCheckedChange={(v) => {
                        setEmbriao(v === true);
                        if (v !== true) setReceptora(null);
                      }}
                    />
                    <Label htmlFor="embriaoNascimento">Origem de embrião (TE/FIV)</Label>
                  </div>
                  {embriao && (
                    <CampoParente
                      rotulo="Receptora (quem gestou)"
                      valor={receptora}
                      onBuscar={() => setSeletor("receptora")}
                      onLimpar={() => setReceptora(null)}
                    />
                  )}
                </>
              )}
            </>
          )}

          <CampoRaca
            key={versaoRaca}
            htmlId="racaNascimento"
            value={racaId}
            onValueChange={setRacaId}
            racas={racasLocais}
            localId={localId}
            onCriada={(r) => setRacasLocais((atual) => [...atual, r])}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="grauSangueNascimento">Grau de sangue</Label>
            <Select
              value={grauSangue}
              onValueChange={(v) => setGrauSangue(v ?? "Desconhecido")}
              items={grausSangue.map((g) => ({ value: g, label: g }))}
            >
              <SelectTrigger id="grauSangueNascimento" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {grausSangue.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipo === "individual" && exigeRegistro && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="regProvNascimento">Registro provisório</Label>
                <Input
                  id="regProvNascimento"
                  value={registroProvisorio}
                  onChange={(e) => setRegistroProvisorio(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="regDefNascimento">Registro definitivo</Label>
                <Input
                  id="regDefNascimento"
                  value={registroDefinitivo}
                  onChange={(e) => setRegistroDefinitivo(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>{tipo === "lote" ? "Valor por animal (opcional)" : "Valor (opcional)"}</Label>
            <CampoValorReais value={valor} onChange={setValor} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obsNascimento">Observações</Label>
            <Textarea
              id="obsNascimento"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="min-h-16"
            />
          </div>

          {erroForm && <p className="text-sm text-destructive">{erroForm}</p>}

          <Button disabled={!area} onClick={adicionar}>
            Adicionar {tipo === "lote" && Number(quantidade) > 1 ? `(${quantidade})` : ""}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Card 3: lista de nascimentos */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Nascimentos a registrar</CardTitle>
            <CardDescription>
              {totalNaLista} animal(is) em {itens.length} lançamento(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itens.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                <p>Escolha a área, preencha os dados e clique em Adicionar.</p>
              </div>
            ) : (
              <div className="flex max-h-[40rem] flex-col gap-2 overflow-auto">
                {itens.map((i) => {
                  const d = i.dados;
                  const detalhes =
                    d.tipo === "lote"
                      ? [i.racaDescricao, d.grauSangue]
                      : [
                          formatarKg(d.pesoNascimento ?? null) !== "—" ? `${formatarKg(d.pesoNascimento ?? null)} ao nascer` : null,
                          i.racaDescricao,
                          d.grauSangue,
                          d.castrado ? "castrado" : null,
                        ];
                  return (
                    <div key={i.chave} className="flex gap-2 rounded-lg border p-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                        <span className="font-medium">
                          {d.tipo === "lote"
                            ? `Lote · ${d.quantidade} animais`
                            : identificacaoNascido({
                                nome: d.nome ?? null,
                                brinco: d.brinco ?? null,
                                tatuagem: d.tatuagem ?? null,
                              })}
                        </span>
                        <span className="text-muted-foreground">
                          {i.categoriaDescricao} ({rotulosSexo[i.sexo]}) · {formatarData(d.dataNascimento)} ·{" "}
                          {i.areaNome}
                        </span>
                        <span className="text-xs text-muted-foreground">{detalhes.filter(Boolean).join(" · ")}</span>
                        {d.tipo === "individual" && (i.mae || i.pai) && (
                          <span className="text-xs text-muted-foreground">
                            Mãe: {i.mae ?? "—"} · Pai: {i.pai ?? "—"}
                          </span>
                        )}
                        {i.receptora && (
                          <span className="text-xs text-muted-foreground">Embrião · receptora {i.receptora}</span>
                        )}
                        {d.observacoes && <span className="text-xs italic text-muted-foreground">{d.observacoes}</span>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-destructive"
                        title="Tirar da lista"
                        onClick={() => remover(i.chave)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button size="lg" className="h-12 text-base" disabled={itens.length === 0 || emAndamento} onClick={finalizar}>
        {emAndamento ? "Registrando..." : `Finalizar nascimentos (${totalNaLista} animais)`}
      </Button>

      <SeletorAnimalParente
        aberto={seletor === "mae"}
        titulo={embriao ? "Selecionar mãe biológica" : "Selecionar mãe"}
        sexo="femea"
        candidatos={candidatosDaEspecie}
        onSelecionar={(id, resumo) => setMae({ id, resumo })}
        onFechar={() => setSeletor(null)}
      />
      <SeletorAnimalParente
        aberto={seletor === "pai"}
        titulo="Selecionar pai"
        sexo="macho"
        candidatos={candidatosDaEspecie}
        onSelecionar={(id, resumo) => setPai({ id, resumo })}
        onFechar={() => setSeletor(null)}
      />
      <SeletorAnimalParente
        aberto={seletor === "maeArea"}
        titulo={`Mães em ${area?.nome ?? "—"}`}
        sexo="femea"
        candidatos={maesDaArea}
        onSelecionar={(id, resumo) => {
          setMaeArea({ id, resumo });
          setEscolhaAcasalamento("");
        }}
        onFechar={() => setSeletor(null)}
      />
      {/* Receptora é sempre do rebanho próprio — quem gestou está no campo. */}
      <SeletorAnimalParente
        aberto={seletor === "receptora"}
        titulo="Selecionar receptora"
        sexo="femea"
        candidatos={candidatosDaEspecie.filter((c) => !c.externo)}
        onSelecionar={(id, resumo) => setReceptora({ id, resumo })}
        onFechar={() => setSeletor(null)}
      />
    </div>
  );
}
