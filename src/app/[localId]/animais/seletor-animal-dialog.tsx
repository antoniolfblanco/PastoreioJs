"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import type { Especie, Sexo } from "./page";

// Candidato a pai/mãe/receptora: animal próprio (ativo ou que já saiu do
// rebanho) ou externo. `etiqueta` diz de onde ele vem quando não é do rebanho
// ativo ("externo", "vendido"...).
export type CandidatoParente = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  sexo: Sexo;
  especie: Especie;
  castrado: boolean;
  raca_descricao: string;
  etiqueta: string | null;
};

export function identificacaoCompleta(a: {
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  raca_descricao: string;
  etiqueta?: string | null;
}) {
  const base = [a.brinco, a.tatuagem, a.nome, a.raca_descricao].filter(Boolean).join(" • ") || "Sem identificação";
  return a.etiqueta ? `${base} (${a.etiqueta})` : base;
}

// Busca no local atual: rebanho ativo, externos e os próprios que já
// saíram (um pai vendido continua sendo o pai). Só a espécie do animal e
// nunca castrados. A receptora (`somenteRebanho`) só vem do rebanho ativo.
export function SeletorAnimalDialog({
  aberto,
  titulo,
  sexo,
  candidatos: todos,
  especie,
  somenteRebanho,
  excluirId,
  onSelecionar,
  onFechar,
}: {
  aberto: boolean;
  titulo: string;
  sexo: "macho" | "femea";
  candidatos: CandidatoParente[];
  especie: Especie;
  somenteRebanho?: boolean;
  excluirId?: string;
  onSelecionar: (id: string, resumo: string) => void;
  onFechar: () => void;
}) {
  const [busca, setBusca] = useState("");

  const candidatos = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    return todos.filter((a) => {
      if (a.id === excluirId) return false;
      if (a.sexo !== sexo) return false;
      if (a.especie !== especie) return false;
      if (a.castrado) return false;
      if (somenteRebanho && a.etiqueta) return false;
      if (!buscaMin) return true;
      return [a.nome, a.brinco, a.tatuagem]
        .filter(Boolean)
        .some((texto) => texto!.toLowerCase().includes(buscaMin));
    });
  }, [todos, busca, sexo, especie, somenteRebanho, excluirId]);

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
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {candidatos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum animal encontrado.</p>
          ) : (
            candidatos.map((a) => (
              <Card
                key={a.id}
                className="cursor-pointer gap-0 px-3 py-2 hover:bg-muted/40"
                onClick={() => {
                  onSelecionar(a.id, identificacaoCompleta(a));
                  fechar(false);
                }}
              >
                <span className="font-medium">{identificacaoCompleta(a)}</span>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
