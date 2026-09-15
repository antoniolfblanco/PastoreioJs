"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import type { CandidatoGenealogia } from "./page";

export function identificacaoCompleta(a: CandidatoGenealogia) {
  const base = [a.brinco, a.tatuagem, a.nome, a.raca_descricao].filter(Boolean).join(" • ") || "Sem identificação";
  return a.externo ? `${base} (externo)` : base;
}

// Busca pai/mãe entre os candidatos do local (próprios ativos + outros
// externos) — um ancestral comprado também pode ter pai/mãe registrados só
// pra genealogia. Sempre exclui castrados (não fazem mais sentido como
// reprodutor).
export function SeletorAnimalParente({
  aberto,
  titulo,
  sexo,
  candidatos,
  excluirId,
  onSelecionar,
  onFechar,
}: {
  aberto: boolean;
  titulo: string;
  sexo: "macho" | "femea";
  candidatos: CandidatoGenealogia[];
  excluirId?: string;
  onSelecionar: (id: string, resumo: string) => void;
  onFechar: () => void;
}) {
  const [busca, setBusca] = useState("");

  const resultados = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    return candidatos.filter((a) => {
      if (a.id === excluirId) return false;
      if (a.sexo !== sexo) return false;
      if (a.castrado) return false;
      if (!buscaMin) return true;
      return [a.nome, a.brinco, a.tatuagem].filter(Boolean).some((texto) => texto!.toLowerCase().includes(buscaMin));
    });
  }, [candidatos, busca, sexo, excluirId]);

  function fechar(estaAberto: boolean) {
    if (estaAberto) return;
    setBusca("");
    onFechar();
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Buscar por nome, brinco ou tatuagem..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          autoFocus
        />
        <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {resultados.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum animal encontrado.</p>}
          {resultados.map((a) => (
            <Card
              key={a.id}
              className="cursor-pointer p-3 text-sm hover:bg-muted/50"
              onClick={() => onSelecionar(a.id, identificacaoCompleta(a))}
            >
              {identificacaoCompleta(a)}
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
