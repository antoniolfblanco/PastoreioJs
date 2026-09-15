"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { salvarEnfermidade } from "@/lib/actions/mortes";
import type { OpcaoEnfermidade } from "./page";

// Select de causa/enfermidade com um "+" ao lado pra cadastrar uma nova sem
// sair do formulário — mesmo padrão do CampoRaca.
export function CampoEnfermidade({
  htmlId,
  value,
  onValueChange,
  enfermidades,
  localId,
  onCriada,
}: {
  htmlId: string;
  value: string;
  onValueChange: (v: string) => void;
  enfermidades: OpcaoEnfermidade[];
  localId: string;
  onCriada: (enfermidade: OpcaoEnfermidade) => void;
}) {
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  async function criar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmAndamento(true);
    setErro(undefined);
    const resultado = await salvarEnfermidade(undefined, new FormData(e.currentTarget));
    setEmAndamento(false);
    if (resultado?.erro) {
      setErro(resultado.erro);
      return;
    }
    if (resultado?.id) {
      onCriada({ id: resultado.id, descricao });
      onValueChange(resultado.id);
      setDialogoAberto(false);
      setDescricao("");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlId}>Causa (enfermidade)</Label>
      <div className="flex items-center gap-1.5">
        <Select
          name="enfermidadeId"
          value={value}
          onValueChange={(v) => onValueChange(v ?? "")}
          items={[
            { value: "", label: "Não informada" },
            ...enfermidades.map((e) => ({ value: e.id, label: e.descricao })),
          ]}
        >
          <SelectTrigger id={htmlId} className="w-full">
            <SelectValue placeholder="Não informada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Não informada</SelectItem>
            {enfermidades.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.descricao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          title="Nova enfermidade"
          onClick={() => setDialogoAberto(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <Dialog open={dialogoAberto} onOpenChange={setDialogoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova enfermidade</DialogTitle>
          </DialogHeader>
          <form onSubmit={criar} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${htmlId}-novaDescricao`}>Nome</Label>
              <Input
                id={`${htmlId}-novaDescricao`}
                name="descricao"
                required
                autoFocus
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento}>
                {emAndamento ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
