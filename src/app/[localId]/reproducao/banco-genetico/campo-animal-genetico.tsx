"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CandidatoGenetico, Especie } from "./page";

function identificacaoCandidato(a: CandidatoGenetico) {
  const base = [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
  return a.externo ? `${base} (externo)` : base;
}

// Campo de busca com autocompletar em vez de diálogo empilhado — dois
// diálogos centralizados um sobre o outro (o de registrar + o de
// selecionar) causavam clique-fantasma: o clique que fechava o seletor
// caía de novo no botão "Selecionar..." que ficava exposto embaixo, na
// mesma posição, reabrindo o seletor. O "+" abre o cadastro de Animais
// Externos numa aba nova, sem perder o que já foi preenchido aqui (mesmo
// espírito do atalho do app Flutter, que navega pra tela de cadastro e
// volta).
export function CampoAnimalGenetico({
  htmlId,
  localId,
  rotulo,
  sexo,
  especie,
  candidatos,
  value,
  onValueChange,
}: {
  htmlId: string;
  localId: string;
  rotulo: string;
  sexo: "macho" | "femea";
  especie: Especie;
  candidatos: CandidatoGenetico[];
  value: string;
  onValueChange: (id: string) => void;
}) {
  const disponiveis = useMemo(
    () => candidatos.filter((a) => a.sexo === sexo && a.especie === especie),
    [candidatos, sexo, especie],
  );
  const selecionado = useMemo(() => disponiveis.find((a) => a.id === value), [disponiveis, value]);

  const [texto, setTexto] = useState(selecionado ? identificacaoCandidato(selecionado) : "");
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);

  const sugestoes = useMemo(() => {
    const termo = texto.trim().toLowerCase();
    const lista = termo
      ? disponiveis.filter((a) => identificacaoCandidato(a).toLowerCase().includes(termo))
      : disponiveis;
    return lista.slice(0, 8);
  }, [disponiveis, texto]);

  function selecionar(a: CandidatoGenetico) {
    onValueChange(a.id);
    setTexto(identificacaoCandidato(a));
    setSugestoesAbertas(false);
  }

  function limpar() {
    onValueChange("");
    setTexto("");
  }

  function aoSairDoFoco() {
    // Espera o clique numa sugestão registrar antes de fechar a lista —
    // senão o blur fecha antes do clique valer.
    setTimeout(() => {
      setSugestoesAbertas(false);
      const encontrado = disponiveis.find(
        (a) => identificacaoCandidato(a).trim().toLowerCase() === texto.trim().toLowerCase(),
      );
      if (encontrado) {
        if (encontrado.id !== value) onValueChange(encontrado.id);
        return;
      }
      onValueChange("");
      setTexto("");
    }, 150);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlId}>{rotulo}</Label>
      <div className="flex items-center gap-1.5">
        <div className="relative w-full">
          <Input
            id={htmlId}
            value={texto}
            autoComplete="off"
            placeholder="Buscar por nome, brinco ou tatuagem..."
            className="pr-8"
            onChange={(e) => {
              setTexto(e.target.value);
              setSugestoesAbertas(true);
            }}
            onFocus={() => setSugestoesAbertas(true)}
            onBlur={aoSairDoFoco}
          />
          {texto && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={limpar}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
              <span className="sr-only">Limpar</span>
            </button>
          )}
          {sugestoesAbertas && sugestoes.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
              {sugestoes.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selecionar(a)}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {identificacaoCandidato(a)}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          title="Cadastrar animal externo (abre em nova aba)"
          render={<Link href={`/${localId}/reproducao/externos`} target="_blank" rel="noopener noreferrer" />}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
