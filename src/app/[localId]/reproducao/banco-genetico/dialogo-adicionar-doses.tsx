"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { adicionarDosesSemen } from "@/lib/actions/banco-genetico";
import { CampoAnimalGenetico } from "./campo-animal-genetico";
import type { CandidatoGenetico, Especie } from "./page";

export function DialogoAdicionarDoses({
  localId,
  especie,
  candidatos,
  aberto,
  onFechar,
}: {
  localId: string;
  especie: Especie;
  candidatos: CandidatoGenetico[];
  aberto: boolean;
  onFechar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(estaAberto) => !estaAberto && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar doses de sêmen</DialogTitle>
        </DialogHeader>
        {/* Chave no conteúdo, nunca no DialogContent: remontar o Popup do
            diálogo no meio da própria transição de fechamento é o que
            fazia a janela "voltar" — reabrir sozinha assim que o usuário
            clicava. Só o conteúdo remonta pra vir limpo da próxima vez. */}
        <ConteudoAdicionarDoses
          key={aberto ? "aberto" : "fechado"}
          localId={localId}
          especie={especie}
          candidatos={candidatos}
          onFechar={onFechar}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConteudoAdicionarDoses({
  localId,
  especie,
  candidatos,
  onFechar,
}: {
  localId: string;
  especie: Especie;
  candidatos: CandidatoGenetico[];
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(adicionarDosesSemen, undefined);
  const [touroId, setTouroId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="localId" value={localId} />
      <input type="hidden" name="touroId" value={touroId} />
      <CampoAnimalGenetico
        htmlId="touroDoses"
        localId={localId}
        rotulo="Touro"
        sexo="macho"
        especie={especie}
        candidatos={candidatos}
        value={touroId}
        onValueChange={setTouroId}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="quantidadeDoses">Quantidade de doses</Label>
        <Input
          id="quantidadeDoses"
          name="quantidade"
          type="number"
          min={1}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="observacoesDoses">Observações</Label>
        <Textarea
          id="observacoesDoses"
          name="observacoes"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>
      {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
      <DialogFooter>
        <Button type="submit" disabled={emAndamento || !touroId}>
          {emAndamento ? "Adicionando..." : "Adicionar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
