"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import type { Animal } from "./page";

export function identificacaoCompleta(a: Animal) {
  return [a.brinco, a.tatuagem, a.nome, a.raca_descricao].filter(Boolean).join(" • ") || "Sem identificação";
}

// Busca restrita ao local atual (não cruza com outros locais do usuário,
// diferente do PastoreioApp) — cobre o caso comum de rebanho de uma fazenda
// só. Sempre exclui castrados (não fazem mais sentido como reprodutor).
export function SeletorAnimalDialog({
  aberto,
  titulo,
  sexo,
  animais,
  excluirId,
  onSelecionar,
  onFechar,
}: {
  aberto: boolean;
  titulo: string;
  sexo: "macho" | "femea";
  animais: Animal[];
  excluirId?: string;
  onSelecionar: (id: string, resumo: string) => void;
  onFechar: () => void;
}) {
  const [busca, setBusca] = useState("");

  const candidatos = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    return animais.filter((a) => {
      if (a.id === excluirId) return false;
      if (a.sexo !== sexo) return false;
      if (a.castrado) return false;
      if (!buscaMin) return true;
      return [a.nome, a.brinco, a.tatuagem]
        .filter(Boolean)
        .some((texto) => texto!.toLowerCase().includes(buscaMin));
    });
  }, [animais, busca, sexo, excluirId]);

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
