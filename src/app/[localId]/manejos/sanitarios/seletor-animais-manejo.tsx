"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { AnimalManejo, Especie } from "./page";

function identificacao(a: AnimalManejo) {
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

export function SeletorAnimaisManejo({
  aberto,
  especie,
  animais,
  selecionadosIniciais,
  onFechar,
  onConfirmar,
}: {
  aberto: boolean;
  especie: Especie;
  animais: AnimalManejo[];
  selecionadosIniciais: Set<string>;
  onFechar: () => void;
  onConfirmar: (selecionados: Set<string>) => void;
}) {
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set(selecionadosIniciais));

  const animaisDaEspecie = useMemo(() => animais.filter((a) => a.especie === especie), [animais, especie]);

  const dados = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    if (!buscaMin) return animaisDaEspecie;
    return animaisDaEspecie.filter((a) =>
      [a.nome, a.brinco, a.tatuagem, a.raca_descricao].filter(Boolean).some((t) => t!.toLowerCase().includes(buscaMin)),
    );
  }, [animaisDaEspecie, busca]);

  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        if (!valor) onFechar();
      }}
    >
      <DialogContent key={aberto ? "aberto" : "fechado"} className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Selecionar animais</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Buscar por nome, brinco, tatuagem ou raça..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">{selecionados.size} selecionado(s)</p>
          <div className="h-80 overflow-y-auto rounded-md border">
            <div className="flex flex-col divide-y">
              {dados.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Nenhum animal encontrado.</p>
              )}
              {dados.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <Checkbox checked={selecionados.has(a.id)} onCheckedChange={() => alternar(a.id)} />
                  <span className="flex-1">{identificacao(a)}</span>
                  <span className="text-muted-foreground">{a.categoria_descricao}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onConfirmar(selecionados)}>
            Confirmar ({selecionados.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
