"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { confirmarAcasalamentos } from "@/lib/actions/coberturas";
import { SeletorAnimalEvento } from "./seletor-animal-evento";
import { DialogoAdicionarDosesSemen } from "./dialogo-adicionar-doses-semen";
import type { CandidatoAnimal, Especie, LoteRmOpcao, Metodo } from "./page";

const hojeISO = new Date().toISOString().slice(0, 10);

export function DialogoConfirmarAcasalamento({
  localId,
  eventoId,
  especie,
  metodo,
  candidatos,
  lotesRm,
  coberturaIds,
  onFechar,
}: {
  localId: string;
  eventoId: string;
  especie: Especie;
  metodo: Metodo;
  candidatos: CandidatoAnimal[];
  lotesRm: LoteRmOpcao[];
  coberturaIds: string[] | null;
  onFechar: () => void;
}) {
  return (
    <Dialog open={coberturaIds !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar acasalamento ({coberturaIds?.length ?? 0})</DialogTitle>
        </DialogHeader>
        {/* Chave no conteúdo, nunca no DialogContent — ver nota no seletor de
            touro do Banco Genético: remontar o Popup no fechamento reabria
            a janela sozinha. */}
        {coberturaIds && (
          <ConteudoConfirmarAcasalamento
            key={coberturaIds.join(",")}
            localId={localId}
            eventoId={eventoId}
            especie={especie}
            metodo={metodo}
            candidatos={candidatos}
            lotesRm={lotesRm}
            coberturaIds={coberturaIds}
            onFechar={onFechar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoConfirmarAcasalamento({
  localId,
  eventoId,
  especie,
  metodo,
  candidatos,
  lotesRm,
  coberturaIds,
  onFechar,
}: {
  localId: string;
  eventoId: string;
  especie: Especie;
  metodo: Metodo;
  candidatos: CandidatoAnimal[];
  lotesRm: LoteRmOpcao[];
  coberturaIds: string[];
  onFechar: () => void;
}) {
  const ia = metodo === "inseminacao_artificial";
  const [usarLoteRm, setUsarLoteRm] = useState(false);
  const [touroId, setTouroId] = useState("");
  const [rmLoteId, setRmLoteId] = useState("");
  const [data, setData] = useState(hojeISO);
  const [responsavel, setResponsavel] = useState("");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const [dosesRapidoAberto, setDosesRapidoAberto] = useState(false);

  async function confirmar() {
    if (!usarLoteRm && !touroId) {
      setErro("Selecione o touro.");
      return;
    }
    if (usarLoteRm && !rmLoteId) {
      setErro("Selecione o lote RM.");
      return;
    }
    setEmAndamento(true);
    setErro(undefined);
    try {
      await confirmarAcasalamentos(localId, eventoId, {
        coberturaIds,
        touroId: usarLoteRm ? null : touroId,
        rmLoteId: usarLoteRm ? rmLoteId : null,
        data,
        responsavel: responsavel.trim() || null,
      });
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível confirmar.");
    } finally {
      setEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!ia && (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setUsarLoteRm(false)}
            className={cn(buttonVariants({ variant: !usarLoteRm ? "secondary" : "outline", size: "sm" }))}
          >
            Touro conhecido
          </button>
          <button
            type="button"
            onClick={() => setUsarLoteRm(true)}
            className={cn(buttonVariants({ variant: usarLoteRm ? "secondary" : "outline", size: "sm" }))}
          >
            Lote RM
          </button>
        </div>
      )}

      {!usarLoteRm ? (
        <div className="flex items-end gap-1">
          <div className="flex-1">
            <SeletorAnimalEvento
              htmlId="touroAcasalamento"
              rotulo={ia ? "Touro (banco de sêmen)" : "Touro"}
              sexo="macho"
              especie={especie}
              candidatos={candidatos}
              value={touroId}
              onValueChange={setTouroId}
            />
          </div>
          {ia && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Adicionar doses de sêmen"
              onClick={() => setDosesRapidoAberto(true)}
            >
              <Plus className="size-4" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="loteRmAcasalamento">Lote RM</Label>
          {lotesRm.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum lote RM cadastrado.{" "}
              <Link href={`/${localId}/reproducao/lotes-rm`} className="underline">
                Cadastrar lote RM
              </Link>
            </p>
          ) : (
            <Select
              value={rmLoteId}
              onValueChange={(v) => setRmLoteId(v ?? "")}
              items={lotesRm.map((l) => ({ value: l.id, label: l.nome }))}
            >
              <SelectTrigger id="loteRmAcasalamento" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {lotesRm.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataAcasalamento">Data</Label>
          <Input id="dataAcasalamento" type="date" max={hojeISO} value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="responsavelAcasalamento">Responsável</Label>
          <Input id="responsavelAcasalamento" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
        </div>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Button type="button" disabled={emAndamento} onClick={confirmar}>
          {emAndamento ? "Confirmando..." : "Confirmar"}
        </Button>
      </DialogFooter>

      {ia && (
        <DialogoAdicionarDosesSemen
          localId={localId}
          especie={especie}
          candidatos={candidatos}
          aberto={dosesRapidoAberto}
          onFechar={() => setDosesRapidoAberto(false)}
        />
      )}
    </div>
  );
}
