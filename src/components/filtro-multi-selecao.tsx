"use client";

import { ChevronDown, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function FiltroMultiSelecao({
  rotulo,
  opcoes,
  selecionados,
  onChange,
  className,
}: {
  rotulo: string;
  opcoes: { value: string; label: string }[];
  selecionados: Set<string>;
  onChange: (novo: Set<string>) => void;
  className?: string;
}) {
  const rotuloTrigger =
    selecionados.size === 0
      ? rotulo
      : selecionados.size === 1
        ? (opcoes.find((o) => selecionados.has(o.value))?.label ?? rotulo)
        : `${selecionados.size} selecionados`;

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "outline", size: "default" }),
            "justify-between font-normal",
            className,
          )}
        >
          <span className="truncate">{rotuloTrigger}</span>
          <ChevronDown className="size-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
          {opcoes.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.value}
              checked={selecionados.has(o.value)}
              onCheckedChange={(marcado) => {
                const novo = new Set(selecionados);
                if (marcado) novo.add(o.value);
                else novo.delete(o.value);
                onChange(novo);
              }}
              onSelect={(e) => e.preventDefault()}
            >
              {o.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selecionados.size > 0 && (
        <Button variant="ghost" size="icon-sm" title="Limpar" onClick={() => onChange(new Set())}>
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
