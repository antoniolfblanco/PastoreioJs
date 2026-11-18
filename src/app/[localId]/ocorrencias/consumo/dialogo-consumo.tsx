"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { identificacaoAnimal } from "@/components/card-selecao-animais";
import { atualizarConsumo } from "@/lib/actions/consumo";
import type { GrupoConsumo } from "./page";

const hojeISO = new Date().toISOString().slice(0, 10);

// Edição de um consumo já registrado (o registro novo é no painel de três
// cards). Os animais não mudam aqui.
export function DialogoConsumo({
  localId,
  grupo,
  onFechar,
}: {
  localId: string;
  grupo: GrupoConsumo | null;
  onFechar: () => void;
}) {
  return (
    <Dialog open={grupo !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {grupo && <ConteudoConsumo key={grupo.ocorrencia_grupo_id} localId={localId} grupo={grupo} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoConsumo({ localId, grupo, onFechar }: { localId: string; grupo: GrupoConsumo; onFechar: () => void }) {
  const [resultado, acao, emAndamento] = useActionState(atualizarConsumo, undefined);
  const [data, setData] = useState(grupo.data);
  const [pesoVivo, setPesoVivo] = useState(grupo.peso_vivo != null ? String(grupo.peso_vivo) : "");
  const [pesoCarne, setPesoCarne] = useState(grupo.peso_carne != null ? String(grupo.peso_carne) : "");
  const [destino, setDestino] = useState(grupo.destino ?? "");
  const [responsavel, setResponsavel] = useState(grupo.responsavel ?? "");
  const [descricao, setDescricao] = useState(grupo.descricao ?? "");
  const [observacoes, setObservacoes] = useState(grupo.observacoes ?? "");

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    toast.success("Registro atualizado.");
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar registro de consumo</DialogTitle>
      </DialogHeader>
      <form action={acao} className="flex flex-col gap-4">
        <input type="hidden" name="localId" value={localId} />
        <input type="hidden" name="grupoId" value={grupo.ocorrencia_grupo_id} />

        <div className="flex flex-col gap-2">
          <Label>Animais</Label>
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            {grupo.animais.map((a) => identificacaoAnimal(a)).join(", ")}
            <p className="mt-1 text-xs">Os animais de um registro já feito não podem ser alterados aqui.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dataConsumo">Data</Label>
            <Input id="dataConsumo" name="data" type="date" max={hojeISO} required value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="destinoConsumo">Destino</Label>
            <Input id="destinoConsumo" name="destino" value={destino} onChange={(e) => setDestino(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pesoVivoConsumo">Peso vivo total (kg)</Label>
            <Input id="pesoVivoConsumo" name="pesoVivo" type="number" step="0.01" value={pesoVivo} onChange={(e) => setPesoVivo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pesoCarneConsumo">Peso de carne total (kg)</Label>
            <Input id="pesoCarneConsumo" name="pesoCarne" type="number" step="0.01" value={pesoCarne} onChange={(e) => setPesoCarne(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="responsavelConsumo">Responsável</Label>
          <Input id="responsavelConsumo" name="responsavel" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="descricaoConsumo">Descrição</Label>
          <Input id="descricaoConsumo" name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="observacoesConsumo">Observações</Label>
          <Textarea id="observacoesConsumo" name="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>

        {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
        <DialogFooter>
          <Button type="submit" disabled={emAndamento}>
            {emAndamento ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
