"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CandidatoGenetico, Especie } from "./page";

export function identificacaoCandidato(a: CandidatoGenetico) {
  const base = [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
  return a.externo ? `${base} (externo)` : base;
}

// Seleciona touro/doadora entre os candidatos do local (próprios ativos +
// externos) — sêmen e embrião comprado de fora é o uso mais comum daqui.
export function SeletorAnimalGenetico({
  aberto,
  titulo,
  sexo,
  especie,
  candidatos,
  onSelecionar,
  onFechar,
}: {
  aberto: boolean;
  titulo: string;
  sexo: "macho" | "femea";
  especie: Especie;
  candidatos: CandidatoGenetico[];
  onSelecionar: (id: string, resumo: string) => void;
  onFechar: () => void;
}) {
  const [busca, setBusca] = useState("");

  const resultados = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    return candidatos.filter((a) => {
      if (a.sexo !== sexo) return false;
      if (a.especie !== especie) return false;
      if (!buscaMin) return true;
      return [a.nome, a.brinco, a.tatuagem].filter(Boolean).some((texto) => texto!.toLowerCase().includes(buscaMin));
    });
  }, [candidatos, busca, sexo, especie]);

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
        <div className="h-80 overflow-y-auto rounded-md border">
          {resultados.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum animal encontrado.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {resultados.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelecionar(a.id, identificacaoCandidato(a))}
                  className="px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  {identificacaoCandidato(a)}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
