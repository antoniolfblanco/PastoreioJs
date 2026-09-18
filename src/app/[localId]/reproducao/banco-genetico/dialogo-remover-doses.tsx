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
  return (
    <Dialog open={touro !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remover doses — {touro?.identificacao}</DialogTitle>
        </DialogHeader>
        {/* Chave no conteúdo, nunca no DialogContent: remontar o Popup no
            meio da própria transição de fechamento fazia a janela "voltar"
            — reabrir sozinha assim que o usuário clicava. */}
        {touro && (
          <ConteudoRemoverDoses key={touro.touro_id} localId={localId} touro={touro} onFechar={onFechar} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoRemoverDoses({
  localId,
  touro,
  onFechar,
}: {
  localId: string;
  touro: TouroComEstoque;
  onFechar: () => void;
}) {
  const [quantidade, setQuantidade] = useState("1");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  async function remover() {
    const valor = Number(quantidade);
    if (!Number.isInteger(valor) || valor < 1) {
      setErro("Informe uma quantidade válida.");
      return;
    }
    setEmAndamento(true);
    setErro(undefined);
    try {
      const resultado = await removerDosesSemen(localId, touro.touro_id, valor);
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível remover.");
    } finally {
      setEmAndamento(false);
    }
  }

  return (
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
  );
}
