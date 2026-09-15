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
import { DialogoCriarArea } from "./dialogo-criar-area";
import type { OpcaoArea } from "./page";

// Select de área com um "+" ao lado que abre a tela completa de criar área
// (mesmos campos da tela Áreas) sem sair do formulário de animal.
export function CampoArea({
  htmlId,
  value,
  onValueChange,
  areas,
  localId,
  onCriada,
}: {
  htmlId: string;
  value: string;
  onValueChange: (v: string) => void;
  areas: OpcaoArea[];
  localId: string;
  onCriada: (area: OpcaoArea) => void;
}) {
  const [dialogoAberto, setDialogoAberto] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlId}>Área</Label>
      <div className="flex items-center gap-1.5">
        <Select
          name="areaId"
          value={value}
          onValueChange={(v) => onValueChange(v ?? "")}
          items={areas.map((a) => ({ value: a.id, label: a.nome }))}
        >
          <SelectTrigger id={htmlId} className="w-full">
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
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          title="Nova área"
          onClick={() => setDialogoAberto(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <DialogoCriarArea
        localId={localId}
        aberto={dialogoAberto}
        onFechar={() => setDialogoAberto(false)}
        onCriada={(area) => {
          onCriada(area);
          onValueChange(area.id);
        }}
      />
    </div>
  );
}
