"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidatoAnimal, Especie, Sexo } from "./page";

function identificacaoCandidato(a: CandidatoAnimal) {
  const base = [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
  return a.externo ? `${base} (externo)` : base;
}

// Campo de busca com autocompletar (mesmo padrão do Banco Genético) —
// evita diálogo empilhado sobre diálogo.
export function SeletorAnimalEvento({
  htmlId,
  rotulo,
  sexo,
  especie,
  candidatos,
  value,
  onValueChange,
  compacto = false,
}: {
  htmlId: string;
  rotulo: string;
  sexo: Sexo;
  especie: Especie;
  candidatos: CandidatoAnimal[];
  value: string;
  onValueChange: (id: string) => void;
  // Usado nas células da tabela do evento: mesmo campo, sem o <Label> e mais
  // baixo, pra caber numa linha ao lado da data e do atalho de doses.
  compacto?: boolean;
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

  function selecionar(a: CandidatoAnimal) {
    onValueChange(a.id);
    setTexto(identificacaoCandidato(a));
    setSugestoesAbertas(false);
  }

  function limpar() {
    onValueChange("");
    setTexto("");
  }

  function aoSairDoFoco() {
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
    <div className={cn("flex flex-col gap-2", compacto && "gap-0")}>
      {!compacto && <Label htmlFor={htmlId}>{rotulo}</Label>}
      <div className={cn("relative w-full", compacto && "min-w-40")}>
        <Input
          id={htmlId}
          value={texto}
          autoComplete="off"
          placeholder={compacto ? "Buscar touro..." : "Buscar por nome, brinco ou tatuagem..."}
          className={cn("pr-8", compacto && "h-8 text-sm")}
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
    </div>
  );
}
