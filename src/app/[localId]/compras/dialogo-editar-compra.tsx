"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { atualizarCompra } from "@/lib/actions/compras";
import type { Compra } from "./page";

export function DialogoEditarCompra({
  localId,
  compra,
  onFechar,
}: {
  localId: string;
  compra: Compra | null;
  onFechar: () => void;
}) {
  return (
    <Dialog open={compra !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar compra</DialogTitle>
        </DialogHeader>
        {compra && <ConteudoEditarCompra key={compra.id} localId={localId} compra={compra} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoEditarCompra({
  localId,
  compra,
  onFechar,
}: {
  localId: string;
  compra: Compra;
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(atualizarCompra, undefined);
  const [pago, setPago] = useState(compra.pago);

  useEffect(() => {
    if (resultado !== undefined && !resultado.erro) onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="localId" value={localId} />
      <input type="hidden" name="compraId" value={compra.id} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="descricaoCompra">Descrição</Label>
        <Input id="descricaoCompra" name="descricao" defaultValue={compra.descricao ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fornecedorCompra">Fornecedor</Label>
          <Input id="fornecedorCompra" name="fornecedor" defaultValue={compra.fornecedor ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataCompra">Data</Label>
          <Input id="dataCompra" name="data" type="date" defaultValue={compra.data} />
        </div>
      </div>
      <div className="grid grid-cols-2 items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="prazoPagamentoCompra">Prazo de pagamento</Label>
          <Input id="prazoPagamentoCompra" name="prazoPagamento" type="date" defaultValue={compra.prazo_pagamento ?? ""} />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Checkbox id="pagoCompra" name="pago" checked={pago} onCheckedChange={(v) => setPago(v === true)} />
          <Label htmlFor="pagoCompra">Pago</Label>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="responsavelCompra">Responsável</Label>
        <Input id="responsavelCompra" name="responsavel" defaultValue={compra.responsavel ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="observacoesCompra">Observações</Label>
        <Textarea id="observacoesCompra" name="observacoes" defaultValue={compra.observacoes ?? ""} />
      </div>
      {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
      <DialogFooter>
        <Button type="submit" disabled={emAndamento}>
          {emAndamento ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
