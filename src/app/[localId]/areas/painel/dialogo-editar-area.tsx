"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { salvarArea } from "@/lib/actions/areas";
import type { Area } from "./page";

export function DialogoEditarArea({
  localId,
  area,
  onFechar,
}: {
  localId: string;
  area: Area | null;
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(salvarArea, undefined);

  useEffect(() => {
    if (resultado !== undefined && !resultado.erro) onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <Dialog open={area !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar área</DialogTitle>
        </DialogHeader>
        {area && (
          <form key={area.id} action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            <input type="hidden" name="id" value={area.id} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="nomeEditarAreaPainel">Nome</Label>
              <Input id="nomeEditarAreaPainel" name="nome" required autoFocus defaultValue={area.nome} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="tipoEditarAreaPainel">Tipo</Label>
                <Input id="tipoEditarAreaPainel" name="tipo" defaultValue={area.tipo ?? ""} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="tamanhoEditarAreaPainel">Tamanho (ha)</Label>
                <Input
                  id="tamanhoEditarAreaPainel"
                  name="tamanho"
                  type="number"
                  step="0.01"
                  defaultValue={area.tamanho ?? ""}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="observacoesEditarAreaPainel">Observações</Label>
              <Textarea id="observacoesEditarAreaPainel" name="observacoes" defaultValue={area.observacoes ?? ""} />
            </div>
            <input type="hidden" name="ativo" value="on" />
            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento}>
                {emAndamento ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
