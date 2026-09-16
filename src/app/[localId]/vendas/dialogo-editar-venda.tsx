"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { atualizarVenda } from "@/lib/actions/vendas";
import type { Venda } from "./page";

export function DialogoEditarVenda({
  localId,
  venda,
  onFechar,
}: {
  localId: string;
  venda: Venda | null;
  onFechar: () => void;
}) {
  return (
    <Dialog open={venda !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar venda</DialogTitle>
        </DialogHeader>
        {venda && <ConteudoEditarVenda key={venda.id} localId={localId} venda={venda} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoEditarVenda({
  localId,
  venda,
  onFechar,
}: {
  localId: string;
  venda: Venda;
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(atualizarVenda, undefined);
  const [recebido, setRecebido] = useState(venda.recebido);

  useEffect(() => {
    if (resultado !== undefined && !resultado.erro) onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="localId" value={localId} />
      <input type="hidden" name="vendaId" value={venda.id} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="descricaoVendaEditar">Descrição</Label>
        <Input id="descricaoVendaEditar" name="descricao" defaultValue={venda.descricao ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="compradorVendaEditar">Comprador</Label>
          <Input id="compradorVendaEditar" name="comprador" defaultValue={venda.comprador ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataVendaEditar">Data</Label>
          <Input id="dataVendaEditar" name="data" type="date" defaultValue={venda.data} />
        </div>
      </div>
      <div className="grid grid-cols-2 items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="prazoRecebimentoVendaEditar">Prazo de recebimento</Label>
          <Input
            id="prazoRecebimentoVendaEditar"
            name="prazoRecebimento"
            type="date"
            defaultValue={venda.prazo_recebimento ?? ""}
          />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Checkbox id="recebidoVendaEditar" name="recebido" checked={recebido} onCheckedChange={(v) => setRecebido(v === true)} />
          <Label htmlFor="recebidoVendaEditar">Recebido</Label>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="responsavelVendaEditar">Responsável</Label>
        <Input id="responsavelVendaEditar" name="responsavel" defaultValue={venda.responsavel ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="observacoesVendaEditar">Observações</Label>
        <Textarea id="observacoesVendaEditar" name="observacoes" defaultValue={venda.observacoes ?? ""} />
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
