"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { adicionarDosesSemenDireto } from "@/lib/actions/banco-genetico";
import { SeletorAnimalEvento } from "./seletor-animal-evento";
import type { CandidatoAnimal, Especie } from "./page";

// Atalho de "Adicionar doses" embutido no fluxo de confirmar acasalamento —
// evita sair pro Banco Genético só pra completar o estoque de um touro que
// está faltando dose.
export function DialogoAdicionarDosesSemen({
  localId,
  especie,
  candidatos,
  aberto,
  onFechar,
}: {
  localId: string;
  especie: Especie;
  candidatos: CandidatoAnimal[];
  aberto: boolean;
  onFechar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(estaAberto) => !estaAberto && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar doses de sêmen</DialogTitle>
        </DialogHeader>
        {/* Chave no conteúdo, nunca no DialogContent — mesmo motivo já
            documentado nos outros diálogos deste evento. */}
        <ConteudoAdicionarDosesSemen
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

function ConteudoAdicionarDosesSemen({
  localId,
  especie,
  candidatos,
  onFechar,
}: {
  localId: string;
  especie: Especie;
  candidatos: CandidatoAnimal[];
  onFechar: () => void;
}) {
  const [touroId, setTouroId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  async function confirmar() {
    const qtd = Number(quantidade);
    if (!touroId) {
      setErro("Selecione o touro.");
      return;
    }
    if (!Number.isInteger(qtd) || qtd < 1) {
      setErro("Informe uma quantidade válida.");
      return;
    }
    setEmAndamento(true);
    setErro(undefined);
    try {
      const resultado = await adicionarDosesSemenDireto(localId, touroId, qtd, null);
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível adicionar.");
    } finally {
      setEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SeletorAnimalEvento
        htmlId="touroDosesRapido"
        rotulo="Touro"
        sexo="macho"
        especie={especie}
        candidatos={candidatos}
        value={touroId}
        onValueChange={setTouroId}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="quantidadeDosesRapido">Quantidade de doses</Label>
        <Input
          id="quantidadeDosesRapido"
          type="number"
          min={1}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
        />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Button type="button" disabled={emAndamento || !touroId} onClick={confirmar}>
          {emAndamento ? "Adicionando..." : "Adicionar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
