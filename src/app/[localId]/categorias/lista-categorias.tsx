"use client";

import { useState, useActionState, useEffect, useMemo } from "react";
import { Plus, Trash2, Tag, Download } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { salvarCategoria, apagarCategoria, importarCategoriasSugeridas } from "@/lib/actions/categorias";
import { cn } from "@/lib/utils";
import type { Categoria, CategoriaIvz, Especie } from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];

const rotulosSexo: Record<string, string> = { macho: "Macho", femea: "Fêmea", desconhecido: "—" };

type Props = {
  localId: string;
  categorias: Categoria[];
  categoriasIvz: CategoriaIvz[];
  podeEditar: boolean;
};

export function ListaCategorias({ localId, categorias, categoriasIvz, podeEditar }: Props) {
  const [especie, setEspecie] = useState<Especie>("bovino");
  const [selecionadoId, setSelecionadoId] = useState<string | "novo" | null>(null);
  const [importando, setImportando] = useState(false);

  const categoriasDaEspecie = useMemo(
    () => categorias.filter((c) => c.especie === especie),
    [categorias, especie],
  );
  const ivzDaEspecie = useMemo(
    () => categoriasIvz.filter((c) => c.especie === especie),
    [categoriasIvz, especie],
  );

  const selecionado =
    selecionadoId === null
      ? null
      : selecionadoId === "novo"
        ? "novo"
        : (categoriasDaEspecie.find((c) => c.id === selecionadoId) ?? null);

  async function excluir(id: string) {
    if (!confirm("Apagar esta categoria?")) return;
    try {
      await apagarCategoria(localId, id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    }
  }

  async function importarSugeridas() {
    setImportando(true);
    try {
      await importarCategoriasSugeridas(localId, especie);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível importar.");
    } finally {
      setImportando(false);
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
          <Button size="sm" variant="outline" disabled={importando} onClick={importarSugeridas}>
            <Download className="size-4" />
            {importando ? "Importando..." : "Importar sugeridas"}
          </Button>
        </div>
      )}

      {categoriasDaEspecie.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <Tag className="size-8" />
          <p>Nenhuma categoria cadastrada pra essa espécie ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {categoriasDaEspecie.map((c) => (
            <Card
              key={c.id}
              className="flex-row items-center justify-between gap-2 px-4 py-3 cursor-pointer hover:bg-muted/40"
              onClick={() => podeEditar && setSelecionadoId(c.id)}
            >
              <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.descricao}</span>
                  {!c.ativo && <Badge variant="outline">Inativa</Badge>}
                </div>
                <span className="truncate text-sm text-muted-foreground">
                  {[rotulosSexo[c.sexo] ?? c.sexo, c.grupo].filter(Boolean).join(" • ")}
                </span>
              </div>
              {podeEditar && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-destructive"
                  title="Apagar"
                  onClick={(e) => {
                    e.stopPropagation();
                    excluir(c.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </Card>
          ))}
        </div>
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
