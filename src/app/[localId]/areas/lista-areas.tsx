"use client";

import { useState, useActionState, useEffect } from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { salvarArea, apagarArea } from "@/lib/actions/areas";
import type { Area } from "./page";

type Props = {
  localId: string;
  areas: Area[];
  podeEditar: boolean;
};

export function ListaAreas({ localId, areas, podeEditar }: Props) {
  const [selecionadoId, setSelecionadoId] = useState<string | "novo" | null>(null);
  const selecionado =
    selecionadoId === null
      ? null
      : selecionadoId === "novo"
        ? "novo"
        : (areas.find((a) => a.id === selecionadoId) ?? null);

  async function excluir(id: string) {
    if (!confirm("Apagar esta área?")) return;
    try {
      await apagarArea(localId, id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {podeEditar && (
        <div>
          <Button size="sm" onClick={() => setSelecionadoId("novo")}>
            <Plus className="size-4" />
            Nova área
          </Button>
        </div>
      )}

      {areas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <MapPin className="size-8" />
          <p>Nenhuma área cadastrada ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {areas.map((a) => (
            <Card
              key={a.id}
              className="flex-row items-center justify-between gap-2 px-4 py-3 cursor-pointer hover:bg-muted/40"
              onClick={() => podeEditar && setSelecionadoId(a.id)}
            >
              <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.nome}</span>
                  {!a.ativo && <Badge variant="outline">Inativa</Badge>}
                </div>
                <span className="truncate text-sm text-muted-foreground">
                  {[a.tipo, a.tamanho ? `${a.tamanho} ha` : null].filter(Boolean).join(" • ") ||
                    "Sem dados adicionais"}
                </span>
              </div>
              {podeEditar && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-destructive"
                  title="Apagar"
                  onClick={(e) => {
                    e.stopPropagation();
                    excluir(a.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {podeEditar && (
        <DialogoArea
          // Sem key, o diálogo não remonta ao trocar de área e o useState de
          // "ativo" fica preso no valor da primeira montagem.
          key={selecionadoId ?? "fechado"}
          localId={localId}
          area={selecionado}
          onFechar={() => setSelecionadoId(null)}
        />
      )}
    </div>
  );
}

function DialogoArea({
  localId,
  area,
  onFechar,
}: {
  localId: string;
  area: Area | "novo" | null;
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(salvarArea, undefined);
  const existente = area && area !== "novo" ? area : null;
  const [ativo, setAtivo] = useState(existente?.ativo ?? true);

  useEffect(() => {
    if (resultado !== undefined && !resultado.erro) onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <Dialog open={area !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existente ? "Editar área" : "Nova área"}</DialogTitle>
        </DialogHeader>
        {area && (
          <form key={existente?.id ?? "novo"} action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            {existente && <input type="hidden" name="id" value={existente.id} />}
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                required
                autoFocus
                placeholder="Ex.: Piquete 3"
                defaultValue={existente?.nome}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Input id="tipo" name="tipo" placeholder="Ex.: Pasto" defaultValue={existente?.tipo ?? ""} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="tamanho">Tamanho (ha)</Label>
                <Input
                  id="tamanho"
                  name="tamanho"
                  type="number"
                  step="0.01"
                  defaultValue={existente?.tamanho ?? ""}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" name="observacoes" defaultValue={existente?.observacoes ?? ""} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ativo"
                name="ativo"
                checked={ativo}
                onCheckedChange={(v) => setAtivo(v === true)}
              />
              <Label htmlFor="ativo">Área ativa</Label>
            </div>
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
