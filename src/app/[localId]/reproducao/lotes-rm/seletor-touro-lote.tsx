"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import type { CandidatoTouro } from "./page";

function identificacaoCompleta(a: CandidatoTouro) {
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

// Busca só entre touros próprios (nunca externo — monta natural em lote
// exige presença física do touro no rebanho) que ainda não estão no lote.
export function SeletorTouroLote({
  aberto,
  candidatos,
  jaNoLote,
  onSelecionar,
  onFechar,
}: {
  aberto: boolean;
  candidatos: CandidatoTouro[];
  jaNoLote: Set<string>;
  onSelecionar: (id: string) => void;
  onFechar: () => void;
}) {
  const [busca, setBusca] = useState("");

  const resultados = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    return candidatos.filter((a) => {
      if (jaNoLote.has(a.id)) return false;
      if (!buscaMin) return true;
      return [a.nome, a.brinco, a.tatuagem].filter(Boolean).some((texto) => texto!.toLowerCase().includes(buscaMin));
    });
  }, [candidatos, busca, jaNoLote]);

  function fechar(estaAberto: boolean) {
    if (estaAberto) return;
    setBusca("");
    onFechar();
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar touro ao lote</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Buscar por nome, brinco ou tatuagem..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          autoFocus
        />
        <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {resultados.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum touro próprio encontrado.</p>
          )}
          {resultados.map((a) => (
            <Card
              key={a.id}
              className="cursor-pointer p-3 text-sm hover:bg-muted/50"
              onClick={() => onSelecionar(a.id)}
            >
              {identificacaoCompleta(a)}
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
