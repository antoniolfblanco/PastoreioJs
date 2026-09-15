"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { salvarCategoria } from "@/lib/actions/categorias";
import type { CategoriaIvz, Especie, OpcaoCategoria } from "./page";

const rotulosSexo: Record<string, string> = { macho: "Macho", femea: "Fêmea", desconhecido: "—" };

// Criação rápida de categoria com todos os detalhes (mesmos campos da tela
// Categorias), sem sair do formulário de animal. A espécie vem travada na
// que já está selecionada no formulário do animal.
export function DialogoCriarCategoria({
  localId,
  aberto,
  especie,
  categoriasIvz,
  onFechar,
  onCriada,
}: {
  localId: string;
  aberto: boolean;
  especie: Especie;
  categoriasIvz: CategoriaIvz[];
  onFechar: () => void;
  onCriada: (categoria: OpcaoCategoria) => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(salvarCategoria, undefined);
  const ivzDaEspecie = useMemo(() => categoriasIvz.filter((c) => c.especie === especie), [categoriasIvz, especie]);
  const [categoriaIvzId, setCategoriaIvzId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const ivzSelecionada = ivzDaEspecie.find((c) => c.id === categoriaIvzId);

  useEffect(() => {
    if (resultado === undefined || resultado.erro || !resultado.id || !resultado.sexo) return;
    onCriada({
      id: resultado.id,
      descricao: descricao || ivzSelecionada?.nome || "",
      especie,
      sexo: resultado.sexo as OpcaoCategoria["sexo"],
    });
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <Dialog open={aberto} onOpenChange={(estaAberto) => !estaAberto && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova categoria</DialogTitle>
        </DialogHeader>
        {aberto && (
          <form key="nova-categoria" action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="categoriaIvzNovaCategoria">Categoria IVZ</Label>
              <Select
                name="categoriaIvzId"
                value={categoriaIvzId}
                onValueChange={(v) => setCategoriaIvzId(v ?? "")}
                items={ivzDaEspecie.map((c) => ({
                  value: c.id,
                  label: `${c.nome} (${rotulosSexo[c.sexo] ?? c.sexo})`,
                }))}
              >
                <SelectTrigger id="categoriaIvzNovaCategoria" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ivzDaEspecie.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} ({rotulosSexo[c.sexo] ?? c.sexo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="descricaoNovaCategoria">Descrição</Label>
              <Input
                id="descricaoNovaCategoria"
                name="descricao"
                required
                value={descricao || ivzSelecionada?.nome || ""}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="grupoNovaCategoria">Grupo</Label>
                <Input id="grupoNovaCategoria" name="grupo" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ordemNovaCategoria">Ordem</Label>
                <Input id="ordemNovaCategoria" name="ordem" type="number" defaultValue={0} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="observacaoNovaCategoria">Observação</Label>
              <Textarea id="observacaoNovaCategoria" name="observacao" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ativoNovaCategoria"
                name="ativo"
                checked={ativo}
                onCheckedChange={(v) => setAtivo(v === true)}
              />
              <Label htmlFor="ativoNovaCategoria">Categoria ativa</Label>
            </div>
            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento || !categoriaIvzId}>
                {emAndamento ? "Salvando..." : "Criar categoria"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
