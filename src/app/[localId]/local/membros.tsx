"use client";

import { useActionState, useEffect, useState } from "react";
import { UserPlus, Mail, X, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { convidarUsuario, cancelarConvite, alterarPerfilMembro, removerMembro } from "@/lib/actions/locais";
import { formatarDataHora } from "@/lib/formatar";
import type { Membro, ConvitePendente } from "./page";

const rotulosPerfil: Record<string, string> = {
  gerente: "Gerente",
  capataz: "Capataz",
  peao: "Peão",
};

export function Membros({
  localId,
  membros,
  convites,
}: {
  localId: string;
  membros: Membro[];
  convites: ConvitePendente[];
}) {
  const [dialogoAberto, setDialogoAberto] = useState(false);

  async function excluirConvite(id: string) {
    if (!confirm("Cancelar este convite?")) return;
    const resultado = await cancelarConvite(localId, id);
    if (resultado.error) alert(resultado.error);
  }

  async function trocarPerfil(usuarioId: string, perfil: string) {
    try {
      const resultado = await alterarPerfilMembro(localId, usuarioId, perfil);
      if (resultado.error) alert(resultado.error);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível alterar a credencial.");
    }
  }

  async function excluirMembro(usuarioId: string, nome: string) {
    if (!confirm(`Remover "${nome}" deste local?`)) return;
    try {
      const resultado = await removerMembro(localId, usuarioId);
      if (resultado.error) alert(resultado.error);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível remover.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button size="sm" onClick={() => setDialogoAberto(true)}>
          <UserPlus className="size-4" />
          Convidar usuário
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">Membros</h2>
        <div className="flex flex-col gap-1">
          {membros.map((m) => (
            <Card key={m.usuario_id} className="flex-row items-center justify-between gap-2 px-4 py-3">
              <div className="flex min-w-0 flex-col">
                <span className="font-medium">{m.nome}</span>
                <span className="truncate text-sm text-muted-foreground">
                  {m.email} • {rotulosPerfil[m.perfil] ?? m.perfil} • desde {formatarDataHora(m.membro_desde)}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="shrink-0 rounded-md p-1.5 hover:bg-muted">
                  <span className="sr-only">Ações</span>
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {Object.entries(rotulosPerfil)
                    .filter(([valor]) => valor !== m.perfil)
                    .map(([valor, rotulo]) => (
                      <DropdownMenuItem key={valor} onClick={() => trocarPerfil(m.usuario_id, valor)}>
                        Tornar {rotulo}
                      </DropdownMenuItem>
                    ))}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => excluirMembro(m.usuario_id, m.nome)}
                  >
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Card>
          ))}
        </div>
      </div>

      {convites.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-semibold">Convites pendentes</h2>
          <div className="flex flex-col gap-1">
            {convites.map((c) => (
              <Card key={c.id} className="flex-row items-center justify-between gap-2 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-col">
                    <span className="font-medium">{c.email}</span>
                    <span className="text-sm text-muted-foreground">
                      {rotulosPerfil[c.perfil] ?? c.perfil} • {formatarDataHora(c.criado_em)}
                      {!c.tem_conta && " • aguardando criar conta"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Cancelar convite"
                  onClick={() => excluirConvite(c.id)}
                >
                  <X className="size-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <DialogoConvidar localId={localId} aberto={dialogoAberto} onFechar={() => setDialogoAberto(false)} />
    </div>
  );
}

function DialogoConvidar({
  localId,
  aberto,
  onFechar,
}: {
  localId: string;
  aberto: boolean;
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(convidarUsuario, undefined);
  const [perfil, setPerfil] = useState("peao");

  useEffect(() => {
    if (resultado !== undefined && !resultado.erro) onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar usuário</DialogTitle>
        </DialogHeader>
        {aberto && (
          <form key="convidar" action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="perfil">Credencial</Label>
              <Select
                name="perfil"
                value={perfil}
                onValueChange={(v) => setPerfil(v ?? "peao")}
                items={Object.entries(rotulosPerfil).map(([value, label]) => ({ value, label }))}
              >
                <SelectTrigger id="perfil" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(rotulosPerfil).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Se a pessoa ainda não tiver conta, o convite fica reservado pro e-mail e some assim que ela
              se cadastrar.
            </p>
            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento}>
                {emAndamento ? "Convidando..." : "Convidar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
