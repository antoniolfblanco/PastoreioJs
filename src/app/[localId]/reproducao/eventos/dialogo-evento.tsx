"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { salvarEventoReprodutivo } from "@/lib/actions/eventos-reprodutivos";
import type { Especie, Evento, Metodo } from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];

const metodos: { value: Metodo; rotulo: string }[] = [
  { value: "monta_natural", rotulo: "Monta natural" },
  { value: "inseminacao_artificial", rotulo: "Inseminação artificial" },
  { value: "te_fiv", rotulo: "TE/FIV" },
];

const hojeISO = new Date().toISOString().slice(0, 10);

export type EventoParaEditar = { evento: Evento; temCobertura: boolean };

type Props = {
  localId: string;
  estacaoId: string | null;
  especieInicial: Especie;
  alvo: EventoParaEditar | "novo" | null;
  onFechar: () => void;
};

export function DialogoEvento({ localId, estacaoId, especieInicial, alvo, onFechar }: Props) {
  const [resultado, acao, emAndamento] = useActionState(salvarEventoReprodutivo, undefined);
  const existente = alvo && alvo !== "novo" ? alvo.evento : null;
  const travado = alvo && alvo !== "novo" ? alvo.temCobertura : false;

  const [especie, setEspecie] = useState<Especie>(existente?.especie ?? especieInicial);
  const [metodo, setMetodo] = useState<Metodo>(existente?.metodo ?? "inseminacao_artificial");
  const [dataInicio, setDataInicio] = useState(existente?.data_inicio ?? hojeISO);

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <Dialog open={alvo !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existente ? "Editar evento" : "Novo evento reprodutivo"}</DialogTitle>
        </DialogHeader>
        {alvo && (
          <form key={existente?.id ?? "novo"} action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            {existente ? (
              <input type="hidden" name="id" value={existente.id} />
            ) : (
              <input type="hidden" name="estacaoId" value={estacaoId ?? ""} />
            )}
            <input type="hidden" name="especie" value={especie} />
            <input type="hidden" name="metodo" value={metodo} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="nomeEvento">Nome</Label>
              <Input id="nomeEvento" name="nome" required autoFocus placeholder="Ex.: IATF Lote 1" defaultValue={existente?.nome} />
            </div>

            {travado && (
              <p className="text-xs text-muted-foreground">
                Este evento já tem cobertura lançada, então espécie e método não mudam mais — as coberturas
                foram feitas debaixo deles.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Label>Espécie</Label>
              <div className="flex flex-wrap gap-1">
                {especies.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    disabled={travado}
                    onClick={() => setEspecie(e.value)}
                    className={cn(
                      buttonVariants({ variant: especie === e.value ? "secondary" : "ghost", size: "sm" }),
                      travado && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {e.rotulo}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Método</Label>
              <div className="flex flex-wrap gap-1">
                {metodos.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    disabled={travado}
                    onClick={() => setMetodo(m.value)}
                    className={cn(
                      buttonVariants({ variant: metodo === m.value ? "secondary" : "ghost", size: "sm" }),
                      travado && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {m.rotulo}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="dataInicioEvento">Início do evento</Label>
              <Input
                id="dataInicioEvento"
                name="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento}>
                {emAndamento ? "Salvando..." : existente ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
