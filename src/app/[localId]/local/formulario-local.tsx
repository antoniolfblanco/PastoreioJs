"use client";

import { useActionState } from "react";
import { atualizarLocal } from "@/lib/actions/locais";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Local } from "./page";

export function FormularioLocal({ local, podeEditar }: { local: Local; podeEditar: boolean }) {
  const [estado, acao, emAndamento] = useActionState(atualizarLocal, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados do local</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={acao} className="flex flex-col gap-4">
          <input type="hidden" name="localId" value={local.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" defaultValue={local.nome} required disabled={!podeEditar} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tamanho">Tamanho (ha)</Label>
              <Input
                id="tamanho"
                name="tamanho"
                type="number"
                step="0.01"
                defaultValue={local.tamanho ?? ""}
                disabled={!podeEditar}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" name="endereco" defaultValue={local.endereco ?? ""} disabled={!podeEditar} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                name="localizacao"
                defaultValue={local.localizacao ?? ""}
                disabled={!podeEditar}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              defaultValue={local.observacoes ?? ""}
              disabled={!podeEditar}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Código do local: <span className="font-mono">{local.codigo}</span>
          </p>
          {estado?.erro && <p className="text-sm text-destructive">{estado.erro}</p>}
          {podeEditar && (
            <Button type="submit" disabled={emAndamento} className="self-start">
              {emAndamento ? "Salvando..." : "Salvar"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
