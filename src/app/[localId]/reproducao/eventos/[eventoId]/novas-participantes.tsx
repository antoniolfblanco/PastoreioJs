"use client";

import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { X, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import {
  CardSelecaoAnimais,
  identificacaoAnimal,
  type AnimalSelecionavel,
} from "@/components/card-selecao-animais";
import { adicionarParticipantesEvento, adicionarReceptorasEvento } from "@/lib/actions/coberturas";
import type { Evento } from "./page";

const rotulosMetodo: Record<string, string> = {
  monta_natural: "Monta natural",
  inseminacao_artificial: "Inseminação artificial",
  te_fiv: "TE/FIV",
};

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

// Cada clique em "Adicionar" vira um grupo na lista da direita (só pra
// organizar o que já foi escolhido); ao finalizar, entra tudo numa chamada.
type Grupo = { chave: number; femeas: AnimalSelecionavel[] };

// Resumo "Novilhas (12), Vacas (3)" de um grupo.
function resumoCategorias(femeas: AnimalSelecionavel[]) {
  const contagem = new Map<string, number>();
  for (const f of femeas) contagem.set(f.categoria_descricao, (contagem.get(f.categoria_descricao) ?? 0) + 1);
  return Array.from(contagem.entries())
    .map(([nome, qtd]) => `${nome} (${qtd})`)
    .join(", ");
}

export function NovasParticipantes({
  localId,
  evento,
  femeas,
  jaParticipantes,
  totalParticipantes,
  onFechar,
}: {
  localId: string;
  evento: Evento;
  femeas: AnimalSelecionavel[];
  jaParticipantes: Set<string>;
  totalParticipantes: number;
  onFechar: () => void;
}) {
  const isTeFiv = evento.metodo === "te_fiv";
  const nomeFemeas = isTeFiv ? "receptoras" : "fêmeas";

  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [proximaChave, setProximaChave] = useState(1);
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const idsNaLista = useMemo(() => new Set(grupos.flatMap((g) => g.femeas.map((f) => f.id))), [grupos]);
  // Travadas na seleção: as que já estão no evento e as que já estão na lista.
  const indisponiveis = useMemo(() => new Set([...jaParticipantes, ...idsNaLista]), [jaParticipantes, idsNaLista]);
  const totalNaLista = idsNaLista.size;
  const qtdMarcados = marcados.size;

  function adicionar() {
    if (qtdMarcados === 0) return;
    setGrupos((atual) => [...atual, { chave: proximaChave, femeas: femeas.filter((f) => marcados.has(f.id)) }]);
    setProximaChave((c) => c + 1);
    setMarcados(new Set());
  }

  function remover(chave: number) {
    setGrupos((atual) => atual.filter((g) => g.chave !== chave));
  }

  function alternarAberto(chave: number) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function cancelar() {
    if (grupos.length > 0 && !confirm(`Descartar as ${nomeFemeas} da lista?`)) return;
    onFechar();
  }

  async function finalizar() {
    if (totalNaLista === 0) return;
    setEmAndamento(true);
    setErro(undefined);
    const acao = isTeFiv ? adicionarReceptorasEvento : adicionarParticipantesEvento;
    const resultado = await acao(localId, evento.id, Array.from(idsNaLista));
    setEmAndamento(false);
    if (resultado.error) {
      setErro(resultado.error);
      return;
    }
    toast.success(`${totalNaLista} ${nomeFemeas} adicionada(s) ao evento.`);
    onFechar();
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Adicionar {nomeFemeas} ao evento</h2>
        <Button variant="ghost" size="sm" onClick={cancelar}>
          <X className="size-4" />
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_16rem_minmax(0,1fr)]">
        {/* A espécie é a do evento — não dá pra trocar aqui. */}
        <CardSelecaoAnimais
          animais={femeas}
          especie={evento.especie}
          onTrocarEspecie={() => {}}
          especieTravada
          marcados={marcados}
          onMarcadosChange={setMarcados}
          idsIndisponiveis={indisponiveis}
          rotuloIndisponivel={(id) => (jaParticipantes.has(id) ? "No evento" : "Na lista")}
        />

        {/* Entre os cards: o evento */}
        <div className="flex flex-col gap-3 self-start rounded-xl border bg-muted/30 p-4 text-sm xl:sticky xl:top-4 xl:mt-16">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{evento.nome}</span>
            <span className="text-muted-foreground">{rotulosMetodo[evento.metodo] ?? evento.metodo}</span>
            <span className="text-muted-foreground">
              Estação {evento.estacao_nome} · início {formatarData(evento.data_inicio)}
            </span>
          </div>
          <div className="rounded-md border bg-background p-2">
            <div className="text-xs text-muted-foreground">Já no evento</div>
            <div className="text-lg font-semibold tabular-nums">{totalParticipantes}</div>
          </div>
          <p className="text-xs text-muted-foreground">
            {isTeFiv
              ? "As receptoras entram aguardando o lote de embriões — depois confirme o acasalamento na tabela do evento."
              : "As fêmeas entram sem acasalamento definido — depois confirme o acasalamento na tabela do evento."}
          </p>
          <Button disabled={qtdMarcados === 0} onClick={adicionar}>
            Adicionar {qtdMarcados > 0 ? `(${qtdMarcados})` : ""}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Lista das fêmeas a incluir */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>{isTeFiv ? "Receptoras a incluir" : "Fêmeas a incluir"}</CardTitle>
            <CardDescription>
              {totalNaLista} {nomeFemeas} em {grupos.length} grupo(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {grupos.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                <p>Marque as {nomeFemeas} à esquerda e clique em Adicionar.</p>
              </div>
            ) : (
              <div className="max-h-[36rem] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Grupo</TableHead>
                      <TableHead className="text-right">Animais</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grupos.map((g, i) => {
                      const aberto = abertos.has(g.chave);
                      return (
                        <Fragment key={g.chave}>
                          <TableRow className="bg-muted/30">
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => alternarAberto(g.chave)}
                                className="flex items-start gap-1 text-left"
                              >
                                {aberto ? (
                                  <ChevronDown className="mt-0.5 size-4 shrink-0" />
                                ) : (
                                  <ChevronRight className="mt-0.5 size-4 shrink-0" />
                                )}
                                <span className="flex flex-col gap-0.5">
                                  <span className="font-medium">Grupo {i + 1}</span>
                                  <span className="text-xs text-muted-foreground">{resumoCategorias(g.femeas)}</span>
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{g.femeas.length}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive"
                                title="Tirar da lista"
                                onClick={() => remover(g.chave)}
                              >
                                <X className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {aberto &&
                            g.femeas.map((f) => (
                              <TableRow key={f.id} className="text-muted-foreground">
                                <TableCell className="pl-8">
                                  {identificacaoAnimal(f)}
                                  <span className="text-xs">
                                    {" "}
                                    · {f.categoria_descricao} · {f.area_nome}
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

      <Button size="lg" className="h-12 text-base" disabled={totalNaLista === 0 || emAndamento} onClick={finalizar}>
        {emAndamento ? "Adicionando..." : `Finalizar inclusão (${totalNaLista} ${nomeFemeas})`}
      </Button>
    </div>
  );
}
