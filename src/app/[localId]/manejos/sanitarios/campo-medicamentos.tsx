"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FiltroMultiSelecao } from "@/components/filtro-multi-selecao";
import { salvarMedicamento } from "@/lib/actions/medicamentos";
import type { OpcaoMedicamento } from "./page";

export function CampoMedicamentos({
  localId,
  medicamentos,
  selecionados,
  onChange,
  onCriado,
}: {
  localId: string;
  medicamentos: OpcaoMedicamento[];
  selecionados: Set<string>;
  onChange: (novo: Set<string>) => void;
  onCriado: (medicamento: OpcaoMedicamento) => void;
}) {
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [marca, setMarca] = useState("");
  const [principioAtivo, setPrincipioAtivo] = useState("");
  const [dosagem, setDosagem] = useState("");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  async function criar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmAndamento(true);
    setErro(undefined);
    const resultado = await salvarMedicamento(undefined, new FormData(e.currentTarget));
    setEmAndamento(false);
    if (resultado?.erro) {
      setErro(resultado.erro);
      return;
    }
    if (resultado?.id) {
      const novo: OpcaoMedicamento = {
        id: resultado.id,
        descricao,
        marca: marca || null,
        principio_ativo: principioAtivo || null,
        dosagem: dosagem || null,
      };
      onCriado(novo);
      onChange(new Set(selecionados).add(novo.id));
      setDialogoAberto(false);
      setDescricao("");
      setMarca("");
      setPrincipioAtivo("");
      setDosagem("");
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <FiltroMultiSelecao
        rotulo="Selecione os medicamentos"
        className="w-56"
        selecionados={selecionados}
        onChange={onChange}
        opcoes={medicamentos.map((m) => ({
          value: m.id,
          label: m.principio_ativo ? `${m.descricao} (${m.principio_ativo})` : m.descricao,
        }))}
      />
      <Button type="button" variant="outline" size="icon-sm" title="Novo medicamento" onClick={() => setDialogoAberto(true)}>
        <Plus className="size-4" />
      </Button>
      <Dialog open={dialogoAberto} onOpenChange={setDialogoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo medicamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={criar} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            <input type="hidden" name="ativo" value="on" />
            <div className="flex flex-col gap-2">
              <Label htmlFor="descricaoNovoMedicamento">Nome</Label>
              <Input
                id="descricaoNovoMedicamento"
                name="descricao"
                required
                autoFocus
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="marcaNovoMedicamento">Marca</Label>
                <Input id="marcaNovoMedicamento" name="marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="principioAtivoNovoMedicamento">Princípio ativo</Label>
                <Input
                  id="principioAtivoNovoMedicamento"
                  name="principioAtivo"
                  value={principioAtivo}
                  onChange={(e) => setPrincipioAtivo(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dosagemNovoMedicamento">Dosagem</Label>
              <Input
                id="dosagemNovoMedicamento"
                name="dosagem"
                placeholder="Ex.: 1 mL a cada 50 kg"
                value={dosagem}
                onChange={(e) => setDosagem(e.target.value)}
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
