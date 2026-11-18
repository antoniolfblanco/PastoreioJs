"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Plus, X, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import {
  CardSelecaoAnimais,
  identificacaoAnimal,
  type AnimalSelecionavel,
  type Especie,
} from "@/components/card-selecao-animais";

// Um registro montado: os animais marcados num "Adicionar" com os dados do
// card do meio naquele momento. Ao finalizar, cada um é gravado separado.
export type ItemLancamento<D> = { chave: number; animais: AnimalSelecionavel[]; dados: D };

// Painel de três cards das rotinas de ocorrência que só selecionam animais
// existentes (consumo, furto, saída de acerto...): seleção | dados | lista,
// com o "Finalizar" embaixo. Cada rotina passa os campos do meio, como
// resumir cada registro e como gravá-lo — o resto (marcar, travar quem já
// está na lista, tirar da lista, gravar um por um e manter os que falharam)
// é igual em todas.
export function PainelLancamento<D>({
  animais,
  rotuloAbrir,
  titulo,
  tituloLista,
  dadosIniciais,
  camposMeio,
  validar,
  aposAdicionar,
  resumoItem,
  gravar,
  rotuloFinalizar,
  mensagemSucesso,
}: {
  animais: AnimalSelecionavel[];
  rotuloAbrir: string;
  titulo: string;
  tituloLista: string;
  dadosIniciais: () => D;
  camposMeio: (dados: D, alterar: (mudanca: Partial<D>) => void) => ReactNode;
  // Mensagem de erro, ou null quando dá pra adicionar.
  validar?: (dados: D) => string | null;
  // O que sobra no card do meio depois de um "Adicionar" (padrão: tudo fica).
  aposAdicionar?: (dados: D) => D;
  resumoItem: (dados: D) => { titulo: ReactNode; detalhes?: (string | null | false | undefined)[] };
  // Grava um registro; devolve a mensagem de erro, ou null se deu certo.
  gravar: (item: ItemLancamento<D>) => Promise<string | null>;
  rotuloFinalizar: string;
  mensagemSucesso: (totalAnimais: number) => string;
}) {
  const [aberta, setAberta] = useState(false);
  const [especie, setEspecie] = useState<Especie>("bovino");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [dados, setDados] = useState<D>(dadosIniciais);
  const [itens, setItens] = useState<ItemLancamento<D>[]>([]);
  const [proximaChave, setProximaChave] = useState(1);
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const idsNaLista = useMemo(() => new Set(itens.flatMap((i) => i.animais.map((a) => a.id))), [itens]);
  const totalAnimais = idsNaLista.size;
  const qtdMarcados = marcados.size;

  function alterar(mudanca: Partial<D>) {
    setDados((atual) => ({ ...atual, ...mudanca }));
  }

  function trocarEspecie(nova: Especie) {
    setEspecie(nova);
    setMarcados(new Set());
  }

  function adicionar() {
    if (qtdMarcados === 0) return;
    const problema = validar?.(dados) ?? null;
    if (problema) return setErro(problema);
    setErro(undefined);
    setItens((atual) => [
      ...atual,
      { chave: proximaChave, animais: animais.filter((a) => marcados.has(a.id)), dados },
    ]);
    setProximaChave((c) => c + 1);
    setMarcados(new Set());
    if (aposAdicionar) setDados(aposAdicionar(dados));
  }

  function remover(chave: number) {
    setItens((atual) => atual.filter((i) => i.chave !== chave));
  }

  function alternarAberto(chave: number) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function limparTudo() {
    setMarcados(new Set());
    setDados(dadosIniciais());
    setItens([]);
    setAbertos(new Set());
    setErro(undefined);
  }

  function cancelar() {
    if (itens.length > 0 && !confirm("Descartar os registros em andamento?")) return;
    limparTudo();
    setAberta(false);
  }

  async function finalizar() {
    if (itens.length === 0) return;
    setEmAndamento(true);
    setErro(undefined);
    // Um registro por vez. Se um falhar, os já gravados saem da lista e o
    // resto fica pra tentar de novo.
    let gravados = 0;
    for (const item of itens) {
      const problema = await gravar(item);
      if (problema) {
        setItens(itens.slice(gravados));
        setErro((gravados > 0 ? `${gravados} registro(s) gravado(s), mas o seguinte falhou. ` : "") + problema);
        setEmAndamento(false);
        return;
      }
      gravados++;
    }
    setEmAndamento(false);
    toast.success(mensagemSucesso(totalAnimais));
    limparTudo();
    setAberta(false);
  }

  if (!aberta) {
    return (
      <div>
        <Button onClick={() => setAberta(true)}>
          <Plus className="size-4" />
          {rotuloAbrir}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{titulo}</h2>
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
          especieTravada={itens.length > 0}
          marcados={marcados}
          onMarcadosChange={setMarcados}
          idsIndisponiveis={idsNaLista}
          rotuloIndisponivel="Na lista"
        />

        <div className="flex flex-col gap-3 self-start rounded-xl border bg-muted/30 p-4 xl:sticky xl:top-4 xl:mt-16">
          {camposMeio(dados, alterar)}
          <Button disabled={qtdMarcados === 0} onClick={adicionar}>
            Adicionar {qtdMarcados > 0 ? `(${qtdMarcados})` : ""}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>{tituloLista}</CardTitle>
            <CardDescription>
              {totalAnimais} animal(is) em {itens.length} registro(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itens.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                <p>Marque animais à esquerda, preencha as informações e clique em Adicionar.</p>
              </div>
            ) : (
              <div className="max-h-[36rem] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Registro</TableHead>
                      <TableHead className="text-right">Animais</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item) => {
                      const aberto = abertos.has(item.chave);
                      const resumo = resumoItem(item.dados);
                      const detalhes = (resumo.detalhes ?? []).filter(Boolean);
                      return (
                        <Fragment key={item.chave}>
                          <TableRow className="bg-muted/30">
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => alternarAberto(item.chave)}
                                className="flex items-start gap-1 text-left"
                              >
                                {aberto ? (
                                  <ChevronDown className="mt-0.5 size-4 shrink-0" />
                                ) : (
                                  <ChevronRight className="mt-0.5 size-4 shrink-0" />
                                )}
                                <span className="flex flex-col gap-0.5">
                                  <span className="font-medium">{resumo.titulo}</span>
                                  {detalhes.length > 0 && (
                                    <span className="text-xs text-muted-foreground">{detalhes.join(" · ")}</span>
                                  )}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{item.animais.length}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive"
                                title="Tirar da lista"
                                onClick={() => remover(item.chave)}
                              >
                                <X className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {aberto &&
                            item.animais.map((a) => (
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

      <Button size="lg" className="h-12 text-base" disabled={itens.length === 0 || emAndamento} onClick={finalizar}>
        {emAndamento ? "Registrando..." : `${rotuloFinalizar} (${totalAnimais} animais)`}
      </Button>
    </div>
  );
}
