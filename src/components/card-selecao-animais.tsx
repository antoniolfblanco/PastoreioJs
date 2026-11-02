"use client";

import { useMemo, useState } from "react";
import { Beef } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { FiltroMultiSelecao } from "@/components/filtro-multi-selecao";
import { cn } from "@/lib/utils";

export type Especie = "bovino" | "ovino" | "equino";

export type AnimalSelecionavel = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  especie: Especie;
  sexo: string;
  grau_sangue: string;
  categoria_descricao: string;
  area_nome: string;
  raca_descricao: string;
};

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];
export const rotulosSexo: Record<string, string> = { macho: "Macho", femea: "Fêmea", desconhecido: "—" };
const grausSangue = ["PO", "PC", "1/4", "1/2", "SR", "Desconhecido"];

export function identificacaoAnimal(a: { nome: string | null; brinco: string | null; tatuagem: string | null }) {
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

// Card de seleção de animais das rotinas em três colunas (Nova venda, Nova
// morte...): espécie, busca, filtros e a tabela com checkbox. Os animais que
// já foram pra lista da direita ficam esmaecidos e travados aqui.
export function CardSelecaoAnimais({
  animais,
  especie,
  onTrocarEspecie,
  especieTravada,
  marcados,
  onMarcadosChange,
  idsIndisponiveis,
  rotuloIndisponivel,
}: {
  animais: AnimalSelecionavel[];
  especie: Especie;
  onTrocarEspecie: (especie: Especie) => void;
  // Com animais já na lista da direita, trocar de espécie fica bloqueado.
  especieTravada: boolean;
  marcados: Set<string>;
  onMarcadosChange: (marcados: Set<string>) => void;
  idsIndisponiveis: Set<string>;
  rotuloIndisponivel: string;
}) {
  const [busca, setBusca] = useState("");
  const [areasFiltro, setAreasFiltro] = useState<Set<string>>(new Set());
  const [categoriasFiltro, setCategoriasFiltro] = useState<Set<string>>(new Set());
  const [racasFiltro, setRacasFiltro] = useState<Set<string>>(new Set());
  const [sexosFiltro, setSexosFiltro] = useState<Set<string>>(new Set());
  const [grausSangueFiltro, setGrausSangueFiltro] = useState<Set<string>>(new Set());

  const animaisDaEspecie = useMemo(() => animais.filter((a) => a.especie === especie), [animais, especie]);
  const opcoes = useMemo(() => {
    const unicos = (lista: string[]) => Array.from(new Set(lista)).sort((a, b) => a.localeCompare(b, "pt-BR"));
    return {
      areas: unicos(animaisDaEspecie.map((a) => a.area_nome)),
      categorias: unicos(animaisDaEspecie.map((a) => a.categoria_descricao)),
      racas: unicos(animaisDaEspecie.map((a) => a.raca_descricao)),
    };
  }, [animaisDaEspecie]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return animaisDaEspecie
      .filter((a) => {
        if (areasFiltro.size > 0 && !areasFiltro.has(a.area_nome)) return false;
        if (categoriasFiltro.size > 0 && !categoriasFiltro.has(a.categoria_descricao)) return false;
        if (racasFiltro.size > 0 && !racasFiltro.has(a.raca_descricao)) return false;
        if (sexosFiltro.size > 0 && !sexosFiltro.has(a.sexo)) return false;
        if (grausSangueFiltro.size > 0 && !grausSangueFiltro.has(a.grau_sangue)) return false;
        if (!termo) return true;
        return [a.nome, a.brinco, a.tatuagem, a.raca_descricao]
          .filter(Boolean)
          .some((t) => t!.toLowerCase().includes(termo));
      })
      .sort((a, b) => identificacaoAnimal(a).localeCompare(identificacaoAnimal(b), "pt-BR", { numeric: true }));
  }, [animaisDaEspecie, busca, areasFiltro, categoriasFiltro, racasFiltro, sexosFiltro, grausSangueFiltro]);

  const disponiveisFiltrados = filtrados.filter((a) => !idsIndisponiveis.has(a.id));
  const todosFiltradosMarcados =
    disponiveisFiltrados.length > 0 && disponiveisFiltrados.every((a) => marcados.has(a.id));

  function alternar(id: string) {
    const novo = new Set(marcados);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    onMarcadosChange(novo);
  }

  function alternarTodosFiltrados() {
    const novo = new Set(marcados);
    for (const a of disponiveisFiltrados) {
      if (todosFiltradosMarcados) novo.delete(a.id);
      else novo.add(a.id);
    }
    onMarcadosChange(novo);
  }

  function trocarEspecie(nova: Especie) {
    onTrocarEspecie(nova);
    setAreasFiltro(new Set());
    setCategoriasFiltro(new Set());
    setRacasFiltro(new Set());
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Selecionar animais</CardTitle>
        <CardDescription>
          {disponiveisFiltrados.length} disponível(is) · {marcados.size} marcado(s)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {especies.map((e) => (
            <button
              key={e.value}
              onClick={() => trocarEspecie(e.value)}
              disabled={especieTravada && e.value !== especie}
              className={cn(buttonVariants({ variant: especie === e.value ? "secondary" : "ghost", size: "sm" }))}
            >
              {e.rotulo}
            </button>
          ))}
        </div>
        <Input
          placeholder="Buscar por nome, brinco, tatuagem ou raça..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <FiltroMultiSelecao
            rotulo="Áreas"
            selecionados={areasFiltro}
            onChange={setAreasFiltro}
            opcoes={opcoes.areas.map((a) => ({ value: a, label: a }))}
          />
          <FiltroMultiSelecao
            rotulo="Categorias"
            selecionados={categoriasFiltro}
            onChange={setCategoriasFiltro}
            opcoes={opcoes.categorias.map((c) => ({ value: c, label: c }))}
          />
          <FiltroMultiSelecao
            rotulo="Raças"
            selecionados={racasFiltro}
            onChange={setRacasFiltro}
            opcoes={opcoes.racas.map((r) => ({ value: r, label: r }))}
          />
          <FiltroMultiSelecao
            rotulo="Sexos"
            selecionados={sexosFiltro}
            onChange={setSexosFiltro}
            opcoes={Object.entries(rotulosSexo).map(([value, label]) => ({ value, label }))}
          />
          <FiltroMultiSelecao
            rotulo="Graus de sangue"
            selecionados={grausSangueFiltro}
            onChange={setGrausSangueFiltro}
            opcoes={grausSangue.map((g) => ({ value: g, label: g }))}
          />
        </div>

        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-muted-foreground">
            <Beef className="size-8" />
            <p className="text-sm">Nenhum animal encontrado.</p>
          </div>
        ) : (
          <div className="max-h-[28rem] overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={todosFiltradosMarcados}
                      disabled={disponiveisFiltrados.length === 0}
                      onCheckedChange={alternarTodosFiltrados}
                      title="Marcar todos os filtrados"
                    />
                  </TableHead>
                  <TableHead>Identificação</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Sexo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((a) => {
                  const indisponivel = idsIndisponiveis.has(a.id);
                  return (
                    <TableRow
                      key={a.id}
                      className={cn(indisponivel ? "opacity-50" : "cursor-pointer")}
                      onClick={() => !indisponivel && alternar(a.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={marcados.has(a.id) || indisponivel}
                          disabled={indisponivel}
                          onCheckedChange={() => alternar(a.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {identificacaoAnimal(a)}
                        {indisponivel && (
                          <Badge variant="outline" className="ml-2">
                            {rotuloIndisponivel}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{a.categoria_descricao}</TableCell>
                      <TableCell>{a.area_nome}</TableCell>
                      <TableCell>{rotulosSexo[a.sexo] ?? a.sexo}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
