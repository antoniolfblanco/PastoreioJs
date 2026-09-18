"use client";

import { useMemo, useState } from "react";
import { Trash2, Users, ArrowUp, ArrowDown, ArrowUpDown, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { apagarAnimalExterno } from "@/lib/actions/externos";
import { DialogoExterno } from "./dialogo-externo";
import type { CandidatoGenealogia, CategoriaIvz, Especie, Externo, OpcaoCategoria, OpcaoRaca } from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];
const rotulosSexo: Record<string, string> = { macho: "Macho", femea: "Fêmea", desconhecido: "—" };

function identificacao(e: Externo) {
  return [e.brinco, e.tatuagem, e.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

type ColunaId = "identificacao" | "categoria" | "raca" | "pai" | "mae";

const colunas: { id: ColunaId; rotulo: string }[] = [
  { id: "identificacao", rotulo: "Identificação" },
  { id: "categoria", rotulo: "Categoria" },
  { id: "raca", rotulo: "Raça" },
  { id: "pai", rotulo: "Pai" },
  { id: "mae", rotulo: "Mãe" },
];

function valorOrdenacao(e: Externo, coluna: ColunaId): string {
  switch (coluna) {
    case "identificacao":
      return identificacao(e).toLowerCase();
    case "categoria":
      return e.categoria_descricao.toLowerCase();
    case "raca":
      return e.raca_descricao.toLowerCase();
    case "pai":
      return (e.pai_identificacao ?? "").toLowerCase();
    case "mae":
      return (e.mae_identificacao ?? "").toLowerCase();
  }
}

type Props = {
  localId: string;
  externos: Externo[];
  categorias: OpcaoCategoria[];
  racas: OpcaoRaca[];
  categoriasIvz: CategoriaIvz[];
  candidatos: CandidatoGenealogia[];
  podeEditar: boolean;
};

export function ListaExternos({ localId, externos, categorias, racas, categoriasIvz, candidatos, podeEditar }: Props) {
  const [especieSelecionada, setEspecieSelecionada] = useState<Especie>("bovino");
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({
    coluna: "identificacao",
    desc: false,
  });
  const [selecionadoId, setSelecionadoId] = useState<string | "novo" | null>(null);

  const externosDaEspecie = useMemo(
    () => externos.filter((e) => e.especie === especieSelecionada),
    [externos, especieSelecionada],
  );

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  const dados = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    const filtrados = externosDaEspecie.filter((e) => {
      if (!buscaMin) return true;
      return [e.nome, e.brinco, e.tatuagem, e.raca_descricao].filter(Boolean).some((t) => t!.toLowerCase().includes(buscaMin));
    });

    return [...filtrados].sort((a, b) => {
      const cmp = valorOrdenacao(a, ordenacao.coluna).localeCompare(valorOrdenacao(b, ordenacao.coluna), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [externosDaEspecie, busca, ordenacao]);

  const selecionado =
    selecionadoId === null
      ? null
      : selecionadoId === "novo"
        ? "novo"
        : (externos.find((e) => e.id === selecionadoId) ?? null);

  async function excluir(e: Externo) {
    if (
      !confirm(
        `Apagar o animal externo "${identificacao(e)}"? Se ele já tiver cobertura confirmada ou nascimento vinculado, não vai ser possível apagar.`,
      )
    )
      return;
    try {
      const resultado = await apagarAnimalExterno(localId, e.id);
      if (resultado.error) alert(resultado.error);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível apagar.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Animais Externos</h1>
          <p className="text-sm text-muted-foreground">
            Touros de sêmen, doadoras de embrião e ancestrais comprados — entram na genealogia, mas nunca no
            estoque, manejo ou movimentação.
          </p>
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

      {podeEditar && (
        <div>
          <Button size="sm" onClick={() => setSelecionadoId("novo")}>
            <Plus className="size-4" />
            Novo externo
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nome, brinco, tatuagem ou raça..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full md:max-w-64"
        />
        <span className="text-sm text-muted-foreground">{dados.length} animal(is)</span>
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <Users className="size-8" />
          <p>Nenhum animal externo encontrado.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {colunas.map((coluna) => (
                <TableHead key={coluna.id}>
                  <button
                    type="button"
                    onClick={() => ordenarPor(coluna.id)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {coluna.rotulo}
                    {ordenacao.coluna === coluna.id ? (
                      ordenacao.desc ? (
                        <ArrowDown className="size-3.5" />
                      ) : (
                        <ArrowUp className="size-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
                    )}
                  </button>
                </TableHead>
              ))}
              {podeEditar && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((e) => (
              <TableRow
                key={e.id}
                className={podeEditar ? "cursor-pointer" : undefined}
                onClick={() => podeEditar && setSelecionadoId(e.id)}
              >
                <TableCell className="font-medium">{identificacao(e)}</TableCell>
                <TableCell>
                  {e.categoria_descricao} <span className="text-muted-foreground">({rotulosSexo[e.sexo]})</span>
                </TableCell>
                <TableCell>{e.raca_descricao}</TableCell>
                <TableCell>{e.pai_identificacao ?? "—"}</TableCell>
                <TableCell>{e.mae_identificacao ?? "—"}</TableCell>
                {podeEditar && (
                  <TableCell onClick={(ev) => ev.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      title="Apagar"
                      onClick={() => excluir(e)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={colunas.length} className="text-sm font-normal text-muted-foreground">
                {dados.length} {dados.length === 1 ? "animal" : "animais"}
              </TableCell>
              {podeEditar && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {podeEditar && (
        <DialogoExterno
          key={selecionadoId ?? "fechado"}
          localId={localId}
          externo={selecionado}
          categorias={categorias}
          racas={racas}
          categoriasIvz={categoriasIvz}
          candidatos={candidatos}
          onFechar={() => setSelecionadoId(null)}
        />
      )}
    </div>
  );
}
