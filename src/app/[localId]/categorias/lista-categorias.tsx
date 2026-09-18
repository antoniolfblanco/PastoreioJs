"use client";

import { useState, useActionState, useEffect, useMemo } from "react";
import { Plus, Trash2, Tag, Download, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { salvarCategoria, apagarCategoria } from "@/lib/actions/categorias";
import { cn } from "@/lib/utils";
import { DialogoImportarSugeridas } from "./dialogo-importar-sugeridas";
import type { Categoria, CategoriaIvz, CategoriaSugerida, Especie } from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];

const rotulosSexo: Record<string, string> = { macho: "Macho", femea: "Fêmea", desconhecido: "—" };
const rotulosStatus: Record<string, string> = { ativa: "Ativa", inativa: "Inativa" };

type ColunaId = "descricao" | "sexo" | "grupo" | "status";

const colunas: { id: ColunaId; rotulo: string }[] = [
  { id: "descricao", rotulo: "Descrição" },
  { id: "sexo", rotulo: "Sexo" },
  { id: "grupo", rotulo: "Grupo" },
  { id: "status", rotulo: "Status" },
];

function valorOrdenacao(c: Categoria, coluna: ColunaId): string | number {
  switch (coluna) {
    case "descricao":
      return c.descricao.toLowerCase();
    case "sexo":
      return rotulosSexo[c.sexo] ?? c.sexo;
    case "grupo":
      return (c.grupo ?? "").toLowerCase();
    case "status":
      return c.ativo ? 0 : 1;
  }
}

type Props = {
  localId: string;
  categorias: Categoria[];
  categoriasIvz: CategoriaIvz[];
  categoriasSugeridas: CategoriaSugerida[];
  podeEditar: boolean;
};

export function ListaCategorias({ localId, categorias, categoriasIvz, categoriasSugeridas, podeEditar }: Props) {
  const [especie, setEspecie] = useState<Especie>("bovino");
  const [busca, setBusca] = useState("");
  const [sexosFiltro, setSexosFiltro] = useState<Set<string>>(new Set());
  const [gruposFiltro, setGruposFiltro] = useState<Set<string>>(new Set());
  const [statusFiltro, setStatusFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({
    coluna: "descricao",
    desc: false,
  });
  const [selecionadoId, setSelecionadoId] = useState<string | "novo" | null>(null);
  const [importarAberto, setImportarAberto] = useState(false);

  const categoriasDaEspecie = useMemo(
    () => categorias.filter((c) => c.especie === especie),
    [categorias, especie],
  );
  const ivzDaEspecie = useMemo(
    () => categoriasIvz.filter((c) => c.especie === especie),
    [categoriasIvz, especie],
  );
  const sugeridasDaEspecie = useMemo(
    () => categoriasSugeridas.filter((s) => s.especie === especie),
    [categoriasSugeridas, especie],
  );
  const descricoesJaImportadas = useMemo(
    () => new Set(categoriasDaEspecie.map((c) => c.descricao.trim().toLowerCase())),
    [categoriasDaEspecie],
  );
  const gruposDisponiveis = useMemo(
    () => Array.from(new Set(categoriasDaEspecie.map((c) => c.grupo).filter((g): g is string => !!g))).sort(),
    [categoriasDaEspecie],
  );

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  const dados = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    const filtrados = categoriasDaEspecie.filter((c) => {
      if (sexosFiltro.size > 0 && !sexosFiltro.has(c.sexo)) return false;
      if (gruposFiltro.size > 0 && (!c.grupo || !gruposFiltro.has(c.grupo))) return false;
      if (statusFiltro.size > 0 && !statusFiltro.has(c.ativo ? "ativa" : "inativa")) return false;
      if (!buscaMin) return true;
      return [c.descricao, c.grupo, c.observacao].filter(Boolean).some((texto) => texto!.toLowerCase().includes(buscaMin));
    });

    return [...filtrados].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [categoriasDaEspecie, busca, sexosFiltro, gruposFiltro, statusFiltro, ordenacao]);

  const selecionado =
    selecionadoId === null
      ? null
      : selecionadoId === "novo"
        ? "novo"
        : (categoriasDaEspecie.find((c) => c.id === selecionadoId) ?? null);

  async function excluir(id: string) {
    if (!confirm("Apagar esta categoria?")) return;
    try {
      const resultado = await apagarCategoria(localId, id);
      if (resultado.error) alert(resultado.error);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1">
        {especies.map((e) => (
          <button
            key={e.value}
            onClick={() => setEspecie(e.value)}
            className={cn(buttonVariants({ variant: especie === e.value ? "secondary" : "ghost", size: "sm" }))}
          >
            {e.rotulo}
          </button>
        ))}
      </div>

      {podeEditar && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setSelecionadoId("novo")}>
            <Plus className="size-4" />
            Nova categoria
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportarAberto(true)}>
            <Download className="size-4" />
            Importar sugeridas
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por descrição, grupo ou observação..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full md:max-w-64"
        />
        <FiltroMultiSelecao
          rotulo="Todos os sexos"
          className="w-full md:w-auto"
          selecionados={sexosFiltro}
          onChange={setSexosFiltro}
          opcoes={Object.entries(rotulosSexo).map(([value, label]) => ({ value, label }))}
        />
        <FiltroMultiSelecao
          rotulo="Todos os grupos"
          className="w-full md:w-auto"
          selecionados={gruposFiltro}
          onChange={setGruposFiltro}
          opcoes={gruposDisponiveis.map((g) => ({ value: g, label: g }))}
        />
        <FiltroMultiSelecao
          rotulo="Todos os status"
          className="w-full md:w-auto"
          selecionados={statusFiltro}
          onChange={setStatusFiltro}
          opcoes={Object.entries(rotulosStatus).map(([value, label]) => ({ value, label }))}
        />
        <span className="text-sm text-muted-foreground">{dados.length} categoria(s)</span>
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <Tag className="size-8" />
          <p>Nenhuma categoria encontrada.</p>
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
            {dados.map((c) => (
              <TableRow
                key={c.id}
                className={podeEditar ? "cursor-pointer" : undefined}
                onClick={() => podeEditar && setSelecionadoId(c.id)}
              >
                <TableCell className="font-medium">{c.descricao}</TableCell>
                <TableCell>{rotulosSexo[c.sexo] ?? c.sexo}</TableCell>
                <TableCell>{c.grupo ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={c.ativo ? "secondary" : "outline"}>{c.ativo ? "Ativa" : "Inativa"}</Badge>
                </TableCell>
                {podeEditar && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      title="Apagar"
                      onClick={() => excluir(c.id)}
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
                {dados.length} {dados.length === 1 ? "categoria" : "categorias"}
              </TableCell>
              <TableCell colSpan={colunas.length - 1} />
              {podeEditar && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {podeEditar && (
        <DialogoCategoria
          // Sem key, o diálogo não remonta ao trocar de categoria e os
          // useState de categoriaIvzId/ativo ficam presos na primeira montagem.
          key={selecionadoId ?? "fechado"}
          localId={localId}
          categoriasIvz={ivzDaEspecie}
          categoria={selecionado}
          onFechar={() => setSelecionadoId(null)}
        />
      )}

      {podeEditar && (
        <DialogoImportarSugeridas
          key={especie}
          localId={localId}
          categoriasIvz={ivzDaEspecie}
          aberto={importarAberto}
          sugeridas={sugeridasDaEspecie}
          descricoesJaImportadas={descricoesJaImportadas}
          onFechar={() => setImportarAberto(false)}
        />
      )}
    </div>
  );
}

function DialogoCategoria({
  localId,
  categoriasIvz,
  categoria,
  onFechar,
}: {
  localId: string;
  categoriasIvz: CategoriaIvz[];
  categoria: Categoria | "novo" | null;
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(salvarCategoria, undefined);
  const existente = categoria && categoria !== "novo" ? categoria : null;
  const [categoriaIvzId, setCategoriaIvzId] = useState(existente?.categoria_ivz_id ?? "");
  const [ativo, setAtivo] = useState(existente?.ativo ?? true);

  useEffect(() => {
    if (resultado !== undefined && !resultado.erro) onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  const ivzSelecionada = categoriasIvz.find((c) => c.id === categoriaIvzId);

  return (
    <Dialog open={categoria !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existente ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        {categoria && (
          <form key={existente?.id ?? "novo"} action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            {existente && <input type="hidden" name="id" value={existente.id} />}
            <div className="flex flex-col gap-2">
              <Label htmlFor="categoriaIvzId">Categoria IVZ</Label>
              <Select
                name="categoriaIvzId"
                value={categoriaIvzId}
                onValueChange={(v) => setCategoriaIvzId(v ?? "")}
                items={categoriasIvz.map((c) => ({
                  value: c.id,
                  label: `${c.nome} (${rotulosSexo[c.sexo] ?? c.sexo})`,
                }))}
              >
                <SelectTrigger id="categoriaIvzId" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasIvz.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} ({rotulosSexo[c.sexo] ?? c.sexo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                name="descricao"
                required
                defaultValue={existente?.descricao ?? ivzSelecionada?.nome ?? ""}
                key={existente ? `${existente.id}-descricao` : `novo-descricao-${categoriaIvzId}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="grupo">Grupo</Label>
                <Input id="grupo" name="grupo" defaultValue={existente?.grupo ?? ""} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ordem">Ordem</Label>
                <Input id="ordem" name="ordem" type="number" defaultValue={existente?.ordem ?? 0} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea id="observacao" name="observacao" defaultValue={existente?.observacao ?? ""} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ativo"
                name="ativo"
                checked={ativo}
                onCheckedChange={(v) => setAtivo(v === true)}
              />
              <Label htmlFor="ativo">Categoria ativa</Label>
            </div>
            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento || !categoriaIvzId}>
                {emAndamento ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
