"use client";

import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { CardSelecaoAnimais, identificacaoAnimal } from "@/components/card-selecao-animais";
import { registrarMorte } from "@/lib/actions/mortes";
import { CampoEnfermidade } from "./campo-enfermidade";
import type { AnimalAtivo, Especie, OpcaoEnfermidade } from "./page";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatarReais(valor: string) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Cada clique em "Adicionar" vira uma ocorrência: os animais marcados naquele
// momento com as informações do card do meio. Ao finalizar, cada ocorrência
// é um registro de morte separado (cada uma com sua data, causa etc.).
type Ocorrencia = {
  chave: number;
  animais: AnimalAtivo[];
  data: string;
  enfermidadeId: string;
  enfermidadeDescricao: string | null;
  tratada: boolean;
  responsavel: string;
  descricao: string;
  observacoes: string;
  valorAtual: string;
};

export function NovaMorte({
  localId,
  animais,
  enfermidades,
}: {
  localId: string;
  animais: AnimalAtivo[];
  enfermidades: OpcaoEnfermidade[];
}) {
  const [aberta, setAberta] = useState(false);

  const [especie, setEspecie] = useState<Especie>("bovino");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  // Informações da morte (card do meio)
  const [enfermidadesLocais, setEnfermidadesLocais] = useState(enfermidades);
  const [data, setData] = useState(hojeISO);
  const [enfermidadeId, setEnfermidadeId] = useState("");
  const [tratada, setTratada] = useState(false);
  const [responsavel, setResponsavel] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [valorAtual, setValorAtual] = useState("");

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [proximaChave, setProximaChave] = useState(1);
  const [abertas, setAbertas] = useState<Set<number>>(new Set());

  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const idsNaLista = useMemo(
    () => new Set(ocorrencias.flatMap((o) => o.animais.map((a) => a.id))),
    [ocorrencias],
  );
  const totalAnimais = idsNaLista.size;
  const qtdMarcados = marcados.size;

  function trocarEspecie(nova: Especie) {
    setEspecie(nova);
    setMarcados(new Set());
  }

  function adicionar() {
    if (qtdMarcados === 0) return;
    if (!data) {
      setErro("Informe a data da morte.");
      return;
    }
    setErro(undefined);
    setOcorrencias((atual) => [
      ...atual,
      {
        chave: proximaChave,
        animais: animais.filter((a) => marcados.has(a.id)),
        data,
        enfermidadeId,
        enfermidadeDescricao: enfermidadesLocais.find((e) => e.id === enfermidadeId)?.descricao ?? null,
        tratada,
        responsavel,
        descricao,
        observacoes,
        valorAtual,
      },
    ]);
    setProximaChave((c) => c + 1);
    setMarcados(new Set());
    // As informações ficam — o mais comum é várias mortes do mesmo evento.
  }

  function remover(chave: number) {
    setOcorrencias((atual) => atual.filter((o) => o.chave !== chave));
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
    setData(hojeISO());
    setEnfermidadeId("");
    setTratada(false);
    setResponsavel("");
    setDescricao("");
    setObservacoes("");
    setValorAtual("");
    setOcorrencias([]);
    setAbertas(new Set());
    setErro(undefined);
  }

  function cancelar() {
    if (ocorrencias.length > 0 && !confirm("Descartar as ocorrências em andamento?")) return;
    limparTudo();
    setAberta(false);
  }

  async function finalizar() {
    if (ocorrencias.length === 0) return;
    setEmAndamento(true);
    setErro(undefined);

    // Uma chamada por ocorrência. Se uma falhar no meio, as que já foram
    // gravadas saem da lista e o resto fica pra tentar de novo.
    let gravadas = 0;
    for (const o of ocorrencias) {
      const formData = new FormData();
      formData.set("localId", localId);
      formData.set("animalIds", JSON.stringify(o.animais.map((a) => a.id)));
      formData.set("data", o.data);
      formData.set("enfermidadeId", o.enfermidadeId);
      if (o.tratada) formData.set("tratada", "on");
      formData.set("responsavel", o.responsavel);
      formData.set("descricao", o.descricao);
      formData.set("observacoes", o.observacoes);
      formData.set("valorAtual", o.valorAtual);

      const resultado = await registrarMorte(undefined, formData);
      if (resultado?.erro) {
        const restantes = ocorrencias.slice(gravadas);
        setOcorrencias(restantes);
        setErro(
          (gravadas > 0 ? `${gravadas} ocorrência(s) registrada(s), mas a seguinte falhou. ` : "") + resultado.erro,
        );
        setEmAndamento(false);
        return;
      }
      gravadas++;
    }

    setEmAndamento(false);
    toast.success(`${totalAnimais} morte(s) registrada(s).`);
    limparTudo();
    setAberta(false);
  }

  if (!aberta) {
    return (
      <div>
        <Button onClick={() => setAberta(true)}>
          <Plus className="size-4" />
          Adicionar morte
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Registrar mortes</h2>
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
          especieTravada={ocorrencias.length > 0}
          marcados={marcados}
          onMarcadosChange={setMarcados}
          idsIndisponiveis={idsNaLista}
          rotuloIndisponivel="Na lista"
        />

        {/* Entre os cards: informações da morte */}
        <div className="flex flex-col gap-3 self-start rounded-xl border bg-muted/30 p-4 xl:sticky xl:top-4 xl:mt-16">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dataNovaMorte">Data</Label>
            <Input
              id="dataNovaMorte"
              type="date"
              max={hojeISO()}
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <CampoEnfermidade
            htmlId="enfermidadeNovaMorte"
            value={enfermidadeId}
            onValueChange={setEnfermidadeId}
            enfermidades={enfermidadesLocais}
            localId={localId}
            onCriada={(e) => setEnfermidadesLocais((atual) => [...atual, e])}
          />
          <div className="flex items-center gap-2">
            <Checkbox id="tratadaNovaMorte" checked={tratada} onCheckedChange={(v) => setTratada(v === true)} />
            <Label htmlFor="tratadaNovaMorte">Estava em tratamento</Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="responsavelNovaMorte">Responsável</Label>
            <Input id="responsavelNovaMorte" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricaoNovaMorte">Descrição</Label>
            <Input
              id="descricaoNovaMorte"
              placeholder="Ex.: Perda no piquete 3 após chuva"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observacoesNovaMorte">Observações</Label>
            <Textarea
              id="observacoesNovaMorte"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="min-h-16"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Valor de baixa por animal (opcional)</Label>
            <CampoValorReais value={valorAtual} onChange={setValorAtual} />
          </div>

          <Button disabled={qtdMarcados === 0} onClick={adicionar}>
            Adicionar {qtdMarcados > 0 ? `(${qtdMarcados})` : ""}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Animais selecionados pra registrar */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Animais a registrar</CardTitle>
            <CardDescription>
              {totalAnimais} animal(is) em {ocorrencias.length} ocorrência(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ocorrencias.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                <p>Marque animais à esquerda, preencha as informações e clique em Adicionar.</p>
              </div>
            ) : (
              <div className="max-h-[36rem] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Ocorrência</TableHead>
                      <TableHead className="text-right">Animais</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ocorrencias.map((o) => {
                      const aberto = abertas.has(o.chave);
                      const detalhes = [
                        o.descricao || null,
                        o.responsavel ? `por ${o.responsavel}` : null,
                        o.valorAtual ? `baixa ${formatarReais(o.valorAtual)}/animal` : null,
                      ].filter(Boolean);
                      return (
                        <Fragment key={o.chave}>
                          <TableRow className="bg-muted/30">
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => alternarAberta(o.chave)}
                                className="flex items-start gap-1 text-left"
                              >
                                {aberto ? (
                                  <ChevronDown className="mt-0.5 size-4 shrink-0" />
                                ) : (
                                  <ChevronRight className="mt-0.5 size-4 shrink-0" />
                                )}
                                <span className="flex flex-col gap-0.5">
                                  <span className="flex flex-wrap items-center gap-1.5 font-medium">
                                    {formatarData(o.data)} · {o.enfermidadeDescricao ?? "Causa não informada"}
                                    {o.tratada && <Badge variant="secondary">Em tratamento</Badge>}
                                  </span>
                                  {detalhes.length > 0 && (
                                    <span className="text-xs text-muted-foreground">{detalhes.join(" · ")}</span>
                                  )}
                                  {o.observacoes && (
                                    <span className="text-xs italic text-muted-foreground">{o.observacoes}</span>
                                  )}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{o.animais.length}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive"
                                title="Tirar da lista"
                                onClick={() => remover(o.chave)}
                              >
                                <X className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {aberto &&
                            o.animais.map((a) => (
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

      <Button
        size="lg"
        className="h-12 text-base"
        disabled={ocorrencias.length === 0 || emAndamento}
        onClick={finalizar}
      >
        {emAndamento ? "Registrando..." : `Finalizar ocorrências (${totalAnimais} animais)`}
      </Button>
    </div>
  );
}
