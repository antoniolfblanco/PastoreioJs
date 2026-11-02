"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Beef } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type AnimalInicio = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  especie: "bovino" | "ovino" | "equino";
  sexo: string;
  categoria_descricao: string;
  area_nome: string;
};

const especies: { value: AnimalInicio["especie"]; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];

function identificacao(a: AnimalInicio) {
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

// Versão enxuta da tabela de animais pra caber numa coluna da página
// inicial: só busca e espécie, sem edição — clicar no animal leva pra tela
// completa de Animais.
export function TabelaAnimaisInicio({ localId, animais }: { localId: string; animais: AnimalInicio[] }) {
  const [especie, setEspecie] = useState<AnimalInicio["especie"]>("bovino");
  const [busca, setBusca] = useState("");

  const dados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return animais
      .filter((a) => a.especie === especie)
      .filter(
        (a) =>
          !termo ||
          [a.nome, a.brinco, a.tatuagem, a.categoria_descricao, a.area_nome]
            .filter(Boolean)
            .some((t) => t!.toLowerCase().includes(termo)),
      )
      .sort((a, b) => identificacao(a).localeCompare(identificacao(b), "pt-BR", { numeric: true }));
  }, [animais, especie, busca]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
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
      <Input placeholder="Buscar animal, categoria ou área..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      <span className="text-xs text-muted-foreground">
        {dados.length} {dados.length === 1 ? "animal" : "animais"}
      </span>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-muted-foreground">
          <Beef className="size-8" />
          <p className="text-sm">Nenhum animal encontrado.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>Identificação</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Área</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <Link href={`/${localId}/animais?especie=${a.especie}`} className="hover:underline">
                      {identificacao(a)}
                    </Link>
                  </TableCell>
                  <TableCell>{a.categoria_descricao}</TableCell>
                  <TableCell>{a.area_nome}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
