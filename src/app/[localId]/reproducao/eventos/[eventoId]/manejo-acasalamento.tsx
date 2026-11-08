"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { X, Plus, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  confirmarAcasalamentoEmbriao,
  confirmarAcasalamentos,
  registrarDiagnosticosGestacao,
} from "@/lib/actions/coberturas";
import { SeletorAnimalEvento } from "./seletor-animal-evento";
import { DialogoAdicionarDosesSemen } from "./dialogo-adicionar-doses-semen";
import type {
  CandidatoAnimal,
  CertezaDiagnostico,
  Evento,
  LoteEmbriaoOpcao,
  LoteRmOpcao,
  Participante,
  ResultadoDiagnostico,
} from "./page";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(data: string | null) {
  return data ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR") : "—";
}

const rotulosResultado: Record<ResultadoDiagnostico, string> = {
  prenha: "Prenha",
  vazia: "Vazia",
  inconclusivo: "Inconclusivo",
};
const rotulosCerteza: Record<CertezaDiagnostico, string> = { certo: "Certo", provavel: "Provável" };

type Operacao = "acasalamento" | "diagnostico";

// Cada clique em "Adicionar" vira uma operação da lista: as fêmeas marcadas
// naquele momento com o que foi escolhido no card do meio. Ao finalizar,
// cada operação é uma chamada (na ordem da lista).
type Item =
  | {
      chave: number;
      tipo: "acasalamento";
      participantes: Participante[];
      data: string;
      responsavel: string;
      touroId: string | null;
      rmLoteId: string | null;
      loteEmbriaoId: string | null;
      descricao: string;
    }
  | {
      chave: number;
      tipo: "diagnostico";
      participantes: Participante[];
      data: string;
      responsavel: string;
      resultado: ResultadoDiagnostico;
      certeza: CertezaDiagnostico | null;
      observacoes: string;
    };

// O que a fêmea já tem no evento, pra mostrar na tabela da esquerda.
function situacao(p: Participante, isTeFiv: boolean) {
  if (p.pariu) return "Pariu";
  if (!p.confirmada) return "Pendente";
  const acasalamento = isTeFiv
    ? `${p.doadoraNome ?? "—"} × ${p.touroNome ?? "—"}`
    : (p.touroNome ?? p.rmLoteNome ?? "Acasalada");
  return p.ultimoDiagnosticoResultado
    ? `${acasalamento} · ${rotulosResultado[p.ultimoDiagnosticoResultado]}`
    : acasalamento;
}

export function ManejoAcasalamento({
  localId,
  evento,
  participantes,
  candidatos,
  lotesRm,
  lotesEmbriao,
  onFechar,
}: {
  localId: string;
  evento: Evento;
  participantes: Participante[];
  candidatos: CandidatoAnimal[];
  lotesRm: LoteRmOpcao[];
  lotesEmbriao: LoteEmbriaoOpcao[];
  onFechar: () => void;
}) {
  const isTeFiv = evento.metodo === "te_fiv";
  const isIa = evento.metodo === "inseminacao_artificial";

  const [operacao, setOperacao] = useState<Operacao>("acasalamento");
  const [busca, setBusca] = useState("");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  // Acasalamento
  const [data, setData] = useState(hojeISO);
  const [responsavel, setResponsavel] = useState("");
  const [usarLoteRm, setUsarLoteRm] = useState(false);
  const [touroId, setTouroId] = useState("");
  const [rmLoteId, setRmLoteId] = useState("");
  const [loteEmbriaoId, setLoteEmbriaoId] = useState("");
  const [dosesAberto, setDosesAberto] = useState(false);

  // Diagnóstico
  const [resultado, setResultado] = useState<ResultadoDiagnostico | null>(null);
  const [certeza, setCerteza] = useState<CertezaDiagnostico>("certo");
  const [observacoes, setObservacoes] = useState("");

  const [itens, setItens] = useState<Item[]>([]);
  const [proximaChave, setProximaChave] = useState(1);
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const [erroForm, setErroForm] = useState<string | undefined>();
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const idsNaLista = useMemo(() => new Set(itens.flatMap((i) => i.participantes.map((p) => p.id))), [itens]);

  // Só aparecem as que podem receber a operação escolhida: acasalamento pras
  // pendentes; diagnóstico pras já acasaladas que ainda não pariram.
  const elegiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return participantes
      .filter((p) => (operacao === "acasalamento" ? !p.confirmada : p.confirmada && !p.pariu))
      .filter((p) => !termo || p.identificacao.toLowerCase().includes(termo))
      .sort((a, b) => a.identificacao.localeCompare(b.identificacao, "pt-BR", { numeric: true }));
  }, [participantes, operacao, busca]);

  const disponiveis = elegiveis.filter((p) => !idsNaLista.has(p.id));
  const todosMarcados = disponiveis.length > 0 && disponiveis.every((p) => marcados.has(p.id));
  const qtdMarcados = marcados.size;

  // Embriões já reservados na lista, por lote — não dá pra passar do estoque.
  const embrioesReservados = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const i of itens)
      if (i.tipo === "acasalamento" && i.loteEmbriaoId)
        mapa.set(i.loteEmbriaoId, (mapa.get(i.loteEmbriaoId) ?? 0) + i.participantes.length);
    return mapa;
  }, [itens]);

  function trocarOperacao(nova: Operacao) {
    setOperacao(nova);
    setMarcados(new Set());
    setErroForm(undefined);
  }

  // Escolheu o lote RM: a data do acasalamento vai pro início do lote (é o
  // dia em que os touros foram soltos — qualquer dia do período vale).
  function escolherLoteRm(id: string) {
    setRmLoteId(id);
    const lote = lotesRm.find((l) => l.id === id);
    if (lote?.data_inicio && (data < lote.data_inicio || (lote.data_fim && data > lote.data_fim))) {
      setData(lote.data_inicio);
    }
  }

  const loteRmEscolhido = lotesRm.find((l) => l.id === rmLoteId);

  // Período em que a data do acasalamento pode cair: o do lote RM escolhido,
  // ou — monta natural com touro — o do próprio evento (solto → retirado).
  const montaNaturalTouro = evento.metodo === "monta_natural" && !usarLoteRm;
  const periodo =
    operacao !== "acasalamento"
      ? null
      : usarLoteRm
        ? loteRmEscolhido?.data_inicio
          ? { de: loteRmEscolhido.data_inicio, ate: loteRmEscolhido.data_fim, nome: `O lote ${loteRmEscolhido.nome}` }
          : null
        : montaNaturalTouro
          ? { de: evento.data_inicio, ate: evento.data_fim, nome: "O evento" }
          : null;

  function alternar(id: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarTodos() {
    setMarcados((atual) => {
      const novo = new Set(atual);
      for (const p of disponiveis) {
        if (todosMarcados) novo.delete(p.id);
        else novo.add(p.id);
      }
      return novo;
    });
  }

  function adicionar() {
    setErroForm(undefined);
    if (qtdMarcados === 0) return;
    if (!data) return setErroForm("Informe a data.");
    const selecionadas = participantes.filter((p) => marcados.has(p.id));

    if (operacao === "acasalamento") {
      let descricao: string;
      if (isTeFiv) {
        const lote = lotesEmbriao.find((l) => l.id === loteEmbriaoId);
        if (!lote) return setErroForm("Selecione o lote de embriões.");
        const restantes = lote.quantidade - (embrioesReservados.get(lote.id) ?? 0);
        if (selecionadas.length > restantes)
          return setErroForm(`Esse lote só tem ${restantes} embrião(ões) disponível(is).`);
        descricao = `Embrião ${lote.doadoraIdentificacao} × ${lote.touroIdentificacao}`;
      } else if (usarLoteRm) {
        const lote = lotesRm.find((l) => l.id === rmLoteId);
        if (!lote) return setErroForm("Selecione o lote RM.");
        // Monta em lote: a data tem que cair dentro do período do lote.
        if (lote.data_inicio && data < lote.data_inicio)
          return setErroForm(`O lote ${lote.nome} só foi solto em ${formatarData(lote.data_inicio)}.`);
        if (lote.data_fim && data > lote.data_fim)
          return setErroForm(`O lote ${lote.nome} foi retirado em ${formatarData(lote.data_fim)}.`);
        descricao = `Lote RM ${lote.nome}`;
      } else {
        const touro = candidatos.find((c) => c.id === touroId);
        if (!touro) return setErroForm("Selecione o touro.");
        if (montaNaturalTouro && data < evento.data_inicio)
          return setErroForm(`O touro só foi solto em ${formatarData(evento.data_inicio)}.`);
        if (montaNaturalTouro && evento.data_fim && data > evento.data_fim)
          return setErroForm(`O touro foi retirado em ${formatarData(evento.data_fim)}.`);
        descricao = `${isIa ? "IA com " : "Touro "}${[touro.brinco, touro.tatuagem, touro.nome].filter(Boolean).join(" • ")}`;
      }
      setItens((atual) => [
        ...atual,
        {
          chave: proximaChave,
          tipo: "acasalamento",
          participantes: selecionadas,
          data,
          responsavel,
          touroId: !isTeFiv && !usarLoteRm ? touroId : null,
          rmLoteId: !isTeFiv && usarLoteRm ? rmLoteId : null,
          loteEmbriaoId: isTeFiv ? loteEmbriaoId : null,
          descricao,
        },
      ]);
    } else {
      if (!resultado) return setErroForm("Escolha o resultado do diagnóstico.");
      setItens((atual) => [
        ...atual,
        {
          chave: proximaChave,
          tipo: "diagnostico",
          participantes: selecionadas,
          data,
          responsavel,
          resultado,
          certeza: resultado === "prenha" ? certeza : null,
          observacoes,
        },
      ]);
      // O resultado é o que mais muda entre um grupo e outro — volta a ficar em aberto.
      setResultado(null);
    }
    setProximaChave((c) => c + 1);
    setMarcados(new Set());
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

  function cancelar() {
    if (itens.length > 0 && !confirm("Descartar as operações da lista?")) return;
    onFechar();
  }

  async function finalizar() {
    if (itens.length === 0) return;
    setEmAndamento(true);
    setErro(undefined);

    // Uma chamada por operação. Se uma falhar, as já gravadas saem da lista.
    let gravados = 0;
    for (const item of itens) {
      const ids = item.participantes.map((p) => p.id);
      const resp =
        item.tipo === "diagnostico"
          ? await registrarDiagnosticosGestacao(localId, evento.id, {
              resultados: ids.map((coberturaId) => ({
                coberturaId,
                resultado: item.resultado,
                certeza: item.certeza,
              })),
              data: item.data,
              responsavel: item.responsavel.trim() || null,
              observacoes: item.observacoes.trim() || null,
            })
          : item.loteEmbriaoId
            ? await confirmarAcasalamentoEmbriao(localId, evento.id, {
                coberturaIds: ids,
                loteEmbriaoId: item.loteEmbriaoId,
                data: item.data,
                responsavel: item.responsavel.trim() || null,
              })
            : await confirmarAcasalamentos(localId, evento.id, {
                coberturaIds: ids,
                touroId: item.touroId,
                rmLoteId: item.rmLoteId,
                data: item.data,
                responsavel: item.responsavel.trim() || null,
              });
      if (resp.error) {
        setItens(itens.slice(gravados));
        setErro((gravados > 0 ? `${gravados} operação(ões) gravada(s), mas a seguinte falhou. ` : "") + resp.error);
        setEmAndamento(false);
        return;
      }
      gravados++;
    }

    setEmAndamento(false);
    toast.success(`${gravados} operação(ões) gravada(s).`);
    onFechar();
  }

  const totalNaLista = idsNaLista.size;

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Acasalamento e diagnóstico em lote</h2>
        <Button variant="ghost" size="sm" onClick={cancelar}>
          <X className="size-4" />
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_18rem_minmax(0,1fr)]">
        {/* Card 1: fêmeas do evento */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>{isTeFiv ? "Receptoras do evento" : "Fêmeas do evento"}</CardTitle>
            <CardDescription>
              {operacao === "acasalamento" ? "Pendentes de acasalamento" : "Acasaladas, aguardando parto"}:{" "}
              {disponiveis.length} disponível(is) · {qtdMarcados} marcada(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input placeholder="Buscar por brinco, tatuagem ou nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            {elegiveis.length === 0 ? (
              <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                {operacao === "acasalamento"
                  ? "Nenhuma fêmea pendente de acasalamento."
                  : "Nenhuma fêmea acasalada aguardando diagnóstico."}
              </div>
            ) : (
              <div className="max-h-[28rem] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={todosMarcados}
                          disabled={disponiveis.length === 0}
                          onCheckedChange={alternarTodos}
                          title="Marcar todas"
                        />
                      </TableHead>
                      <TableHead>Fêmea</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {elegiveis.map((p) => {
                      const naLista = idsNaLista.has(p.id);
                      return (
                        <TableRow
                          key={p.id}
                          className={cn(naLista ? "opacity-50" : "cursor-pointer")}
                          onClick={() => !naLista && alternar(p.id)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={marcados.has(p.id) || naLista}
                              disabled={naLista}
                              onCheckedChange={() => alternar(p.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {p.identificacao}
                            {naLista && (
                              <Badge variant="outline" className="ml-2">
                                Na lista
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{situacao(p, isTeFiv)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatarData(p.ultimoDiagnosticoData ?? p.data)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card do meio: o que fazer */}
        <div className="flex flex-col gap-3 self-start rounded-xl border bg-muted/30 p-4 xl:sticky xl:top-4 xl:mt-16">
          <div className="grid grid-cols-2 gap-1">
            {(["acasalamento", "diagnostico"] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => trocarOperacao(o)}
                className={cn(buttonVariants({ variant: operacao === o ? "secondary" : "outline", size: "sm" }))}
              >
                {o === "acasalamento" ? (isTeFiv ? "Transferência" : "Acasalamento") : "Diagnóstico"}
              </button>
            ))}
          </div>

          {operacao === "acasalamento" ? (
            isTeFiv ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="loteEmbriaoLote">Lote de embriões</Label>
                {lotesEmbriao.length === 0 ? (
                  <Link href={`/${localId}/reproducao/banco-genetico`} className="text-sm text-muted-foreground underline">
                    Cadastrar lote de embriões
                  </Link>
                ) : (
                  <Select
                    value={loteEmbriaoId}
                    onValueChange={(v) => setLoteEmbriaoId(v ?? "")}
                    items={lotesEmbriao.map((l) => ({
                      value: l.id,
                      label: `${l.doadoraIdentificacao} × ${l.touroIdentificacao} (${l.quantidade - (embrioesReservados.get(l.id) ?? 0)})`,
                    }))}
                  >
                    <SelectTrigger id="loteEmbriaoLote" className="w-full">
                      <SelectValue placeholder="Selecione o lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {lotesEmbriao.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.doadoraIdentificacao} × {l.touroIdentificacao} (
                          {l.quantidade - (embrioesReservados.get(l.id) ?? 0)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <>
                {!isIa && (
                  <div className="grid grid-cols-2 gap-1">
                    {[false, true].map((rm) => (
                      <button
                        key={String(rm)}
                        type="button"
                        onClick={() => setUsarLoteRm(rm)}
                        className={cn(
                          buttonVariants({ variant: usarLoteRm === rm ? "secondary" : "outline", size: "sm" }),
                        )}
                      >
                        {rm ? "Lote RM" : "Touro"}
                      </button>
                    ))}
                  </div>
                )}
                {usarLoteRm ? (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="loteRmLote">Lote RM</Label>
                    {lotesRm.length === 0 ? (
                      <Link href={`/${localId}/reproducao/lotes-rm`} className="text-sm text-muted-foreground underline">
                        Cadastrar lote RM
                      </Link>
                    ) : (
                      <Select
                        value={rmLoteId}
                        onValueChange={(v) => escolherLoteRm(v ?? "")}
                        items={lotesRm.map((l) => ({ value: l.id, label: l.nome }))}
                      >
                        <SelectTrigger id="loteRmLote" className="w-full">
                          <SelectValue placeholder="Selecione o lote" />
                        </SelectTrigger>
                        <SelectContent>
                          {lotesRm.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ) : (
                  <div className="flex items-end gap-1">
                    <div className="min-w-0 flex-1">
                      <SeletorAnimalEvento
                        htmlId="touroLote"
                        rotulo={isIa ? "Touro (banco de sêmen)" : "Touro"}
                        sexo="macho"
                        especie={evento.especie}
                        candidatos={candidatos}
                        value={touroId}
                        onValueChange={setTouroId}
                      />
                    </div>
                    {isIa && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Adicionar doses de sêmen"
                        onClick={() => setDosesAberto(true)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    )}
                  </div>
                )}
              </>
            )
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Resultado</Label>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.keys(rotulosResultado) as ResultadoDiagnostico[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setResultado(r)}
                      className={cn(buttonVariants({ variant: resultado === r ? "secondary" : "outline", size: "sm" }))}
                    >
                      {rotulosResultado[r]}
                    </button>
                  ))}
                </div>
              </div>
              {resultado === "prenha" && (
                <div className="flex flex-col gap-1.5">
                  <Label>Certeza</Label>
                  <div className="grid grid-cols-2 gap-1">
                    {(Object.keys(rotulosCerteza) as CertezaDiagnostico[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCerteza(c)}
                        className={cn(buttonVariants({ variant: certeza === c ? "secondary" : "outline", size: "sm" }))}
                      >
                        {rotulosCerteza[c]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dataLoteReprodutivo">Data</Label>
            <Input
              id="dataLoteReprodutivo"
              type="date"
              min={periodo?.de}
              max={periodo?.ate ?? hojeISO()}
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
            {periodo && (
              <span className="text-xs text-muted-foreground">
                {periodo.nome} vai {periodo.ate ? `de ${formatarData(periodo.de)} a ${formatarData(periodo.ate)}` : `desde ${formatarData(periodo.de)}`}{" "}
                — qualquer dia do período vale.
              </span>
            )}
            {operacao === "acasalamento" && usarLoteRm && loteRmEscolhido && !loteRmEscolhido.data_inicio && (
              <span className="text-xs text-muted-foreground">
                Este lote não tem período cadastrado — informe em Lotes RM.
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="responsavelLoteReprodutivo">Responsável</Label>
            <Input id="responsavelLoteReprodutivo" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>
          {operacao === "diagnostico" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obsLoteReprodutivo">Observações</Label>
              <Textarea
                id="obsLoteReprodutivo"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="min-h-16"
              />
            </div>
          )}

          {erroForm && <p className="text-sm text-destructive">{erroForm}</p>}

          <Button disabled={qtdMarcados === 0} onClick={adicionar}>
            Adicionar {qtdMarcados > 0 ? `(${qtdMarcados})` : ""}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Card 3: operações a gravar */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Operações a gravar</CardTitle>
            <CardDescription>
              {totalNaLista} fêmea(s) em {itens.length} operação(ões)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itens.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                <p>Escolha a operação no meio, marque as fêmeas e clique em Adicionar.</p>
              </div>
            ) : (
              <div className="max-h-[36rem] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Operação</TableHead>
                      <TableHead className="text-right">Fêmeas</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item) => {
                      const aberto = abertos.has(item.chave);
                      const titulo =
                        item.tipo === "acasalamento"
                          ? item.descricao
                          : `Diagnóstico: ${rotulosResultado[item.resultado]}${item.certeza ? ` (${rotulosCerteza[item.certeza].toLowerCase()})` : ""}`;
                      const detalhes = [
                        formatarData(item.data),
                        item.responsavel ? `por ${item.responsavel}` : null,
                      ].filter(Boolean);
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
                                  <span className="font-medium">{titulo}</span>
                                  <span className="text-xs text-muted-foreground">{detalhes.join(" · ")}</span>
                                  {item.tipo === "diagnostico" && item.observacoes && (
                                    <span className="text-xs italic text-muted-foreground">{item.observacoes}</span>
                                  )}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{item.participantes.length}</TableCell>
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
                            item.participantes.map((p) => (
                              <TableRow key={p.id} className="text-muted-foreground">
                                <TableCell className="pl-8">{p.identificacao}</TableCell>
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
        {emAndamento ? "Gravando..." : `Finalizar (${itens.length} operação(ões), ${totalNaLista} fêmeas)`}
      </Button>

      {isIa && (
        <DialogoAdicionarDosesSemen
          localId={localId}
          especie={evento.especie}
          candidatos={candidatos}
          aberto={dosesAberto}
          onFechar={() => setDosesAberto(false)}
        />
      )}
    </div>
  );
}
