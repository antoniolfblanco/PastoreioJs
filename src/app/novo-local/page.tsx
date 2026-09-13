"use client";

import { useActionState } from "react";
import { criarLocal } from "@/lib/actions/locais";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function NovoLocalPage() {
  const [estado, acao, emAndamento] = useActionState(criarLocal, undefined);

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
