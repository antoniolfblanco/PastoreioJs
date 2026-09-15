"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Pencil, Trash2, Skull, ArrowLeftRight, Baby, Stethoscope } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apagarArea } from "@/lib/actions/areas";
import { DialogoEditarArea } from "./dialogo-editar-area";
import type { Area, AnimalResumo, MorteResumo, MovimentacaoResumo, ManejoResumo, CicloAtivo, Especie } from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];

type ChipId = "categorias" | "manejos" | "compras" | "nascimentos" | "mortes" | "movimentacoes";

const chips: { id: ChipId; rotulo: string; disponivel: boolean }[] = [
  { id: "categorias", rotulo: "Categorias", disponivel: true },
  { id: "manejos", rotulo: "Manejos Sanitários", disponivel: true },
  { id: "compras", rotulo: "Compras e Vendas", disponivel: false },
  { id: "nascimentos", rotulo: "Nascimentos", disponivel: true },
  { id: "mortes", rotulo: "Mortes", disponivel: true },
  { id: "movimentacoes", rotulo: "Movimentações", disponivel: true },
];

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

function chaveArmazenamento(localId: string) {
  return `pastoreio-js:${localId}:areas-painel:chips`;
}

type Props = {
  localId: string;
  areas: Area[];
  animais: AnimalResumo[];
  mortes: MorteResumo[];
  movimentacoes: MovimentacaoResumo[];
  manejos: ManejoResumo[];
  ciclo: CicloAtivo;
  podeEditar: boolean;
};

export function PainelAreas({ localId, areas, animais, mortes, movimentacoes, manejos, ciclo, podeEditar }: Props) {
  const [especieSelecionada, setEspecieSelecionada] = useState<Especie>("bovino");
  const [chipsAtivos, setChipsAtivos] = useState<Set<ChipId>>(new Set());
  const [areaEditando, setAreaEditando] = useState<Area | null>(null);
  const [apagando, setApagando] = useState<string | null>(null);

  // Preferência de quais seções mostrar fica salva no navegador (igual ao
  // app, que guarda isso como preferência do usuário) — só carrega depois de
  // montar, pra não divergir do HTML gerado no servidor.
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(chaveArmazenamento(localId));
      // Sincroniza com o localStorage (sistema externo) só na montagem —
      // é exatamente o caso de uso que useEffect existe pra resolver.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (salvo) setChipsAtivos(new Set(JSON.parse(salvo) as ChipId[]));
    } catch {
      // localStorage indisponível (aba privada, etc.) — segue com o padrão
    }
  }, [localId]);

  function alternarChip(id: ChipId) {
    setChipsAtivos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      try {
        localStorage.setItem(chaveArmazenamento(localId), JSON.stringify(Array.from(novo)));
      } catch {
        // ok não persistir
      }
      return novo;
    });
  }

  const animaisDaEspecie = useMemo(
    () => animais.filter((a) => a.especie === especieSelecionada),
    [animais, especieSelecionada],
  );

  const totalPorArea = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const a of animaisDaEspecie) mapa.set(a.area_id, (mapa.get(a.area_id) ?? 0) + 1);
    return mapa;
  }, [animaisDaEspecie]);

  const categoriasPorArea = useMemo(() => {
    const mapa = new Map<string, Map<string, { descricao: string; quantidade: number }>>();
    for (const a of animaisDaEspecie) {
      if (!mapa.has(a.area_id)) mapa.set(a.area_id, new Map());
      const porCategoria = mapa.get(a.area_id)!;
      const atual = porCategoria.get(a.categoria_id);
      if (atual) atual.quantidade += 1;
      else porCategoria.set(a.categoria_id, { descricao: a.categoria_descricao, quantidade: 1 });
    }
    return mapa;
  }, [animaisDaEspecie]);

  const cicloFimEfetivo = ciclo?.data_fim ?? new Date().toISOString().slice(0, 10);

  const nascimentosPorArea = useMemo(() => {
    const mapa = new Map<string, number>();
    if (!ciclo) return mapa;
    for (const a of animaisDaEspecie) {
      if (a.origem_entrada !== "nascimento" || !a.data_nascimento) continue;
      if (a.data_nascimento < ciclo.data_inicio || a.data_nascimento > cicloFimEfetivo) continue;
      mapa.set(a.area_id, (mapa.get(a.area_id) ?? 0) + 1);
    }
    return mapa;
  }, [animaisDaEspecie, ciclo, cicloFimEfetivo]);

  const mortesPorArea = useMemo(() => {
    const mapa = new Map<string, number>();
    if (!ciclo) return mapa;
    for (const m of mortes) {
      if (m.especie !== especieSelecionada || !m.area_id) continue;
      if (m.data < ciclo.data_inicio || m.data > cicloFimEfetivo) continue;
      mapa.set(m.area_id, (mapa.get(m.area_id) ?? 0) + 1);
    }
    return mapa;
  }, [mortes, especieSelecionada, ciclo, cicloFimEfetivo]);

  const movimentacoesPorArea = useMemo(() => {
    const mapa = new Map<string, MovimentacaoResumo[]>();
    for (const area of areas) {
      const tocam = movimentacoes
        .filter(
          (m) =>
            m.especie === especieSelecionada && (m.area_origem_id === area.id || m.area_destino_id === area.id),
        )
        .slice(0, 3);
      mapa.set(area.id, tocam);
    }
    return mapa;
  }, [areas, movimentacoes, especieSelecionada]);

  const manejosPorArea = useMemo(() => {
    const mapa = new Map<string, ManejoResumo[]>();
    for (const area of areas) {
      const tocam = manejos.filter((m) => m.especie === especieSelecionada && m.area_id === area.id).slice(0, 3);
      mapa.set(area.id, tocam);
    }
    return mapa;
  }, [areas, manejos, especieSelecionada]);

  async function excluir(area: Area) {
    if (!confirm(`Apagar a área "${area.nome}"?`)) return;
    setApagando(area.id);
    try {
      await apagarArea(localId, area.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    } finally {
      setApagando(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Painel de Áreas</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do rebanho por área — clique numa área pra ver os animais dela.
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

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            disabled={!chip.disponivel}
            title={chip.disponivel ? undefined : "Em breve"}
            onClick={() => chip.disponivel && alternarChip(chip.id)}
            className={cn(
              buttonVariants({ variant: chipsAtivos.has(chip.id) ? "secondary" : "outline", size: "sm" }),
              !chip.disponivel && "cursor-not-allowed opacity-50",
            )}
          >
            {chip.rotulo}
          </button>
        ))}
      </div>

      {areas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <MapPin className="size-8" />
          <p>Nenhuma área cadastrada ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {areas.map((area) => {
            const total = totalPorArea.get(area.id) ?? 0;
            const categorias = Array.from(categoriasPorArea.get(area.id)?.values() ?? []).sort(
              (a, b) => b.quantidade - a.quantidade,
            );
            const nascimentos = nascimentosPorArea.get(area.id) ?? 0;
            const mortesArea = mortesPorArea.get(area.id) ?? 0;
            const movsArea = movimentacoesPorArea.get(area.id) ?? [];
            const manejosArea = manejosPorArea.get(area.id) ?? [];
            const linkAnimais = `/${localId}/animais?especie=${especieSelecionada}&area=${area.id}`;

            return (
              <div key={area.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={linkAnimais} className="flex min-w-0 items-start gap-2 hover:underline">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium">{area.nome}</span>
                      <span className="text-sm text-muted-foreground">
                        {especies.find((e) => e.value === especieSelecionada)?.rotulo}: {total}
                      </span>
                    </div>
                  </Link>
                  {podeEditar && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Editar"
                        onClick={() => setAreaEditando(area)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        title="Apagar"
                        disabled={apagando === area.id}
                        onClick={() => excluir(area)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {chipsAtivos.has("categorias") && categorias.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1 border-t pt-3 pl-6">
                    {categorias.map((c) => (
                      <Link
                        key={c.descricao}
                        href={linkAnimais}
                        className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground hover:underline"
                      >
                        <span>{c.descricao}</span>
                        <span className="tabular-nums">{c.quantidade}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {chipsAtivos.has("nascimentos") && ciclo && (
                  <div className="mt-3 border-t pt-3 pl-6">
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Baby className="size-4" />
                      Nascimentos no ciclo: {nascimentos}
                    </span>
                  </div>
                )}

                {chipsAtivos.has("mortes") && ciclo && (
                  <div className="mt-3 border-t pt-3 pl-6">
                    <Link
                      href={`/${localId}/ocorrencias/mortes`}
                      className="flex items-center gap-1.5 text-sm text-destructive hover:underline"
                    >
                      <Skull className="size-4" />
                      Mortes no ciclo: {mortesArea}
                    </Link>
                  </div>
                )}

                {chipsAtivos.has("movimentacoes") && movsArea.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1 border-t pt-3 pl-6">
                    {movsArea.map((m) => (
                      <Link
                        key={m.movimentacao_grupo_id}
                        href={`/${localId}/areas/movimentacao`}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
                      >
                        <ArrowLeftRight className="size-4 shrink-0" />
                        <span className="truncate">
                          {m.area_origem_nome ?? "—"} → {m.area_destino_nome ?? "—"} ({m.quantidade}{" "}
                          {m.quantidade === 1 ? "animal" : "animais"}) — {formatarData(m.data)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                {chipsAtivos.has("manejos") && manejosArea.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2 border-t pt-3 pl-6">
                    {manejosArea.map((m) => (
                      <Link
                        key={m.id}
                        href={`/${localId}/manejos/sanitarios`}
                        className="flex items-start gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Stethoscope className="mt-0.5 size-4 shrink-0" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate hover:underline">
                            {m.descricao ?? "Manejo sanitário"} ({m.quantidade}{" "}
                            {m.quantidade === 1 ? "animal" : "animais"}) — {formatarData(m.data)}
                          </span>
                          {(m.medicamentos.length > 0 || m.responsavel) && (
                            <span className="truncate text-xs">
                              {m.medicamentos.length > 0 && m.medicamentos.join(", ")}
                              {m.medicamentos.length > 0 && m.responsavel && " · "}
                              {m.responsavel && `Responsável: ${m.responsavel}`}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {podeEditar && <DialogoEditarArea localId={localId} area={areaEditando} onFechar={() => setAreaEditando(null)} />}
    </div>
  );
}
