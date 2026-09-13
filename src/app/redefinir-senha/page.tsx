"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | undefined>();
  const [emAndamento, setEmAndamento] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const senhasDivergem = confirmarSenha.length > 0 && senha !== confirmarSenha;

  // O link do e-mail estabelece a sessão de recuperação a partir do hash da
  // URL (#access_token=...) assim que o client carrega — isso não passa
  // pelo servidor, então só dá pra trocar a senha depois que o navegador
  // processar isso.
  useEffect(() => {
    const supabase = criarClienteNavegador();
    const { data: listener } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN") setPronto(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(undefined);
    setEmAndamento(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setEmAndamento(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setConcluido(true);
    setTimeout(() => router.push("/"), 1500);
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Definir nova senha</CardTitle>
        </CardHeader>
        <CardContent>
          {concluido ? (
            <p className="text-sm text-muted-foreground">Senha atualizada! Te levando pro sistema...</p>
          ) : !pronto ? (
            <p className="text-sm text-muted-foreground">
              Confirmando o link de recuperação... Se essa mensagem não sumir, o link pode ter expirado
              — <Link href="/recuperar-senha" className="font-medium text-foreground underline">peça um novo</Link>.
            </p>
          ) : (
            <form onSubmit={enviar} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="senha">Nova senha</Label>
                <Input
                  id="senha"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  aria-invalid={senhasDivergem}
                />
                {senhasDivergem && <p className="text-sm text-destructive">As senhas não coincidem.</p>}
              </div>
              {erro && <p className="text-sm text-destructive">{erro}</p>}
              <Button
                type="submit"
                disabled={emAndamento || senhasDivergem || !confirmarSenha}
                className="mt-2"
              >
                {emAndamento ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
