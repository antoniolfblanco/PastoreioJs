"use client";

import { useActionState } from "react";
import Link from "next/link";
import { solicitarRecuperacaoSenha } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecuperarSenhaPage() {
  const [estado, acao, emAndamento] = useActionState(solicitarRecuperacaoSenha, undefined);

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
        </CardHeader>
        <CardContent>
          {estado?.enviado ? (
            <p className="text-sm text-muted-foreground">
              Se esse e-mail tiver uma conta, enviamos um link pra redefinir a senha. Confira também a
              caixa de spam.
            </p>
          ) : (
            <form action={acao} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" autoFocus />
              </div>
              {estado?.erro && <p className="text-sm text-destructive">{estado.erro}</p>}
              <Button type="submit" disabled={emAndamento} className="mt-2">
                {emAndamento ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-foreground underline">
              Voltar pro login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
