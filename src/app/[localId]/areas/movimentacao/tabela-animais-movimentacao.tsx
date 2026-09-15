"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { moverAnimais } from "@/lib/actions/movimentacoes";
import type { AnimalMovimentacao, Especie, OpcaoArea } from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];
const rotulosSexo: Record<string, string> = { macho: "Macho", femea: "Fêmea", desconhecido: "—" };
const grausSangue = ["PO", "PC", "1/4", "1/2", "SR", "Desconhecido"];
const hojeISO = new Date().toISOString().slice(0, 10);

function identificacao(a: AnimalMovimentacao) {
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

type ColunaId = "identificacao" | "area" | "categoria" | "raca" | "sexo" | "grauSangue";

const colunas: { id: ColunaId; rotulo: string }[] = [
  { id: "identificacao", rotulo: "Identificação" },
  { id: "area", rotulo: "Área atual" },
  { id: "categoria", rotulo: "Categoria" },
  { id: "raca", rotulo: "Raça" },
  { id: "sexo", rotulo: "Sexo" },
  { id: "grauSangue", rotulo: "Grau de sangue" },
];

function valorOrdenacao(a: AnimalMovimentacao, coluna: ColunaId): string | number {
  switch (coluna) {
    case "identificacao":
      return identificacao(a).toLowerCase();
    case "area":
      return a.area_nome.toLowerCase();
    case "categoria":
      return a.categoria_descricao.toLowerCase();
    case "raca":
      return a.raca_descricao.toLowerCase();
    case "sexo":
      return rotulosSexo[a.sexo] ?? a.sexo;
    case "grauSangue":
      return a.grau_sangue;
  }
}

type Props = {
  localId: string;
  animais: AnimalMovimentacao[];
  areas: OpcaoArea[];
  podeEditar: boolean;
};

export function TabelaAnimaisMovimentacao({ localId, animais, areas, podeEditar }: Props) {
  const [especieSelecionada, setEspecieSelecionada] = useState<Especie>("bovino");
  const [busca, setBusca] = useState("");
  const [areasFiltro, setAreasFiltro] = useState<Set<string>>(new Set());
  const [categoriasFiltro, setCategoriasFiltro] = useState<Set<string>>(new Set());
  const [racasFiltro, setRacasFiltro] = useState<Set<string>>(new Set());
  const [sexosFiltro, setSexosFiltro] = useState<Set<string>>(new Set());
  const [grausSangueFiltro, setGrausSangueFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({
    coluna: "identificacao",
    desc: false,
  });
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [areaDestinoId, setAreaDestinoId] = useState("");
  const [data, setData] = useState(hojeISO);
  const [responsavel, setResponsavel] = useState("");
  const [descricao, setDescricao] = useState("");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const animaisDaEspecie = useMemo(
    () => animais.filter((a) => a.especie === especieSelecionada),
    [animais, especieSelecionada],
  );
  const areasDisponiveis = useMemo(
    () => Array.from(new Set(animaisDaEspecie.map((a) => a.area_nome))).sort(),
    [animaisDaEspecie],
  );
  const categoriasDisponiveis = useMemo(
    () => Array.from(new Set(animaisDaEspecie.map((a) => a.categoria_descricao))).sort(),
    [animaisDaEspecie],
  );
  const racasDisponiveis = useMemo(
    () => Array.from(new Set(animaisDaEspecie.map((a) => a.raca_descricao))).sort(),
    [animaisDaEspecie],
  );

  function trocarEspecie(nova: Especie) {
    setEspecieSelecionada(nova);
    setSelecionados(new Set());
  }

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  const dados = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    const filtrados = animaisDaEspecie.filter((a) => {
      if (areasFiltro.size > 0 && !areasFiltro.has(a.area_nome)) return false;
      if (categoriasFiltro.size > 0 && !categoriasFiltro.has(a.categoria_descricao)) return false;
      if (racasFiltro.size > 0 && !racasFiltro.has(a.raca_descricao)) return false;
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
  }, [animaisDaEspecie, busca, areasFiltro, categoriasFiltro, racasFiltro, sexosFiltro, grausSangueFiltro, ordenacao]);

  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function marcarTodosFiltrados() {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      for (const a of dados) novo.add(a.id);
      return novo;
    });
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  async function confirmarMovimentacao() {
    setEmAndamento(true);
    setErro(undefined);
    const formData = new FormData();
    formData.set("localId", localId);
    formData.set("animalIds", JSON.stringify(Array.from(selecionados)));
    formData.set("areaDestinoId", areaDestinoId);
    formData.set("data", data);
    formData.set("responsavel", responsavel);
    formData.set("descricao", descricao);

    const resultado = await moverAnimais(undefined, formData);
    setEmAndamento(false);
    if (resultado?.erro) {
      setErro(resultado.erro);
      return;
    }
    toast.success(`${selecionados.size} animal(is) movido(s) de área.`);
    setSelecionados(new Set());
    setAreaDestinoId("");
    setResponsavel("");
    setDescricao("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Movimentação de animais</h1>
          <p className="text-sm text-muted-foreground">
            Marque os animais e escolha a área nova pra aplicar aos selecionados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {especies.map((e) => (
            <button
              key={e.value}
              onClick={() => trocarEspecie(e.value)}
              className={cn(
                buttonVariants({ variant: especieSelecionada === e.value ? "secondary" : "ghost", size: "sm" }),
              )}
            >
              {e.rotulo}
            </button>
          ))}
        </div>
      </div>

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
          opcoes={areasDisponiveis.map((a) => ({ value: a, label: a }))}
        />
        <FiltroMultiSelecao
          rotulo="Todas as categorias"
          className="w-full md:w-auto"
          selecionados={categoriasFiltro}
          onChange={setCategoriasFiltro}
          opcoes={categoriasDisponiveis.map((c) => ({ value: c, label: c }))}
        />
        <FiltroMultiSelecao
          rotulo="Todas as raças"
          className="w-full md:w-auto"
          selecionados={racasFiltro}
          onChange={setRacasFiltro}
          opcoes={racasDisponiveis.map((r) => ({ value: r, label: r }))}
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

      {podeEditar && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3">
          <Button type="button" variant="outline" size="sm" onClick={marcarTodosFiltrados}>
            Marcar todos os filtrados
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={limparSelecao}>
            Limpar seleção
          </Button>
          <span className="text-sm text-muted-foreground">{selecionados.size} selecionado(s)</span>
        </div>
      )}

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <ArrowLeftRight className="size-8" />
          <p>Nenhum animal encontrado.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {podeEditar && <TableHead className="w-10" />}
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((a) => (
              <TableRow
                key={a.id}
                className={podeEditar ? "cursor-pointer" : undefined}
                onClick={() => podeEditar && alternar(a.id)}
              >
                {podeEditar && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selecionados.has(a.id)} onCheckedChange={() => alternar(a.id)} />
                  </TableCell>
                )}
                <TableCell className="font-medium">{identificacao(a)}</TableCell>
                <TableCell>{a.area_nome}</TableCell>
                <TableCell>{a.categoria_descricao}</TableCell>
                <TableCell>{a.raca_descricao}</TableCell>
                <TableCell>{rotulosSexo[a.sexo] ?? a.sexo}</TableCell>
                <TableCell>{a.grau_sangue}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              {podeEditar && <TableCell />}
              <TableCell colSpan={colunas.length} className="text-sm font-normal text-muted-foreground">
                {dados.length} {dados.length === 1 ? "animal" : "animais"}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {podeEditar && (
        <div className="sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur supports-backdrop-filter:bg-background/85">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="areaDestinoMovimentacao">Área de destino</Label>
              <Select
                value={areaDestinoId}
                onValueChange={(v) => setAreaDestinoId(v ?? "")}
                items={areas.map((a) => ({ value: a.id, label: a.nome }))}
              >
                <SelectTrigger id="areaDestinoMovimentacao" className="w-44">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dataMovimentacao">Data</Label>
              <Input
                id="dataMovimentacao"
                type="date"
                max={hojeISO}
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="responsavelMovimentacao">Responsável</Label>
              <Input
                id="responsavelMovimentacao"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="descricaoMovimentacao">Descrição</Label>
              <Input
                id="descricaoMovimentacao"
                placeholder="Ex.: Rodízio de pasto"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-56"
              />
            </div>
            <Button
              type="button"
              disabled={emAndamento || selecionados.size === 0 || !areaDestinoId}
              onClick={confirmarMovimentacao}
            >
              {emAndamento ? "Movendo..." : `Mover animais (${selecionados.size})`}
            </Button>
          </div>
          {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
        </div>
      )}
    </div>
  );
}
