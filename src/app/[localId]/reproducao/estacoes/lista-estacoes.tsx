"use client";

import { useMemo, useState, useActionState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil, CalendarRange, ChevronRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FiltroMultiSelecao } from "@/components/filtro-multi-selecao";
import { cn } from "@/lib/utils";
import {
  salvarEstacaoReprodutiva,
  apagarEstacaoReprodutiva,
  buscarResumoEstacaoParaExclusao,
} from "@/lib/actions/estacoes-reprodutivas";
import { DialogoApagarReprodutivo, type ResumoExclusaoReprodutiva } from "../_componentes/dialogo-apagar-reprodutivo";
import type { Estacao, EventoResumo, Especie, Metodo } from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];

const rotulosStatus: Record<string, string> = { ativa: "Ativa", encerrada: "Encerrada" };

const rotulosMetodo: Record<Metodo, string> = {
  monta_natural: "Monta natural",
  inseminacao_artificial: "Inseminação artificial",
  te_fiv: "TE/FIV",
};

const hojeISO = new Date().toISOString().slice(0, 10);

function formatarData(data: string | null) {
  return data ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR") : "Em aberto";
}

function formatarPercentual(parte: number, total: number) {
  if (total === 0) return "—";
  return `${Math.round((parte / total) * 100)}%`;
}

type Props = {
  localId: string;
  estacoes: Estacao[];
  podeEditar: boolean;
};

export function ListaEstacoes({ localId, estacoes, podeEditar }: Props) {
  const [especieSelecionada, setEspecieSelecionada] = useState<Especie>("bovino");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<Set<string>>(new Set());
  const [selecionadoId, setSelecionadoId] = useState<string | "novo" | null>(null);
  const [carregandoId, setCarregandoId] = useState<string | null>(null);
  const [apagando, setApagando] = useState<{ estacao: Estacao; resumo: ResumoExclusaoReprodutiva } | null>(null);
  const [apagandoEmAndamento, setApagandoEmAndamento] = useState(false);

  // Estações antigas (criadas antes da separação por espécie) não têm
  // espécie definida — mostra elas em qualquer aba, já que podem se
  // referir a qualquer uma.
  const estacoesDaEspecie = useMemo(
    () => estacoes.filter((e) => e.especie === especieSelecionada || e.especie === null),
    [estacoes, especieSelecionada],
  );

  const estacaoAtivaDaEspecie = useMemo(
    () => estacoesDaEspecie.find((e) => e.ativo) ?? null,
    [estacoesDaEspecie],
  );

  const dados = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    const filtrados = estacoesDaEspecie.filter((e) => {
      if (statusFiltro.size > 0 && !statusFiltro.has(e.ativo ? "ativa" : "encerrada")) return false;
      if (!buscaMin) return true;
      return e.nome.toLowerCase().includes(buscaMin);
    });

    return [...filtrados].sort((a, b) => (a.ativo === b.ativo ? (a.data_inicio < b.data_inicio ? 1 : -1) : a.ativo ? -1 : 1));
  }, [estacoesDaEspecie, busca, statusFiltro]);

  const selecionado =
    selecionadoId === null
      ? null
      : selecionadoId === "novo"
        ? "novo"
        : (estacoes.find((e) => e.id === selecionadoId) ?? null);

  function novaEstacao() {
    if (estacaoAtivaDaEspecie) {
      const rotulo = especies.find((e) => e.value === especieSelecionada)?.rotulo ?? especieSelecionada;
      const confirmado = confirm(
        `Já existe uma estação ativa (${rotulo}): "${estacaoAtivaDaEspecie.nome}". Abrir uma nova vai encerrar ela. Confirma?`,
      );
      if (!confirmado) return;
    }
    setSelecionadoId("novo");
  }

  async function abrirExclusao(e: Estacao) {
    setCarregandoId(e.id);
    try {
      const resumo = await buscarResumoEstacaoParaExclusao(e.id);
      setApagando({ estacao: e, resumo });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível carregar a estação.");
    } finally {
      setCarregandoId(null);
    }
  }

  async function confirmarExclusao() {
    if (!apagando) return;
    setApagandoEmAndamento(true);
    try {
      await apagarEstacaoReprodutiva(localId, apagando.estacao.id);
      setApagando(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível apagar.");
    } finally {
      setApagandoEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Estação Reprodutiva</h1>
          <p className="text-sm text-muted-foreground">
            Períodos de monta/cobertura do rebanho — cada espécie tem sua própria estação ativa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {especies.map((e) => (
            <button
              key={e.value}
              onClick={() => setEspecieSelecionada(e.value)}
              className={cn(
                buttonVariants({ variant: especieSelecionada === e.value ? "secondary" : "ghost", size: "sm" }),
              )}
            >
              {e.rotulo}
            </button>
          ))}
        </div>
      </div>

      {podeEditar && (
        <div>
          <Button size="sm" onClick={novaEstacao}>
            <Plus className="size-4" />
            Nova estação
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full md:max-w-64"
        />
        <FiltroMultiSelecao
          rotulo="Todos os status"
          className="w-full md:w-auto"
          selecionados={statusFiltro}
          onChange={setStatusFiltro}
          opcoes={Object.entries(rotulosStatus).map(([value, label]) => ({ value, label }))}
        />
        <span className="text-sm text-muted-foreground">{dados.length} estação(ões)</span>
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <CalendarRange className="size-8" />
          <p>Nenhuma estação reprodutiva encontrada.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {dados.map((e) => (
            <div key={e.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{e.nome}</span>
                    {e.especie === null && (
                      <Badge variant="outline" title="Criada antes da separação por espécie">
                        Legado
                      </Badge>
                    )}
                    <Badge variant={e.ativo ? "secondary" : "outline"}>{e.ativo ? "Ativa" : "Encerrada"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatarData(e.data_inicio)} — {formatarData(e.data_fim)}
                  </p>
                </div>
                {podeEditar && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-7" title="Editar" onClick={() => setSelecionadoId(e.id)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      title="Apagar"
                      disabled={carregandoId === e.id}
                      onClick={() => abrirExclusao(e)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                <Link
                  href={`/${localId}/reproducao/eventos?estacao=${e.id}`}
                  className="flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  Eventos reprodutivos ({e.eventos.length})
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>

              {e.eventos.length === 0 ? (
                <p className="mt-2 pl-1 text-sm text-muted-foreground">Nenhum evento criado nesta estação ainda.</p>
              ) : (
                <div className="mt-2 flex flex-col gap-2 pl-1">
                  {e.eventos.map((ev) => (
                    <LinhaEvento key={ev.id} evento={ev} />
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-col gap-1 rounded-md bg-muted/30 p-3">
                <p className="text-sm font-medium">Total da estação (cada vaca conta uma vez)</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>Vacas acasaladas: {e.totalVacas}</span>
                  <span>
                    Diagnosticadas: {e.totalDiagnosticadas} ({formatarPercentual(e.totalDiagnosticadas, e.totalVacas)})
                  </span>
                  <span>Prenhes: {e.totalPrenhes}</span>
                  <span>Vazias: {e.totalVazias}</span>
                  <span>Inconclusivos: {e.totalInconclusivos}</span>
                  {e.totalEmbrioesTransferidos > 0 && <span>Embriões transferidos: {e.totalEmbrioesTransferidos}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {podeEditar && (
        <DialogoEstacao
          key={selecionadoId ?? "fechado"}
          localId={localId}
          especie={especieSelecionada}
          estacao={selecionado}
          onFechar={() => setSelecionadoId(null)}
        />
      )}

      <DialogoApagarReprodutivo
        titulo="Apagar esta estação?"
        nome={apagando?.estacao.nome ?? ""}
        resumo={apagando?.resumo ?? null}
        emAndamento={apagandoEmAndamento}
        onConfirmar={confirmarExclusao}
        onFechar={() => setApagando(null)}
      />
    </div>
  );
}

function LinhaEvento({ evento }: { evento: EventoResumo }) {
  const isTeFiv = evento.metodo === "te_fiv";
  return (
    <div className="rounded-md border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{evento.nome}</span>
        <span className="text-xs text-muted-foreground">{rotulosMetodo[evento.metodo]}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span>{isTeFiv ? `Embriões transferidos: ${evento.totalSujeitos}` : `Vacas acasaladas: ${evento.totalSujeitos}`}</span>
        <span>
          Diagnosticadas: {evento.diagnosticados} ({formatarPercentual(evento.diagnosticados, evento.totalSujeitos)})
        </span>
        <span>Prenhes: {evento.prenhes}</span>
        <span>Vazias: {evento.vazias}</span>
        <span>Inconclusivos: {evento.inconclusivos}</span>
      </div>
    </div>
  );
}

function DialogoEstacao({
  localId,
  especie,
  estacao,
  onFechar,
}: {
  localId: string;
  especie: Especie;
  estacao: Estacao | "novo" | null;
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(salvarEstacaoReprodutiva, undefined);
  const existente = estacao && estacao !== "novo" ? estacao : null;
  const [encerrada, setEncerrada] = useState(existente?.data_fim != null);
  const [dataFim, setDataFim] = useState(existente?.data_fim ?? hojeISO);

  useEffect(() => {
    if (resultado !== undefined && !resultado.erro) onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  const rotuloEspecie = especies.find((e) => e.value === especie)?.rotulo ?? especie;

  return (
    <Dialog open={estacao !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existente ? "Editar estação" : `Nova estação reprodutiva — ${rotuloEspecie}`}
          </DialogTitle>
        </DialogHeader>
        {estacao && (
          <form key={existente?.id ?? "novo"} action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            {existente ? (
              <input type="hidden" name="id" value={existente.id} />
            ) : (
              <input type="hidden" name="especie" value={especie} />
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                required
                autoFocus
                placeholder={`Estação ${new Date().getFullYear()}`}
                defaultValue={existente?.nome ?? `Estação ${new Date().getFullYear()}`}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dataInicio">Início da estação</Label>
              <Input
                id="dataInicio"
                name="dataInicio"
                type="date"
                required
                max={existente ? undefined : hojeISO}
                defaultValue={existente?.data_inicio ?? hojeISO}
              />
            </div>
            {existente && (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="encerrada"
                    checked={encerrada}
                    onCheckedChange={(v) => {
                      const valor = v === true;
                      setEncerrada(valor);
                      if (valor && !dataFim) setDataFim(hojeISO);
                    }}
                  />
                  <Label htmlFor="encerrada">Estação encerrada</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {encerrada
                    ? "Encerrada; reabrir encerra a que estiver ativa nesta espécie."
                    : "Está aberta — é a estação ativa desta espécie."}
                </p>
                {encerrada && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="dataFim">Fim da estação</Label>
                    <Input
                      id="dataFim"
                      name="dataFim"
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}
            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento}>
                {emAndamento ? "Salvando..." : existente ? "Salvar" : "Abrir"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
