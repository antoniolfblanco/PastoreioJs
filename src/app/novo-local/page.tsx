"use client";

import { useActionState } from "react";
import { criarLocal } from "@/lib/actions/locais";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function NovoLocalPage() {
  const [estado, acao, emAndamento] = useActionState(criarLocal, undefined);
  const anoAtual = new Date().getFullYear();

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Criar local</CardTitle>
          <CardDescription>
            Você ainda não faz parte de nenhum local. Crie o primeiro pra começar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={acao} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome do local</Label>
              <Input id="nome" name="nome" required autoFocus placeholder="Ex.: Santa Fé" />
            </div>
            {/* Ciclo inicial obrigatório, como no app: sugere o ano atual a partir de 1º de janeiro. */}
            <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Todo local usa ciclos pra acompanhar o estoque de animais ao longo do tempo. Confirme ou ajuste o
                primeiro ciclo:
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cicloNome">Nome do ciclo</Label>
                <Input id="cicloNome" name="cicloNome" required defaultValue={String(anoAtual)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cicloInicio">Início do ciclo</Label>
                <Input id="cicloInicio" name="cicloInicio" type="date" required defaultValue={`${anoAtual}-01-01`} />
              </div>
            </div>
            {estado?.erro && <p className="text-sm text-destructive">{estado.erro}</p>}
            <Button type="submit" disabled={emAndamento} className="mt-2">
              {emAndamento ? "Criando..." : "Criar local"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
