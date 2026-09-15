"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { adicionarDosesSemen } from "@/lib/actions/banco-genetico";
import { SeletorAnimalGenetico } from "./seletor-animal-genetico";
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
  const [resultado, acao, emAndamento] = useActionState(adicionarDosesSemen, undefined);
  const [touroId, setTouroId] = useState("");
  const [touroResumo, setTouroResumo] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [observacoes, setObservacoes] = useState("");
  const [seletorAberto, setSeletorAberto] = useState(false);

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <>
      <Dialog open={aberto} onOpenChange={(estaAberto) => !estaAberto && onFechar()}>
        <DialogContent key={aberto ? "aberto" : "fechado"}>
          <DialogHeader>
            <DialogTitle>Adicionar doses de sêmen</DialogTitle>
          </DialogHeader>
          <form action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            <input type="hidden" name="touroId" value={touroId} />
            <div className="flex flex-col gap-2">
              <Label>Touro</Label>
              <Button
                type="button"
                variant="outline"
                className="justify-start font-normal"
                onClick={() => setSeletorAberto(true)}
              >
                {touroResumo || "Selecionar..."}
              </Button>
            </div>
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
              <Textarea id="observacoesDoses" name="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento || !touroId}>
                {emAndamento ? "Adicionando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SeletorAnimalGenetico
        aberto={seletorAberto}
        titulo="Selecionar touro"
        sexo="macho"
        especie={especie}
        candidatos={candidatos}
        onSelecionar={(id, resumo) => {
          setTouroId(id);
          setTouroResumo(resumo);
          setSeletorAberto(false);
        }}
        onFechar={() => setSeletorAberto(false)}
      />
    </>
  );
}
