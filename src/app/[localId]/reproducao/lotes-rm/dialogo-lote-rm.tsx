"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { salvarLoteRm } from "@/lib/actions/lotes-rm";
import type { LoteRm } from "./page";

export function DialogoLoteRm({
  localId,
  lote,
  onFechar,
}: {
  localId: string;
  lote: LoteRm | "novo" | null;
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(salvarLoteRm, undefined);
  const existente = lote && lote !== "novo" ? lote : null;

  useEffect(() => {
    if (resultado !== undefined && !resultado.erro) onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <Dialog open={lote !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existente ? "Editar lote RM" : "Novo lote RM"}</DialogTitle>
        </DialogHeader>
        {lote && (
          <form key={existente?.id ?? "novo"} action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            {existente && <input type="hidden" name="id" value={existente.id} />}
            <div className="flex flex-col gap-2">
              <Label htmlFor="nomeLoteRm">Nome</Label>
              <Input
                id="nomeLoteRm"
                name="nome"
                required
                autoFocus
                placeholder="Ex.: Lote 1"
                defaultValue={existente?.nome}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="inicioLoteRm">Touros soltos em</Label>
                <Input
                  id="inicioLoteRm"
                  name="dataInicio"
                  type="date"
                  required
                  defaultValue={existente?.data_inicio ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="fimLoteRm">Retirados em (opcional)</Label>
                <Input id="fimLoteRm" name="dataFim" type="date" defaultValue={existente?.data_fim ?? ""} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              O acasalamento por este lote vale pra qualquer dia dentro do período. Sem data de retirada, o lote conta
              como ainda solto.
            </p>
            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento}>
                {emAndamento ? "Salvando..." : existente ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
