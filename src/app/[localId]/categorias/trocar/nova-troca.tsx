"use client";

import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { CardSelecaoAnimais, identificacaoAnimal } from "@/components/card-selecao-animais";
import { trocarCategoria } from "@/lib/actions/trocas";
import type { AnimalTroca, Especie, OpcaoCategoria } from "./page";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatarReais(valor: string) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const rotulosSexo: Record<string, string> = { macho: "Macho", femea: "Fêmea", desconhecido: "sem sexo" };

// Cada clique em "Adicionar" vira uma troca: os animais marcados naquele
// momento indo pra categoria escolhida no card do meio. Ao finalizar, cada
// troca é gravada como um registro separado (com sua data, destino etc.).
type Troca = {
  chave: number;
  animais: AnimalTroca[];
  destinoId: string;
  destinoDescricao: string;
  data: string;
  responsavel: string;
  descricao: string;
  valorAtual: string;
};

export function NovaTroca({
  localId,
  animais,
  categorias,
}: {
  localId: string;
  animais: AnimalTroca[];
  categorias: OpcaoCategoria[];
}) {
  const [aberta, setAberta] = useState(false);

  const [especie, setEspecie] = useState<Especie>("bovino");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  // Dados da troca (card do meio)
  const [destinoId, setDestinoId] = useState("");
  const [data, setData] = useState(hojeISO);
  const [responsavel, setResponsavel] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorAtual, setValorAtual] = useState("");

  const [trocas, setTrocas] = useState<Troca[]>([]);
  const [proximaChave, setProximaChave] = useState(1);
  const [abertas, setAbertas] = useState<Set<number>>(new Set());

  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const categoriasDaEspecie = useMemo(() => categorias.filter((c) => c.especie === especie), [categorias, especie]);
  const destino = categoriasDaEspecie.find((c) => c.id === destinoId) ?? null;

  const idsNaLista = useMemo(() => new Set(trocas.flatMap((t) => t.animais.map((a) => a.id))), [trocas]);
  const totalAnimais = idsNaLista.size;
  const selecionados = useMemo(() => animais.filter((a) => marcados.has(a.id)), [animais, marcados]);
  const qtdMarcados = selecionados.length;

  // Avisos sobre os marcados × destino: quem já está nela (fica de fora) e
  // quem muda de sexo (a categoria define o sexo do animal).
  const jaNoDestino = destino ? selecionados.filter((a) => a.categoria_id === destino.id) : [];
  const mudamSexo =
    destino && destino.sexo !== "desconhecido"
      ? selecionados.filter((a) => a.categoria_id !== destino.id && a.sexo !== destino.sexo)
      : [];
  const qtdAdicionaveis = qtdMarcados - jaNoDestino.length;

  function trocarEspecie(nova: Especie) {
    setEspecie(nova);
    setMarcados(new Set());
    setDestinoId("");
  }

  function adicionar() {
    if (qtdAdicionaveis <= 0) return;
    if (!destino) return setErro("Escolha a categoria de destino.");
    if (!data) return setErro("Informe a data da troca.");
    setErro(undefined);
    setTrocas((atual) => [
      ...atual,
      {
        chave: proximaChave,
        animais: selecionados.filter((a) => a.categoria_id !== destino.id),
        destinoId: destino.id,
        destinoDescricao: destino.descricao,
        data,
        responsavel,
        descricao,
        valorAtual,
      },
    ]);
    setProximaChave((c) => c + 1);
    setMarcados(new Set());
    // Data, responsável e descrição ficam — o comum é várias trocas no mesmo
    // dia. Destino e reavaliação mudam a cada troca, então limpam.
    setDestinoId("");
    setValorAtual("");
  }

  function remover(chave: number) {
    setTrocas((atual) => atual.filter((t) => t.chave !== chave));
  }

  function alternarAberta(chave: number) {
    setAbertas((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function limparTudo() {
    setMarcados(new Set());
    setDestinoId("");
    setData(hojeISO());
    setResponsavel("");
    setDescricao("");
    setValorAtual("");
    setTrocas([]);
    setAbertas(new Set());
    setErro(undefined);
  }

  function cancelar() {
    if (trocas.length > 0 && !confirm("Descartar as trocas em andamento?")) return;
    limparTudo();
    setAberta(false);
  }

  async function finalizar() {
    if (trocas.length === 0) return;
    setEmAndamento(true);
    setErro(undefined);

    // Uma chamada por troca. Se uma falhar no meio, as que já foram gravadas
    // saem da lista e o resto fica pra tentar de novo.
    let gravadas = 0;
    for (const t of trocas) {
      const formData = new FormData();
      formData.set("localId", localId);
      formData.set("animalIds", JSON.stringify(t.animais.map((a) => a.id)));
      formData.set("categoriaDestinoId", t.destinoId);
      formData.set("data", t.data);
      formData.set("responsavel", t.responsavel);
      formData.set("descricao", t.descricao);
      formData.set("valorAtual", t.valorAtual);

      const resultado = await trocarCategoria(undefined, formData);
      if (resultado?.erro) {
        setTrocas(trocas.slice(gravadas));
        setErro((gravadas > 0 ? `${gravadas} troca(s) registrada(s), mas a seguinte falhou. ` : "") + resultado.erro);
        setEmAndamento(false);
        return;
      }
      gravadas++;
    }

    setEmAndamento(false);
    toast.success(`${totalAnimais} animal(is) trocado(s) de categoria.`);
    limparTudo();
    setAberta(false);
  }

  if (!aberta) {
    return (
      <div>
        <Button onClick={() => setAberta(true)}>
          <Plus className="size-4" />
          Nova troca de categoria
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Trocar categoria</h2>
        <Button variant="ghost" size="sm" onClick={cancelar}>
          <X className="size-4" />
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_17rem_minmax(0,1fr)]">
        <CardSelecaoAnimais
          animais={animais}
          especie={especie}
          onTrocarEspecie={trocarEspecie}
          especieTravada={trocas.length > 0}
          marcados={marcados}
          onMarcadosChange={setMarcados}
          idsIndisponiveis={idsNaLista}
          rotuloIndisponivel="Na lista"
        />

        {/* Entre os cards: dados da troca */}
        <div className="flex flex-col gap-3 self-start rounded-xl border bg-muted/30 p-4 xl:sticky xl:top-4 xl:mt-16">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destinoNovaTroca">Categoria de destino</Label>
            <Select
              value={destinoId}
              onValueChange={(v) => setDestinoId(v ?? "")}
              items={categoriasDaEspecie.map((c) => ({ value: c.id, label: c.descricao }))}
            >
              <SelectTrigger id="destinoNovaTroca" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categoriasDaEspecie.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dataNovaTroca">Data</Label>
            <Input id="dataNovaTroca" type="date" max={hojeISO()} value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="responsavelNovaTroca">Responsável</Label>
            <Input id="responsavelNovaTroca" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricaoNovaTroca">Descrição</Label>
            <Input
              id="descricaoNovaTroca"
              placeholder="Ex.: Desmame do lote de outubro"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Reavaliação por animal (opcional)</Label>
            <CampoValorReais value={valorAtual} onChange={setValorAtual} />
          </div>

          {jaNoDestino.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {jaNoDestino.length} marcado(s) já está(ão) em {destino?.descricao} e fica(m) de fora.
            </p>
          )}
          {mudamSexo.length > 0 && destino && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {mudamSexo.length} animal(is) vai(ão) passar a {rotulosSexo[destino.sexo]}, porque a categoria define o
              sexo.
            </p>
          )}

          <Button disabled={qtdAdicionaveis <= 0 || !destino} onClick={adicionar}>
            Adicionar {qtdAdicionaveis > 0 ? `(${qtdAdicionaveis})` : ""}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Trocas montadas */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Trocas a registrar</CardTitle>
            <CardDescription>
              {totalAnimais} animal(is) em {trocas.length} troca(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trocas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                <p>Marque animais à esquerda, escolha a categoria nova e clique em Adicionar.</p>
              </div>
            ) : (
              <div className="max-h-[36rem] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Troca</TableHead>
                      <TableHead className="text-right">Animais</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trocas.map((t) => {
                      const aberto = abertas.has(t.chave);
                      const origens = Array.from(new Set(t.animais.map((a) => a.categoria_descricao)));
                      const detalhes = [
                        t.descricao || null,
                        t.responsavel ? `por ${t.responsavel}` : null,
                        t.valorAtual ? `reavaliação ${formatarReais(t.valorAtual)}/animal` : null,
                      ].filter(Boolean);
                      return (
                        <Fragment key={t.chave}>
                          <TableRow className="bg-muted/30">
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => alternarAberta(t.chave)}
                                className="flex items-start gap-1 text-left"
                              >
                                {aberto ? (
                                  <ChevronDown className="mt-0.5 size-4 shrink-0" />
                                ) : (
                                  <ChevronRight className="mt-0.5 size-4 shrink-0" />
                                )}
                                <span className="flex flex-col gap-0.5">
                                  <span className="font-medium">
                                    {formatarData(t.data)} · {origens.length === 1 ? origens[0] : "Várias categorias"} →{" "}
                                    {t.destinoDescricao}
                                  </span>
                                  {detalhes.length > 0 && (
                                    <span className="text-xs text-muted-foreground">{detalhes.join(" · ")}</span>
                                  )}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{t.animais.length}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive"
                                title="Tirar da lista"
                                onClick={() => remover(t.chave)}
                              >
                                <X className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {aberto &&
                            t.animais.map((a) => (
                              <TableRow key={a.id} className="text-muted-foreground">
                                <TableCell className="pl-8">
                                  {identificacaoAnimal(a)}
                                  <span className="text-xs">
                                    {" "}
                                    · {a.categoria_descricao} · {a.area_nome}
                                  </span>
                                </TableCell>
                                <TableCell />
                                <TableCell />
                              </TableRow>
                            ))}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button size="lg" className="h-12 text-base" disabled={trocas.length === 0 || emAndamento} onClick={finalizar}>
        {emAndamento ? "Registrando..." : `Finalizar trocas (${totalAnimais} animais)`}
      </Button>
    </div>
  );
}
