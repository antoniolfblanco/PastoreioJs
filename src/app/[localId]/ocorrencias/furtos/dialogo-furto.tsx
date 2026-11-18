"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { identificacaoAnimal } from "@/components/card-selecao-animais";
import { atualizarFurto } from "@/lib/actions/furtos";
import type { RegistroFurto } from "./page";

const hojeISO = new Date().toISOString().slice(0, 10);

// Edição de um furto já registrado (o registro novo é no painel de três
// cards). Os animais não mudam aqui.
export function DialogoFurto({
  localId,
  registro,
  onFechar,
}: {
  localId: string;
  registro: RegistroFurto | null;
  onFechar: () => void;
}) {
  return (
    <Dialog open={registro !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {registro && <ConteudoFurto key={registro.id} localId={localId} registro={registro} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoFurto({ localId, registro, onFechar }: { localId: string; registro: RegistroFurto; onFechar: () => void }) {
  const [resultado, acao, emAndamento] = useActionState(atualizarFurto, undefined);
  const [data, setData] = useState(registro.data);
  const [ocorrencia, setOcorrencia] = useState(registro.ocorrencia ?? "");
  const [responsavel, setResponsavel] = useState(registro.responsavel ?? "");
  const [descricao, setDescricao] = useState(registro.descricao ?? "");
  const [observacoes, setObservacoes] = useState(registro.observacoes ?? "");

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    toast.success("Registro atualizado.");
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar registro de furto</DialogTitle>
      </DialogHeader>
      <form action={acao} className="flex flex-col gap-4">
        <input type="hidden" name="localId" value={localId} />
        <input type="hidden" name="furtoId" value={registro.id} />

        <div className="flex flex-col gap-2">
          <Label>Animais</Label>
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            {registro.animais.length > 0 ? registro.animais.map((a) => identificacaoAnimal(a)).join(", ") : "—"}
            <p className="mt-1 text-xs">Os animais de um registro já feito não podem ser alterados aqui.</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="dataFurto">Data</Label>
          <Input id="dataFurto" name="data" type="date" max={hojeISO} required value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ocorrenciaFurto">Ocorrência</Label>
          <Textarea id="ocorrenciaFurto" name="ocorrencia" value={ocorrencia} onChange={(e) => setOcorrencia(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="responsavelFurto">Responsável</Label>
          <Input id="responsavelFurto" name="responsavel" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="descricaoFurto">Descrição</Label>
          <Input id="descricaoFurto" name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="observacoesFurto">Observações</Label>
          <Textarea id="observacoesFurto" name="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
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
