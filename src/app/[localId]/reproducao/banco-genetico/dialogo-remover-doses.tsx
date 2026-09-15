"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { removerDosesSemen } from "@/lib/actions/banco-genetico";
import type { TouroComEstoque } from "./page";

// Correção manual (dose perdida/danificada) — a RPC recusa se não houver
// doses suficientes, então o erro do servidor já explica isso ao usuário.
export function DialogoRemoverDoses({
  localId,
  touro,
  onFechar,
}: {
  localId: string;
  touro: TouroComEstoque | null;
  onFechar: () => void;
}) {
  const [quantidade, setQuantidade] = useState("1");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  async function remover() {
    if (!touro) return;
    const valor = Number(quantidade);
    if (!Number.isInteger(valor) || valor < 1) {
      setErro("Informe uma quantidade válida.");
      return;
    }
    setEmAndamento(true);
    setErro(undefined);
    try {
      await removerDosesSemen(localId, touro.touro_id, valor);
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível remover.");
    } finally {
      setEmAndamento(false);
    }
  }

  return (
    <Dialog open={touro !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent key={touro?.touro_id ?? "fechado"} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remover doses — {touro?.identificacao}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="quantidadeRemover">Quantidade a remover</Label>
            <Input
              id="quantidadeRemover"
              type="number"
              min={1}
              autoFocus
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <DialogFooter>
            <Button type="button" disabled={emAndamento} onClick={remover}>
              {emAndamento ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
