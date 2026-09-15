"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { AnimalAtivo } from "./page";

function identificacao(a: AnimalAtivo) {
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

export function SeletorAnimaisAjuste({
  aberto,
  animais,
  selecionados,
  onConfirmar,
  onFechar,
}: {
  aberto: boolean;
  animais: AnimalAtivo[];
  selecionados: Set<string>;
  onConfirmar: (ids: Set<string>) => void;
  onFechar: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [marcados, setMarcados] = useState<Set<string>>(selecionados);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return animais;
    return animais.filter((a) =>
      [a.nome, a.brinco, a.tatuagem, a.categoria_descricao, a.area_nome]
        .filter(Boolean)
        .some((texto) => texto!.toLowerCase().includes(termo)),
    );
  }, [animais, busca]);

  function alternar(id: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function marcarTodosVisiveis() {
    setMarcados((atual) => {
      const novo = new Set(atual);
      for (const a of filtrados) novo.add(a.id);
      return novo;
    });
  }

  function desmarcarTodosVisiveis() {
    setMarcados((atual) => {
      const novo = new Set(atual);
      for (const a of filtrados) novo.delete(a.id);
      return novo;
    });
  }

  function fechar(estaAberto: boolean) {
    if (estaAberto) return;
    setBusca("");
    setMarcados(selecionados);
    onFechar();
  }

  function confirmar() {
    onConfirmar(marcados);
    onFechar();
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Selecionar animais</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Buscar por nome, brinco, tatuagem, categoria ou área..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          autoFocus
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={marcarTodosVisiveis}>
            Marcar todos os filtrados
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={desmarcarTodosVisiveis}>
            Desmarcar todos os filtrados
          </Button>
          <span className="text-sm text-muted-foreground">{marcados.size} selecionado(s)</span>
        </div>

        <div className="max-h-96 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground">Nenhum animal encontrado.</td>
                </tr>
              ) : (
                filtrados.map((a) => (
                  <tr
                    key={a.id}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                    onClick={() => alternar(a.id)}
                  >
                    <td className="w-10 px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={marcados.has(a.id)} onCheckedChange={() => alternar(a.id)} />
                    </td>
                    <td className="px-3 py-2 font-medium">{identificacao(a)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.categoria_descricao}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.area_nome}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button type="button" onClick={confirmar}>
            Usar seleção ({marcados.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
