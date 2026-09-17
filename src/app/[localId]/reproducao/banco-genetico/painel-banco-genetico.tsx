"use client";

import { useMemo, useState } from "react";
import { Droplet, FlaskConical, Trash2, Plus, Pencil } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { apagarLoteEmbrioes } from "@/lib/actions/banco-genetico";
import { DialogoAdicionarDoses } from "./dialogo-adicionar-doses";
import { DialogoEditarDoses } from "./dialogo-editar-doses";
import { DialogoRemoverDoses } from "./dialogo-remover-doses";
import { DialogoNovoLoteEmbrioes } from "./dialogo-novo-lote-embrioes";
import { DialogoEditarLoteEmbrioes } from "./dialogo-editar-lote-embrioes";
import type { CandidatoGenetico, Especie, LoteEmbriao, TouroComEstoque } from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];

function formatarData(data: string | null) {
  return data ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR") : "—";
}

type Props = {
  localId: string;
  semen: TouroComEstoque[];
  embrioes: LoteEmbriao[];
  candidatos: CandidatoGenetico[];
  podeEditar: boolean;
};

export function PainelBancoGenetico({ localId, semen, embrioes, candidatos, podeEditar }: Props) {
  const [especieSelecionada, setEspecieSelecionada] = useState<Especie>("bovino");
  const [adicionarDosesAberto, setAdicionarDosesAberto] = useState(false);
  const [editandoDoses, setEditandoDoses] = useState<TouroComEstoque | null>(null);
  const [touroRemovendo, setTouroRemovendo] = useState<TouroComEstoque | null>(null);
  const [novoLoteAberto, setNovoLoteAberto] = useState(false);
  const [editandoLote, setEditandoLote] = useState<LoteEmbriao | null>(null);

  const semenDaEspecie = useMemo(() => semen.filter((s) => s.especie === especieSelecionada), [semen, especieSelecionada]);
  const embrioesDaEspecie = useMemo(
    () => embrioes.filter((l) => l.especie === especieSelecionada),
    [embrioes, especieSelecionada],
  );

  const totalDoses = useMemo(() => semenDaEspecie.reduce((soma, s) => soma + s.quantidade_doses, 0), [semenDaEspecie]);
  const totalEmbrioes = useMemo(() => embrioesDaEspecie.reduce((soma, l) => soma + l.quantidade, 0), [embrioesDaEspecie]);

  async function excluirLote(lote: LoteEmbriao) {
    if (
      !confirm(
        `Apagar o lote de "${lote.doadora_identificacao} × ${lote.touro_identificacao}"? Só é possível se ele ainda não tiver sido usado em nenhuma transferência.`,
      )
    )
      return;
    try {
      await apagarLoteEmbrioes(localId, lote.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Banco Genético</h1>
          <p className="text-sm text-muted-foreground">Estoque de sêmen e lotes de embriões disponíveis.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {especies.map((e) => (
            <button
              key={e.value}
              onClick={() => setEspecieSelecionada(e.value)}
              className={cn(
                buttonVariants({ variant: especieSelecionada === e.value ? "secondary" : "ghost", size: "sm" }),
              )}
            >
              {e.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-lg font-semibold">
            <Droplet className="size-4" />
            Banco de Sêmen
          </h2>
          {podeEditar && (
            <Button size="sm" onClick={() => setAdicionarDosesAberto(true)}>
              <Plus className="size-4" />
              Adicionar doses
            </Button>
          )}
        </div>

        {semenDaEspecie.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum touro com dose cadastrada ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Touro</TableHead>
                <TableHead className="text-right">Doses</TableHead>
                {podeEditar && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {semenDaEspecie.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {s.identificacao}
                      {s.externo && <Badge variant="outline">Externo</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.quantidade_doses}</TableCell>
                  {podeEditar && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-7" title="Editar" onClick={() => setEditandoDoses(s)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7" title="Remover doses" onClick={() => setTouroRemovendo(s)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="text-sm font-normal text-muted-foreground">
                  {semenDaEspecie.length} {semenDaEspecie.length === 1 ? "touro" : "touros"}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{totalDoses}</TableCell>
                {podeEditar && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-lg font-semibold">
            <FlaskConical className="size-4" />
            Banco de Embriões
          </h2>
          {podeEditar && (
            <Button size="sm" onClick={() => setNovoLoteAberto(true)}>
              <Plus className="size-4" />
              Adicionar lote
            </Button>
          )}
        </div>

        {embrioesDaEspecie.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lote de embriões cadastrado ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doadora</TableHead>
                <TableHead>Touro</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Data de produção</TableHead>
                {podeEditar && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {embrioesDaEspecie.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {l.doadora_identificacao}
                      {l.doadora_externa && <Badge variant="outline">Externa</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {l.touro_identificacao}
                      {l.touro_externo && <Badge variant="outline">Externo</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.quantidade}</TableCell>
                  <TableCell>{formatarData(l.data_producao)}</TableCell>
                  {podeEditar && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-7" title="Editar" onClick={() => setEditandoLote(l)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" title="Apagar lote" onClick={() => excluirLote(l)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="text-sm font-normal text-muted-foreground">
                  {embrioesDaEspecie.length} {embrioesDaEspecie.length === 1 ? "lote" : "lotes"}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{totalEmbrioes}</TableCell>
                <TableCell />
                {podeEditar && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>

      {podeEditar && (
        <>
          <DialogoAdicionarDoses
            localId={localId}
            especie={especieSelecionada}
            candidatos={candidatos}
            aberto={adicionarDosesAberto}
            onFechar={() => setAdicionarDosesAberto(false)}
          />
          <DialogoEditarDoses localId={localId} candidatos={candidatos} registro={editandoDoses} onFechar={() => setEditandoDoses(null)} />
          <DialogoRemoverDoses localId={localId} touro={touroRemovendo} onFechar={() => setTouroRemovendo(null)} />
          <DialogoNovoLoteEmbrioes
            localId={localId}
            especie={especieSelecionada}
            candidatos={candidatos}
            aberto={novoLoteAberto}
            onFechar={() => setNovoLoteAberto(false)}
          />
          <DialogoEditarLoteEmbrioes localId={localId} candidatos={candidatos} lote={editandoLote} onFechar={() => setEditandoLote(null)} />
        </>
      )}
    </div>
  );
}
