"use client";

import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { X, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { CardSelecaoAnimais, identificacaoAnimal, type Especie } from "@/components/card-selecao-animais";
import { adicionarTourosLote } from "@/lib/actions/lotes-rm";
import type { CandidatoTouro, LoteRm } from "./page";

// Cada clique em "Adicionar" põe os touros marcados no lote escolhido do
// meio; um mesmo lote acumula numa linha só da lista da direita.
type Inclusao = { loteId: string; touros: CandidatoTouro[] };

export function NovosTourosLote({
  localId,
  lotes,
  candidatos,
  loteInicialId,
  onFechar,
}: {
  localId: string;
  lotes: LoteRm[];
  candidatos: CandidatoTouro[];
  loteInicialId: string;
  onFechar: () => void;
}) {
  const [especie, setEspecie] = useState<Especie>("bovino");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [loteId, setLoteId] = useState(loteInicialId);
  const [inclusoes, setInclusoes] = useState<Inclusao[]>([]);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [erroForm, setErroForm] = useState<string | undefined>();
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const lote = lotes.find((l) => l.id === loteId);
  const naListaDoLote = useMemo(
    () => new Set(inclusoes.find((i) => i.loteId === loteId)?.touros.map((t) => t.id) ?? []),
    [inclusoes, loteId],
  );
  // Travados: os que já estão no lote escolhido e os que já vão entrar nele.
  const jaNoLote = useMemo(() => new Set(lote?.touros.map((t) => t.id) ?? []), [lote]);
  const indisponiveis = useMemo(() => new Set([...jaNoLote, ...naListaDoLote]), [jaNoLote, naListaDoLote]);
  const totalNaLista = inclusoes.reduce((s, i) => s + i.touros.length, 0);
  const qtdMarcados = marcados.size;

  function trocarLote(novo: string) {
    setLoteId(novo);
    // Quem já está no novo lote não pode continuar marcado.
    const novoLote = lotes.find((l) => l.id === novo);
    const travados = new Set([
      ...(novoLote?.touros.map((t) => t.id) ?? []),
      ...(inclusoes.find((i) => i.loteId === novo)?.touros.map((t) => t.id) ?? []),
    ]);
    setMarcados((atual) => new Set([...atual].filter((id) => !travados.has(id))));
  }

  function adicionar() {
    setErroForm(undefined);
    if (qtdMarcados === 0) return;
    if (!lote) return setErroForm("Selecione o lote RM.");
    const touros = candidatos.filter((c) => marcados.has(c.id));
    setInclusoes((atual) => {
      const existente = atual.find((i) => i.loteId === lote.id);
      if (existente) return atual.map((i) => (i.loteId === lote.id ? { ...i, touros: [...i.touros, ...touros] } : i));
      return [...atual, { loteId: lote.id, touros }];
    });
    setMarcados(new Set());
  }

  function removerInclusao(id: string) {
    setInclusoes((atual) => atual.filter((i) => i.loteId !== id));
  }

  function removerTouro(id: string, touroId: string) {
    setInclusoes((atual) =>
      atual
        .map((i) => (i.loteId === id ? { ...i, touros: i.touros.filter((t) => t.id !== touroId) } : i))
        .filter((i) => i.touros.length > 0),
    );
  }

  function alternarAberto(id: string) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function cancelar() {
    if (inclusoes.length > 0 && !confirm("Descartar os touros da lista?")) return;
    onFechar();
  }

  async function finalizar() {
    if (inclusoes.length === 0) return;
    setEmAndamento(true);
    setErro(undefined);

    // Uma chamada por lote. Se uma falhar, os lotes já gravados saem da lista.
    let gravados = 0;
    for (const i of inclusoes) {
      const resultado = await adicionarTourosLote(
        localId,
        i.loteId,
        i.touros.map((t) => t.id),
      );
      if (resultado.error) {
        setInclusoes(inclusoes.slice(gravados));
        setErro((gravados > 0 ? `${gravados} lote(s) atualizado(s), mas o seguinte falhou. ` : "") + resultado.error);
        setEmAndamento(false);
        return;
      }
      gravados++;
    }

    setEmAndamento(false);
    toast.success(`${totalNaLista} touro(s) adicionado(s) em ${gravados} lote(s).`);
    onFechar();
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Adicionar touros aos lotes</h2>
        <Button variant="ghost" size="sm" onClick={cancelar}>
          <X className="size-4" />
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_17rem_minmax(0,1fr)]">
        <CardSelecaoAnimais
          animais={candidatos}
          especie={especie}
          onTrocarEspecie={(nova) => {
            setEspecie(nova);
            setMarcados(new Set());
          }}
          especieTravada={inclusoes.length > 0}
          marcados={marcados}
          onMarcadosChange={setMarcados}
          idsIndisponiveis={indisponiveis}
          rotuloIndisponivel={(id) => (jaNoLote.has(id) ? "No lote" : "Na lista")}
        />

        {/* Entre os cards: o lote */}
        <div className="flex flex-col gap-3 self-start rounded-xl border bg-muted/30 p-4 xl:sticky xl:top-4 xl:mt-16">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="loteRmDestino">Lote RM</Label>
            <Select
              value={loteId}
              onValueChange={(v) => trocarLote(v ?? "")}
              items={lotes.map((l) => ({ value: l.id, label: l.nome }))}
            >
              <SelectTrigger id="loteRmDestino" className="w-full">
                <SelectValue placeholder="Selecione o lote" />
              </SelectTrigger>
              <SelectContent>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {lote && (
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                Já no lote ({lote.touros.length}):
              </span>
              {lote.touros.length === 0 ? (
                <span className="text-muted-foreground">Nenhum touro ainda.</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {lote.touros.map((t) => (
                    <span key={t.id} className="rounded-full border bg-background px-2 py-0.5 text-xs">
                      {t.identificacao}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Só touros próprios, ativos e não castrados — a monta natural em lote exige o touro no rebanho.
          </p>

          {erroForm && <p className="text-sm text-destructive">{erroForm}</p>}

          <Button disabled={qtdMarcados === 0 || !lote} onClick={adicionar}>
            Adicionar {qtdMarcados > 0 ? `(${qtdMarcados})` : ""}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Lista: touros a incluir por lote */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Touros a incluir</CardTitle>
            <CardDescription>
              {totalNaLista} touro(s) em {inclusoes.length} lote(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inclusoes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                <p>Escolha o lote no meio, marque os touros e clique em Adicionar.</p>
              </div>
            ) : (
              <div className="max-h-[36rem] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead className="text-right">Touros</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inclusoes.map((i) => {
                      const nomeLote = lotes.find((l) => l.id === i.loteId)?.nome ?? "—";
                      const aberto = abertos.has(i.loteId);
                      return (
                        <Fragment key={i.loteId}>
                          <TableRow className="bg-muted/30">
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => alternarAberto(i.loteId)}
                                className="flex items-start gap-1 text-left"
                              >
                                {aberto ? (
                                  <ChevronDown className="mt-0.5 size-4 shrink-0" />
                                ) : (
                                  <ChevronRight className="mt-0.5 size-4 shrink-0" />
                                )}
                                <span className="flex flex-col gap-0.5">
                                  <span className="font-medium">{nomeLote}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {i.touros.map((t) => identificacaoAnimal(t)).join(", ")}
                                  </span>
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{i.touros.length}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive"
                                title="Tirar o lote da lista"
                                onClick={() => removerInclusao(i.loteId)}
                              >
                                <X className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {aberto &&
                            i.touros.map((t) => (
                              <TableRow key={t.id} className="text-muted-foreground">
                                <TableCell className="pl-8">
                                  {identificacaoAnimal(t)}
                                  <span className="text-xs">
                                    {" "}
                                    · {t.categoria_descricao} · {t.area_nome}
                                  </span>
                                </TableCell>
                                <TableCell />
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6"
                                    title="Tirar este touro"
                                    onClick={() => removerTouro(i.loteId, t.id)}
                                  >
                                    <X className="size-3.5" />
                                  </Button>
                                </TableCell>
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

      <Button size="lg" className="h-12 text-base" disabled={inclusoes.length === 0 || emAndamento} onClick={finalizar}>
        {emAndamento ? "Gravando..." : `Finalizar inclusão (${totalNaLista} touros)`}
      </Button>
    </div>
  );
}
