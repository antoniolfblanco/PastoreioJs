import Link from "next/link";
import { ChevronDown, Check } from "lucide-react";
import { buscarLocalAtual } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { sair } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavPrincipal } from "./nav-principal";

const navegacaoPrincipal = [
  { rotulo: "Início", href: "" },
  { rotulo: "Áreas", href: "/areas" },
  { rotulo: "Categorias", href: "/categorias" },
  { rotulo: "Local e Membros", href: "/local" },
];

export default async function LocalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const { data: meusLocais } = await supabase
    .from("usuario_locais")
    .select("local_id, locais(id, nome)")
    .order("criado_em");

  const outrosLocais = (meusLocais ?? [])
    .map((l) => (Array.isArray(l.locais) ? l.locais[0] : l.locais))
    .filter((l): l is { id: string; nome: string } => !!l);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <div className="flex min-w-0 items-center gap-6">
          <div className="flex shrink-0 items-center gap-1">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {local.nome.slice(0, 1).toUpperCase()}
            </div>
            <Link href={`/${localId}/local`} className="font-semibold hover:underline">
              {local.nome}
            </Link>
            {outrosLocais.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="rounded-md p-1 outline-none hover:bg-muted"
                  title="Trocar de local"
                >
                  <span className="sr-only">Trocar de local</span>
                  <ChevronDown className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {outrosLocais.map((l) => (
                    <DropdownMenuItem key={l.id} render={<Link href={`/${l.id}`} />}>
                      {l.id === localId && <Check className="size-4" />}
                      {l.nome}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem render={<Link href="/novo-local" />}>
                    Novo local...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <NavPrincipal localId={localId} itensPrincipais={navegacaoPrincipal} />
        </div>
        <form action={sair} className="shrink-0">
          <Button type="submit" variant="ghost" size="sm">
            Sair
          </Button>
        </form>
      </header>
      <main className="flex min-w-0 flex-1 flex-col p-6">{children}</main>
    </div>
  );
}
