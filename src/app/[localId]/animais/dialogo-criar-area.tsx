"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { salvarArea } from "@/lib/actions/areas";
import type { OpcaoArea } from "./page";

// Criação rápida de área com todos os detalhes (mesmos campos da tela
// Áreas), sem sair do formulário de animal.
export function DialogoCriarArea({
  localId,
  aberto,
  onFechar,
  onCriada,
}: {
  localId: string;
  aberto: boolean;
  onFechar: () => void;
  onCriada: (area: OpcaoArea) => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(salvarArea, undefined);
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (resultado === undefined || resultado.erro || !resultado.id) return;
    onCriada({ id: resultado.id, nome });
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <Dialog open={aberto} onOpenChange={(estaAberto) => !estaAberto && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova área</DialogTitle>
        </DialogHeader>
        {aberto && (
          <form key="nova-area" action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="nomeNovaArea">Nome</Label>
              <Input
                id="nomeNovaArea"
                name="nome"
                required
                autoFocus
                placeholder="Ex.: Piquete 3"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="tipoNovaArea">Tipo</Label>
                <Input id="tipoNovaArea" name="tipo" placeholder="Ex.: Pasto" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="tamanhoNovaArea">Tamanho (ha)</Label>
                <Input id="tamanhoNovaArea" name="tamanho" type="number" step="0.01" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="observacoesNovaArea">Observações</Label>
              <Textarea id="observacoesNovaArea" name="observacoes" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ativoNovaArea"
                name="ativo"
                checked={ativo}
                onCheckedChange={(v) => setAtivo(v === true)}
              />
              <Label htmlFor="ativoNovaArea">Área ativa</Label>
            </div>
            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento}>
                {emAndamento ? "Salvando..." : "Criar área"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
