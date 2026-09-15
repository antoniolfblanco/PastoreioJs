"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogoCriarCategoria } from "./dialogo-criar-categoria";
import type { CategoriaIvz, Especie, OpcaoCategoria } from "./page";

// Select de categoria (filtrada pela espécie escolhida) com um "+" ao lado
// que abre a tela completa de criar categoria (mesmos campos da tela
// Categorias) sem sair do formulário de animal.
export function CampoCategoria({
  htmlId,
  value,
  onValueChange,
  categorias,
  categoriasIvz,
  especie,
  localId,
  onCriada,
}: {
  htmlId: string;
  value: string;
  onValueChange: (v: string) => void;
  categorias: OpcaoCategoria[];
  categoriasIvz: CategoriaIvz[];
  especie: Especie;
  localId: string;
  onCriada: (categoria: OpcaoCategoria) => void;
}) {
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const categoriaSelecionada = categorias.find((c) => c.id === value);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlId}>Categoria</Label>
      <div className="flex items-center gap-1.5">
        <Select
          name="categoriaId"
          value={value}
          onValueChange={(v) => onValueChange(v ?? "")}
          items={categorias.map((c) => ({ value: c.id, label: c.descricao }))}
        >
          <SelectTrigger id={htmlId} className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.descricao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          title="Nova categoria"
          onClick={() => setDialogoAberto(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      {categoriaSelecionada && (
        <p className="text-xs text-muted-foreground">
          Sexo:{" "}
          {categoriaSelecionada.sexo === "macho" ? "Macho" : categoriaSelecionada.sexo === "femea" ? "Fêmea" : "—"}{" "}
          (definido pela categoria)
        </p>
      )}
      <DialogoCriarCategoria
        localId={localId}
        aberto={dialogoAberto}
        especie={especie}
        categoriasIvz={categoriasIvz}
        onFechar={() => setDialogoAberto(false)}
        onCriada={(categoria) => {
          onCriada(categoria);
          onValueChange(categoria.id);
        }}
      />
    </div>
  );
}
