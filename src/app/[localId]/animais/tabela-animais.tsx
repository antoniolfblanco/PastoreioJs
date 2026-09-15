"use client";

import { useMemo, useState } from "react";
import { Plus, Layers, Trash2, Beef, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FiltroMultiSelecao } from "@/components/filtro-multi-selecao";
import { cn } from "@/lib/utils";
import { apagarAnimal } from "@/lib/actions/animais";
import { DialogoAnimal } from "./dialogo-animal";
import { DialogoAnimalLote } from "./dialogo-animal-lote";
import type { Animal, CategoriaIvz, Especie, OpcaoArea, OpcaoCategoria, OpcaoRaca } from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];
const rotulosSexo: Record<string, string> = { macho: "Macho", femea: "Fêmea", desconhecido: "—" };
const grausSangue = ["PO", "PC", "1/4", "1/2", "SR", "Desconhecido"];

function formatarValor(valor: number | null) {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function identificacao(a: Animal) {
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

type ColunaId = "identificacao" | "categoria" | "area" | "raca" | "sexo" | "grauSangue" | "valor";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "identificacao", rotulo: "Identificação" },
  { id: "categoria", rotulo: "Categoria" },
  { id: "area", rotulo: "Área" },
  { id: "raca", rotulo: "Raça" },
  { id: "sexo", rotulo: "Sexo" },
  { id: "grauSangue", rotulo: "Grau de sangue" },
  { id: "valor", rotulo: "Valor", alinhamento: "right" },
];

function valorOrdenacao(a: Animal, coluna: ColunaId): string | number {
  switch (coluna) {
    case "identificacao":
      return identificacao(a).toLowerCase();
    case "categoria":
      return a.categoria_descricao.toLowerCase();
    case "area":
      return a.area_nome.toLowerCase();
    case "raca":
      return a.raca_descricao.toLowerCase();
    case "sexo":
      return rotulosSexo[a.sexo] ?? a.sexo;
    case "grauSangue":
      return a.grau_sangue;
    case "valor":
      return a.valor ?? -Infinity;
  }
}

type Props = {
  localId: string;
  animais: Animal[];
  areas: OpcaoArea[];
  categorias: OpcaoCategoria[];
  racas: OpcaoRaca[];
  categoriasIvz: CategoriaIvz[];
  cicloAtivoNome: string | null;
  podeEditar: boolean;
  especieInicial?: Especie;
  areaInicialId?: string;
  categoriaInicialId?: string;
};

export function TabelaAnimais({
  localId,
  animais,
  areas,
  categorias,
  racas,
  categoriasIvz,
  cicloAtivoNome,
  podeEditar,
  especieInicial,
  areaInicialId,
  categoriaInicialId,
}: Props) {
  const [especieSelecionada, setEspecieSelecionada] = useState<Especie>(especieInicial ?? "bovino");
  const [busca, setBusca] = useState("");
  const [areasFiltro, setAreasFiltro] = useState<Set<string>>(
    () => new Set(areaInicialId ? [areaInicialId] : []),
  );
  const [categoriasFiltro, setCategoriasFiltro] = useState<Set<string>>(
    () => new Set(categoriaInicialId ? [categoriaInicialId] : []),
  );
  const [sexosFiltro, setSexosFiltro] = useState<Set<string>>(new Set());
  const [grausSangueFiltro, setGrausSangueFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({
    coluna: "identificacao",
    desc: false,
  });
  const [selecionadoId, setSelecionadoId] = useState<string | "novo" | null>(null);
  const [loteAberto, setLoteAberto] = useState(false);

  const animaisDaEspecie = useMemo(
    () => animais.filter((a) => a.especie === especieSelecionada),
    [animais, especieSelecionada],
  );
  const categoriasDaEspecie = useMemo(
    () => categorias.filter((c) => c.especie === especieSelecionada),
    [categorias, especieSelecionada],
  );

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  const dados = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    const filtrados = animaisDaEspecie.filter((a) => {
      if (areasFiltro.size > 0 && !areasFiltro.has(a.area_id)) return false;
      if (categoriasFiltro.size > 0 && !categoriasFiltro.has(a.categoria_id)) return false;
      if (sexosFiltro.size > 0 && !sexosFiltro.has(a.sexo)) return false;
      if (grausSangueFiltro.size > 0 && !grausSangueFiltro.has(a.grau_sangue)) return false;
      if (!buscaMin) return true;
      return [a.nome, a.brinco, a.tatuagem, a.raca_descricao]
        .filter(Boolean)
        .some((texto) => texto!.toLowerCase().includes(buscaMin));
    });

    return [...filtrados].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [animaisDaEspecie, busca, areasFiltro, categoriasFiltro, sexosFiltro, grausSangueFiltro, ordenacao]);

  const totalValor = useMemo(() => dados.reduce((soma, a) => soma + (a.valor ?? 0), 0), [dados]);

  const selecionado =
    selecionadoId === null
      ? null
      : selecionadoId === "novo"
        ? "novo"
        : (animais.find((a) => a.id === selecionadoId) ?? null);

  async function excluir(id: string) {
    if (!confirm("Apagar este animal?")) return;
    try {
      await apagarAnimal(localId, id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Animais</h1>
          <p className="text-sm text-muted-foreground">Rebanho ativo do local.</p>
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
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setSelecionadoId("novo")}>
            <Plus className="size-4" />
            Novo animal
          </Button>
          <Button size="sm" variant="outline" onClick={() => setLoteAberto(true)}>
            <Layers className="size-4" />
            Adicionar em lote
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
        <FiltroMultiSelecao
          rotulo="Todas as áreas"
          className="w-full md:w-auto"
          selecionados={areasFiltro}
          onChange={setAreasFiltro}
          opcoes={areas.map((a) => ({ value: a.id, label: a.nome }))}
        />
        <FiltroMultiSelecao
          rotulo="Todas as categorias"
          className="w-full md:w-auto"
          selecionados={categoriasFiltro}
          onChange={setCategoriasFiltro}
          opcoes={categoriasDaEspecie.map((c) => ({ value: c.id, label: c.descricao }))}
        />
        <FiltroMultiSelecao
          rotulo="Todos os sexos"
          className="w-full md:w-auto"
          selecionados={sexosFiltro}
          onChange={setSexosFiltro}
          opcoes={Object.entries(rotulosSexo).map(([value, label]) => ({ value, label }))}
        />
        <FiltroMultiSelecao
          rotulo="Todos os graus de sangue"
          className="w-full md:w-auto"
          selecionados={grausSangueFiltro}
          onChange={setGrausSangueFiltro}
          opcoes={grausSangue.map((g) => ({ value: g, label: g }))}
        />
        <span className="text-sm text-muted-foreground">{dados.length} animal(is)</span>
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <Beef className="size-8" />
          <p>Nenhum animal encontrado.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {colunas.map((coluna) => (
                <TableHead key={coluna.id} className={coluna.alinhamento === "right" ? "text-right" : undefined}>
                  <button
                    type="button"
                    onClick={() => ordenarPor(coluna.id)}
                    className={`inline-flex items-center gap-1 hover:text-foreground ${
                      coluna.alinhamento === "right" ? "flex-row-reverse" : ""
                    }`}
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
            {dados.map((a) => (
              <TableRow
                key={a.id}
                className={podeEditar ? "cursor-pointer" : undefined}
                onClick={() => podeEditar && setSelecionadoId(a.id)}
              >
                <TableCell className="font-medium">
                  {identificacao(a)}
                  {a.castrado && (
                    <Badge variant="outline" className="ml-2">
                      Castrado
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{a.categoria_descricao}</TableCell>
                <TableCell>{a.area_nome}</TableCell>
                <TableCell>{a.raca_descricao}</TableCell>
                <TableCell>{rotulosSexo[a.sexo] ?? a.sexo}</TableCell>
                <TableCell>{a.grau_sangue}</TableCell>
                <TableCell className="text-right tabular-nums">{formatarValor(a.valor)}</TableCell>
                {podeEditar && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      title="Apagar"
                      onClick={() => excluir(a.id)}
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
              <TableCell className="text-sm font-normal text-muted-foreground">
                {dados.length} {dados.length === 1 ? "animal" : "animais"}
              </TableCell>
              <TableCell colSpan={colunas.length - 2} className="text-right font-medium">
                Total
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">{formatarValor(totalValor)}</TableCell>
              {podeEditar && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {podeEditar && (
        <DialogoAnimal
          key={`individual-${selecionadoId ?? "fechado"}`}
          localId={localId}
          animal={selecionado}
          animais={animais}
          areas={areas}
          categorias={categorias}
          racas={racas}
          categoriasIvz={categoriasIvz}
          temCicloAtivo={!!cicloAtivoNome}
          onFechar={() => setSelecionadoId(null)}
        />
      )}

      {podeEditar && (
        <DialogoAnimalLote
          key={`lote-${loteAberto ? "aberto" : "fechado"}`}
          localId={localId}
          aberto={loteAberto}
          areas={areas}
          categorias={categorias}
          racas={racas}
          categoriasIvz={categoriasIvz}
          temCicloAtivo={!!cicloAtivoNome}
          onFechar={() => setLoteAberto(false)}
        />
      )}
    </div>
  );
}
