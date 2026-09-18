"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { responderConvite } from "@/lib/actions/locais";
import { formatarDataHora } from "@/lib/formatar";

const rotulosPerfil: Record<string, string> = {
  gerente: "Gerente",
  capataz: "Capataz",
  peao: "Peão",
};

export function ConvitesPendentes({
  convites,
}: {
  convites: {
    id: string;
    email: string;
    perfil: string;
    criado_em: string;
    localNome: string;
  }[];
}) {
  const router = useRouter();
  const [processando, setProcessando] = useState<string | null>(null);

  async function responder(id: string, aceitar: boolean) {
    setProcessando(id);
    try {
      const resultado = await responderConvite(id, aceitar);
      if (resultado.error) {
        alert(resultado.error);
        return;
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível responder ao convite.");
    } finally {
      setProcessando(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-lg font-medium">Convites</h1>
      {convites.map((c) => (
        <Card key={c.id} className="gap-2 p-4">
          <div className="flex items-center gap-2">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col">
              <span className="font-medium">{c.localNome}</span>
              <span className="text-sm text-muted-foreground">
                {rotulosPerfil[c.perfil] ?? c.perfil} • {formatarDataHora(c.criado_em)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={processando === c.id}
              onClick={() => responder(c.id, true)}
            >
              <Check className="size-4" />
              Aceitar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={processando === c.id}
              onClick={() => responder(c.id, false)}
            >
              <X className="size-4" />
              Recusar
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
