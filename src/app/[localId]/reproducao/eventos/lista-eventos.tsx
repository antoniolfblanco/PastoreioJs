"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, CalendarClock, Repeat } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { apagarEventoReprodutivo, buscarResumoEventoParaExclusao } from "@/lib/actions/eventos-reprodutivos";
import { DialogoApagarReprodutivo, type ResumoExclusaoReprodutiva } from "../_componentes/dialogo-apagar-reprodutivo";
import { DialogoEvento, type EventoParaEditar } from "./dialogo-evento";
import type { Especie, Estacao, Evento, Metodo } from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];

const rotulosMetodo: Record<Metodo, string> = {
  monta_natural: "Monta natural",
  inseminacao_artificial: "Inseminação artificial",
  te_fiv: "TE/FIV",
};

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

type Props = {
  localId: string;
  estacoes: Estacao[];
  eventos: Evento[];
  podeEditar: boolean;
};

export function ListaEventos({ localId, estacoes, eventos, podeEditar }: Props) {
  const [especieSelecionada, setEspecieSelecionada] = useState<Especie>("bovino");
  const [alvo, setAlvo] = useState<EventoParaEditar | "novo" | null>(null);
  const [carregandoId, setCarregandoId] = useState<string | null>(null);
  const [apagando, setApagando] = useState<{ evento: Evento; resumo: ResumoExclusaoReprodutiva } | null>(null);
  const [apagandoEmAndamento, setApagandoEmAndamento] = useState(false);

  const estacaoAtiva = useMemo(
    () =>
      estacoes.find((e) => e.ativo && e.especie === especieSelecionada) ??
      estacoes.find((e) => e.ativo && e.especie === null) ??
      null,
    [estacoes, especieSelecionada],
  );

  const eventosDaEstacao = useMemo(
    () => (estacaoAtiva ? eventos.filter((ev) => ev.estacao_id === estacaoAtiva.id) : []),
    [eventos, estacaoAtiva],
  );

  async function abrirEdicao(evento: Evento) {
    setCarregandoId(evento.id);
    try {
      const resumo = await buscarResumoEventoParaExclusao(evento.id);
      setAlvo({ evento, temCobertura: resumo.coberturas > 0 });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível carregar o evento.");
    } finally {
      setCarregandoId(null);
    }
  }

  async function abrirExclusao(evento: Evento) {
    setCarregandoId(evento.id);
    try {
      const resumo = await buscarResumoEventoParaExclusao(evento.id);
      setApagando({ evento, resumo });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível carregar o evento.");
    } finally {
      setCarregandoId(null);
    }
  }

  async function confirmarExclusao() {
    if (!apagando) return;
    setApagandoEmAndamento(true);
    try {
      await apagarEventoReprodutivo(localId, apagando.evento.id);
      setApagando(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    } finally {
      setApagandoEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Eventos Reprodutivos</h1>
          <p className="text-sm text-muted-foreground">
            Cada evento (ex.: &quot;IATF Lote 1&quot;) agrupa as fêmeas que vão participar da mesma rodada de
            cobertura.
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

      {!estacaoAtiva ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          <Repeat className="size-8" />
          <p className="max-w-sm text-sm">
            Nenhuma estação reprodutiva ativa de {especies.find((e) => e.value === especieSelecionada)?.rotulo.toLowerCase()}.
            Abra uma estação antes de criar eventos.
          </p>
          <Link href={`/${localId}/reproducao/estacoes`} className={buttonVariants({ size: "sm" })}>
            Ir para Estação Reprodutiva
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Estação ativa: <span className="font-medium text-foreground">{estacaoAtiva.nome}</span>
            </p>
            {podeEditar && (
              <Button size="sm" onClick={() => setAlvo("novo")}>
                <Plus className="size-4" />
                Novo evento
              </Button>
            )}
          </div>

          {eventosDaEstacao.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-muted-foreground">
              <CalendarClock className="size-8" />
              <p>Nenhum evento criado nesta estação ainda.</p>
              <p className="max-w-sm text-sm">
                Ex.: &quot;IATF Lote 1&quot; — um evento agrupa as fêmeas que vão participar da mesma rodada de
                cobertura.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Início</TableHead>
                  {podeEditar && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventosDaEstacao.map((ev) => (
                  <TableRow
                    key={ev.id}
                    className={podeEditar ? "cursor-pointer" : undefined}
                    onClick={() => podeEditar && carregandoId === null && abrirEdicao(ev)}
                  >
                    <TableCell className="font-medium">{ev.nome}</TableCell>
                    <TableCell>{rotulosMetodo[ev.metodo]}</TableCell>
                    <TableCell>{formatarData(ev.data_inicio)}</TableCell>
                    {podeEditar && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive"
                          title="Apagar"
                          disabled={carregandoId === ev.id}
                          onClick={() => abrirExclusao(ev)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-sm font-normal text-muted-foreground">
                    {eventosDaEstacao.length} {eventosDaEstacao.length === 1 ? "evento" : "eventos"}
                  </TableCell>
                  {podeEditar && <TableCell />}
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </>
      )}

      {podeEditar && (
        <DialogoEvento
          key={alvo === "novo" ? "novo" : alvo === null ? "fechado" : alvo.evento.id}
          localId={localId}
          estacaoId={estacaoAtiva?.id ?? null}
          especieInicial={especieSelecionada}
          alvo={alvo}
          onFechar={() => setAlvo(null)}
        />
      )}

      <DialogoApagarReprodutivo
        titulo="Apagar este evento?"
        nome={apagando?.evento.nome ?? ""}
        resumo={apagando?.resumo ?? null}
        emAndamento={apagandoEmAndamento}
        onConfirmar={confirmarExclusao}
        onFechar={() => setApagando(null)}
      />
    </div>
  );
}
