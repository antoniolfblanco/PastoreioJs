"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { atualizarMovimentacao } from "@/lib/actions/movimentacoes";
import type { GrupoMovimentacao, OpcaoArea } from "./page";

const hojeISO = new Date().toISOString().slice(0, 10);

export function DialogoEditarMovimentacao({
  localId,
  grupo,
  areas,
  onFechar,
}: {
  localId: string;
  grupo: GrupoMovimentacao | null;
  areas: OpcaoArea[];
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(atualizarMovimentacao, undefined);
  const [areaDestinoId, setAreaDestinoId] = useState(grupo?.area_destino_id ?? "");
  const [data, setData] = useState(grupo?.data ?? hojeISO);
  const [responsavel, setResponsavel] = useState(grupo?.responsavel ?? "");
  const [descricao, setDescricao] = useState(grupo?.descricao ?? "");

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    toast.success("Movimentação atualizada.");
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <Dialog open={grupo !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar movimentação</DialogTitle>
        </DialogHeader>
        {grupo && (
          <form key={grupo.movimentacao_grupo_id} action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            <input type="hidden" name="grupoId" value={grupo.movimentacao_grupo_id} />
            <p className="text-sm text-muted-foreground">
              {grupo.animais.length} animal(is) — não dá pra trocar quais animais fazem parte desta
              movimentação, só o destino e os dados do evento. Só funciona se nenhum deles tiver sido
              movido de novo depois.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="areaDestinoEditarMovimentacao">Área de destino</Label>
              <Select
                value={areaDestinoId}
                onValueChange={(v) => setAreaDestinoId(v ?? "")}
                items={areas.map((a) => ({ value: a.id, label: a.nome }))}
              >
                <SelectTrigger id="areaDestinoEditarMovimentacao" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="areaDestinoId" value={areaDestinoId} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dataEditarMovimentacao">Data</Label>
              <Input
                id="dataEditarMovimentacao"
                name="data"
                type="date"
                max={hojeISO}
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="responsavelEditarMovimentacao">Responsável</Label>
              <Input
                id="responsavelEditarMovimentacao"
                name="responsavel"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="descricaoEditarMovimentacao">Descrição</Label>
              <Input
                id="descricaoEditarMovimentacao"
                name="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento || !areaDestinoId}>
                {emAndamento ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
