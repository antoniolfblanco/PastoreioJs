"use client";

import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { CardSelecaoAnimais, identificacaoAnimal, type Especie } from "@/components/card-selecao-animais";
import { revalorizarAnimais } from "@/lib/actions/revalorizacao";
import type { AnimalValor } from "./page";
import { reais, valorEstoque } from "./valores";

// Cada "Adicionar" vira um lote: os animais marcados naquele momento com o
// valor novo por cabeça. Ao finalizar, todos os lotes são gravados.
type Lote = { chave: number; animais: AnimalValor[]; valorPorCabeca: number };

function somaValores(animais: AnimalValor[]) {
  let total = 0;
  let semValor = 0;
  for (const a of animais) {
    const v = valorEstoque(a);
    if (v == null) semValor++;
    else total += v;
  }
  return { total, semValor };
}

export function NovaRevalorizacao({ localId, animais }: { localId: string; animais: AnimalValor[] }) {
  const [aberta, setAberta] = useState(false);
  const [especie, setEspecie] = useState<Especie>("bovino");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [valor, setValor] = useState("");

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [proximaChave, setProximaChave] = useState(1);
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const idsNaLista = useMemo(() => new Set(lotes.flatMap((l) => l.animais.map((a) => a.id))), [lotes]);
  const selecionados = useMemo(() => animais.filter((a) => marcados.has(a.id)), [animais, marcados]);
  const atuaisSelecionados = somaValores(selecionados);
  const valorNumero = Number(valor) || 0;

  // Resumo geral da lista: valor antes (atual) × depois (novo).
  const resumoLista = useMemo(() => {
    let antes = 0;
    let depois = 0;
    let animaisNaLista = 0;
    for (const l of lotes) {
      antes += somaValores(l.animais).total;
      depois += l.valorPorCabeca * l.animais.length;
      animaisNaLista += l.animais.length;
    }
    return { antes, depois, animais: animaisNaLista };
  }, [lotes]);

  function trocarEspecie(nova: Especie) {
    setEspecie(nova);
    setMarcados(new Set());
  }

  function adicionar() {
    if (selecionados.length === 0) return;
    if (!(valorNumero > 0)) return setErro("Informe o valor novo por cabeça.");
    setErro(undefined);
    setLotes((atual) => [...atual, { chave: proximaChave, animais: selecionados, valorPorCabeca: valorNumero }]);
    setProximaChave((c) => c + 1);
    setMarcados(new Set());
    // O valor fica: é comum aplicar o mesmo valor a grupos marcados em
    // filtros diferentes.
  }

  function remover(chave: number) {
    setLotes((atual) => atual.filter((l) => l.chave !== chave));
  }

  function alternar(chave: number) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function limparTudo() {
    setMarcados(new Set());
    setValor("");
    setLotes([]);
    setAbertos(new Set());
    setErro(undefined);
  }

  function cancelar() {
    if (lotes.length > 0 && !confirm("Descartar a revalorização em andamento?")) return;
    limparTudo();
    setAberta(false);
  }

  async function finalizar() {
    if (lotes.length === 0) return;
    setEmAndamento(true);
    setErro(undefined);
    const r = await revalorizarAnimais(
      localId,
      lotes.map((l) => ({ animalIds: l.animais.map((a) => a.id), valorPorCabeca: l.valorPorCabeca })),
    );
    setEmAndamento(false);
    if (r.error) return setErro(r.error);
    toast.success(`${r.atualizados ?? 0} animal(is) revalorizado(s).`);
    limparTudo();
    setAberta(false);
  }

  if (!aberta) {
    return (
      <div>
        <Button onClick={() => setAberta(true)}>
          <Plus className="size-4" />
          Nova revalorização
        </Button>
      </div>
    );
  }

  const diferenca = resumoLista.depois - resumoLista.antes;

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Revalorizar animais</h2>
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
          especieTravada={lotes.length > 0}
          marcados={marcados}
          onMarcadosChange={setMarcados}
          idsIndisponiveis={idsNaLista}
          rotuloIndisponivel="Na lista"
        />

        {/* Entre os cards: valor novo */}
        <div className="flex flex-col gap-3 self-start rounded-xl border bg-muted/30 p-4 xl:sticky xl:top-4 xl:mt-16">
          <div className="flex flex-col gap-1.5">
            <Label>Novo valor por cabeça</Label>
            <CampoValorReais value={valor} onChange={setValor} />
          </div>

          {selecionados.length > 0 && (
            <div className="flex flex-col gap-1 rounded-md border bg-background p-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Marcados</span>
                <span className="tabular-nums">{selecionados.length}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Valor atual</span>
                <span className="tabular-nums">{reais(atuaisSelecionados.total)}</span>
              </div>
              {selecionados.length - atuaisSelecionados.semValor > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Média atual</span>
                  <span className="tabular-nums">
                    {reais(atuaisSelecionados.total / (selecionados.length - atuaisSelecionados.semValor))}
                  </span>
                </div>
              )}
              {valorNumero > 0 && (
                <div className="flex justify-between gap-2 font-medium">
                  <span>Valor novo</span>
                  <span className="tabular-nums">{reais(valorNumero * selecionados.length)}</span>
                </div>
              )}
              {atuaisSelecionados.semValor > 0 && (
                <span className="text-muted-foreground">{atuaisSelecionados.semValor} sem valor hoje.</span>
              )}
            </div>
          )}

          <Button disabled={selecionados.length === 0 || !(valorNumero > 0)} onClick={adicionar}>
            Adicionar {selecionados.length > 0 ? `(${selecionados.length})` : ""}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Lotes montados */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Animais a revalorizar</CardTitle>
            <CardDescription>
              {resumoLista.animais} animal(is) em {lotes.length} lote(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {lotes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                <p>Marque animais à esquerda, informe o valor novo e clique em Adicionar.</p>
              </div>
            ) : (
              <>
                <div className="max-h-[32rem] overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow>
                        <TableHead>Lote</TableHead>
                        <TableHead className="text-right">Animais</TableHead>
                        <TableHead className="text-right">Antes</TableHead>
                        <TableHead className="text-right">Depois</TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lotes.map((l) => {
                        const aberto = abertos.has(l.chave);
                        const categorias = Array.from(new Set(l.animais.map((a) => a.categoria_descricao)));
                        return (
                          <Fragment key={l.chave}>
                            <TableRow className="bg-muted/30">
                              <TableCell>
                                <button type="button" onClick={() => alternar(l.chave)} className="flex items-start gap-1 text-left">
                                  {aberto ? (
                                    <ChevronDown className="mt-0.5 size-4 shrink-0" />
                                  ) : (
                                    <ChevronRight className="mt-0.5 size-4 shrink-0" />
                                  )}
                                  <span className="flex flex-col">
                                    <span className="font-medium">{reais(l.valorPorCabeca)} por cabeça</span>
                                    <span className="text-xs text-muted-foreground">
                                      {categorias.length === 1 ? categorias[0] : "Várias categorias"}
                                    </span>
                                  </span>
                                </button>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{l.animais.length}</TableCell>
                              <TableCell className="text-right tabular-nums">{reais(somaValores(l.animais).total)}</TableCell>
                              <TableCell className="text-right tabular-nums">{reais(l.valorPorCabeca * l.animais.length)}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-destructive"
                                  title="Tirar da lista"
                                  onClick={() => remover(l.chave)}
                                >
                                  <X className="size-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                            {aberto &&
                              l.animais.map((a) => {
                                const v = valorEstoque(a);
                                return (
                                  <TableRow key={a.id} className="text-muted-foreground">
                                    <TableCell className="pl-8">
                                      {identificacaoAnimal(a)}
                                      <span className="text-xs">
                                        {" "}
                                        · {a.categoria_descricao} · {a.area_nome}
                                      </span>
                                    </TableCell>
                                    <TableCell />
                                    <TableCell className="text-right tabular-nums">{v == null ? "—" : reais(v)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{reais(l.valorPorCabeca)}</TableCell>
                                    <TableCell />
                                  </TableRow>
                                );
                              })}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg border p-2">
                    <div className="text-xs text-muted-foreground">Antes</div>
                    <div className="font-semibold tabular-nums">{reais(resumoLista.antes)}</div>
                  </div>
                  <div className="rounded-lg border p-2">
                    <div className="text-xs text-muted-foreground">Depois</div>
                    <div className="font-semibold tabular-nums">{reais(resumoLista.depois)}</div>
                  </div>
                  <div className="rounded-lg border p-2">
                    <div className="text-xs text-muted-foreground">Diferença</div>
                    <div
                      className={
                        "font-semibold tabular-nums " +
                        (diferenca < 0 ? "text-destructive" : diferenca > 0 ? "text-green-700 dark:text-green-400" : "")
                      }
                    >
                      {diferenca > 0 ? "+" : ""}
                      {reais(diferenca)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button size="lg" className="h-12 text-base" disabled={lotes.length === 0 || emAndamento} onClick={finalizar}>
        {emAndamento ? "Gravando..." : `Finalizar revalorização (${resumoLista.animais} animais)`}
      </Button>
    </div>
  );
}
