"use client";

import { useActionState } from "react";
import Link from "next/link";
import { entrar } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [estado, acao, emAndamento] = useActionState(entrar, undefined);

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={acao} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <Link href="/recuperar-senha" className="text-xs text-muted-foreground underline">
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="senha"
                name="senha"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {estado?.erro && <p className="text-sm text-destructive">{estado.erro}</p>}
            <Button type="submit" disabled={emAndamento} className="mt-2">
              {emAndamento ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link href="/cadastro" className="font-medium text-foreground underline">
              Criar conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
