"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apagarLocal, sairDoLocal } from "@/lib/actions/locais";

export function SairOuApagarLocal({
  localId,
  nome,
  gerente,
}: {
  localId: string;
  nome: string;
  gerente: boolean;
}) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const [erroSair, setErroSair] = useState<string | undefined>();

  async function sair() {
    if (!confirm("Sair deste local?")) return;
    setSaindo(true);
    setErroSair(undefined);
    try {
      const resultado = await sairDoLocal(localId);
      if (resultado.error) {
        setErroSair(resultado.error);
        setSaindo(false);
        return;
      }
      router.push("/");
    } catch (e) {
      setErroSair(e instanceof Error ? e.message : "Não foi possível sair.");
      setSaindo(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="outline" size="sm" onClick={sair} disabled={saindo}>
          <LogOut className="size-4" />
          {saindo ? "Saindo..." : "Sair deste local"}
        </Button>
        {erroSair && <p className="mt-2 text-sm text-destructive">{erroSair}</p>}
      </div>

      {gerente && <BotaoApagarLocal localId={localId} nome={nome} />}
    </div>
  );
}

function BotaoApagarLocal({ localId, nome }: { localId: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const confirmado = texto.trim() === nome.trim();

  function fechar(a: boolean) {
    setAberto(a);
    if (!a) {
      setTexto("");
      setErro(undefined);
    }
  }

  const router = useRouter();

  async function confirmar() {
    setEmAndamento(true);
    setErro(undefined);
    try {
      const resultado = await apagarLocal(localId);
      if (resultado.error) {
        setErro(resultado.error);
        setEmAndamento(false);
        return;
      }
      router.push("/");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível apagar o local.");
      setEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-destructive/40 p-4">
      <div>
        <h2 className="font-semibold text-destructive">Zona de perigo</h2>
        <p className="text-sm text-muted-foreground">As ações abaixo não podem ser desfeitas.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Apagar local</p>
          <p className="text-sm text-muted-foreground">
            Apaga o local inteiro — rebanho, áreas, categorias, manejos e o acesso de todos os membros.
            Não tem volta.
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setAberto(true)}>
          Apagar local
        </Button>
      </div>
      <Dialog open={aberto} onOpenChange={fechar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar {nome}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso é irreversível. Digite <span className="font-medium text-foreground">{nome}</span> pra
            confirmar.
          </p>
          <Input value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <DialogFooter>
            <Button variant="destructive" disabled={!confirmado || emAndamento} onClick={confirmar}>
              {emAndamento ? "Apagando..." : "Apagar local"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
