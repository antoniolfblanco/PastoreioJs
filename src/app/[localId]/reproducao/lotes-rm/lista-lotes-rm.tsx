"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apagarLoteRm, adicionarTouroLote, removerTouroLote } from "@/lib/actions/lotes-rm";
import { DialogoLoteRm } from "./dialogo-lote-rm";
import { SeletorTouroLote } from "./seletor-touro-lote";
import type { CandidatoTouro, LoteRm } from "./page";

type Props = {
  localId: string;
  lotes: LoteRm[];
  candidatos: CandidatoTouro[];
  podeEditar: boolean;
};

export function ListaLotesRm({ localId, lotes, candidatos, podeEditar }: Props) {
  const [selecionado, setSelecionado] = useState<LoteRm | "novo" | null>(null);
  const [loteAdicionandoTouro, setLoteAdicionandoTouro] = useState<LoteRm | null>(null);
  const [emAndamento, setEmAndamento] = useState<string | null>(null);

  async function excluir(lote: LoteRm) {
    if (!confirm(`Apagar o lote "${lote.nome}"?`)) return;
    try {
      const resultado = await apagarLoteRm(localId, lote.id);
      if (resultado.error) alert(resultado.error);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    }
  }

  async function adicionarTouro(lote: LoteRm, touroId: string) {
    setEmAndamento(`${lote.id}:${touroId}`);
    try {
      const resultado = await adicionarTouroLote(localId, lote.id, touroId);
      if (resultado.error) {
        alert(resultado.error);
        return;
      }
      setLoteAdicionandoTouro(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível adicionar o touro.");
    } finally {
      setEmAndamento(null);
    }
  }

  async function removerTouro(lote: LoteRm, touroId: string) {
    setEmAndamento(`${lote.id}:${touroId}`);
    try {
      const resultado = await removerTouroLote(localId, lote.id, touroId);
      if (resultado.error) alert(resultado.error);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível remover.");
    } finally {
      setEmAndamento(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Lotes RM (Rebanho Múltiplo)</h1>
          <p className="text-sm text-muted-foreground">
            Grupos de touros próprios soltos junto com as fêmeas na monta natural, usados quando não dá pra
            saber qual touro cobriu cada uma.
          </p>
        </div>
        {podeEditar && (
          <Button size="sm" onClick={() => setSelecionado("novo")}>
            <Plus className="size-4" />
            Novo lote
          </Button>
        )}
      </div>

      {lotes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <Users className="size-8" />
          <p>Nenhum lote RM cadastrado ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lotes.map((lote) => {
            return (
              <div key={lote.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium">{lote.nome}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {lote.touros.length} {lote.touros.length === 1 ? "touro" : "touros"}
                    </span>
                  </div>
                  {podeEditar && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon" className="size-7" title="Renomear" onClick={() => setSelecionado(lote)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        title="Apagar"
                        onClick={() => excluir(lote)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {lote.touros.map((touro) => (
                    <span
                      key={touro.id}
                      className="inline-flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-3 text-sm"
                    >
                      {touro.identificacao}
                      {podeEditar && (
                        <button
                          type="button"
                          disabled={emAndamento === `${lote.id}:${touro.id}`}
                          onClick={() => removerTouro(lote, touro.id)}
                          className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </span>
                  ))}
                  {podeEditar && (
                    <button
                      type="button"
                      onClick={() => setLoteAdicionandoTouro(lote)}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground hover:border-foreground hover:text-foreground"
                    >
                      <Plus className="size-3.5" />
                      Touro
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {podeEditar && <DialogoLoteRm key={selecionado === "novo" ? "novo" : (selecionado?.id ?? "fechado")} localId={localId} lote={selecionado} onFechar={() => setSelecionado(null)} />}

      {podeEditar && (
        <SeletorTouroLote
          aberto={loteAdicionandoTouro !== null}
          candidatos={candidatos}
          jaNoLote={loteAdicionandoTouro ? new Set(loteAdicionandoTouro.touros.map((t) => t.id)) : new Set()}
          onSelecionar={(touroId) => loteAdicionandoTouro && adicionarTouro(loteAdicionandoTouro, touroId)}
          onFechar={() => setLoteAdicionandoTouro(null)}
        />
      )}
    </div>
  );
}
