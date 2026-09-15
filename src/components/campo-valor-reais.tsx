"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function paraCentavos(texto: string) {
  const digitos = texto.replace(/\D/g, "");
  return digitos ? parseInt(digitos, 10) : 0;
}

function formatarCentavos(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Input mascarado de valor em reais — só aceita dígitos, preenche da
// direita pra esquerda (tipo caixa eletrônico). O valor externo continua
// sendo uma string decimal simples ("1500.00"), igual todo campo de valor
// do resto do app.
export function CampoValorReais({
  value,
  onChange,
  disabled,
  className,
  placeholder = "R$ 0,00",
}: {
  value: string;
  onChange: (valor: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const centavos = Math.round((Number(value.replace(",", ".")) || 0) * 100);
  const exibicao = value ? formatarCentavos(centavos) : "";

  return (
    <Input
      inputMode="numeric"
      disabled={disabled}
      className={cn("text-right tabular-nums", className)}
      placeholder={placeholder}
      value={exibicao}
      onChange={(e) => {
        const novosCentavos = paraCentavos(e.target.value);
        onChange(novosCentavos ? (novosCentavos / 100).toFixed(2) : "");
      }}
    />
  );
}
