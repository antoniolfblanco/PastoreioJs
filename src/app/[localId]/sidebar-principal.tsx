"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Beef,
  TriangleAlert,
  Tags,
  MapPin,
  Stethoscope,
  Heart,
  ShoppingCart,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  ChevronRight,
  ChevronDown,
  Check,
  BookOpen,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sair } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import type { ItemNav, GrupoNav } from "./nav-principal";

// Ícone por rótulo — mapa fixo porque os itens vêm do layout como
// {rotulo, href} genéricos, sem campo de ícone. Um item novo lá sem entrada
// aqui cai no ícone padrão (ChevronRight), só isso.
const iconesItem: Record<string, React.ComponentType<{ className?: string }>> = {
  Início: Home,
  Animais: Beef,
  Diário: BookOpen,
  Relatórios: FileText,
};

const iconesGrupo: Record<string, React.ComponentType<{ className?: string }>> = {
  Ocorrências: TriangleAlert,
  Categorias: Tags,
  Áreas: MapPin,
  Manejos: Stethoscope,
  Reprodução: Heart,
  "Compras e Vendas": ShoppingCart,
  Ajustes: Settings,
};

export function SidebarPrincipal({
  localId,
  itensPrincipais,
  grupos,
  localNome,
  outrosLocais,
}: {
  localId: string;
  itensPrincipais: ItemNav[];
  grupos: GrupoNav[];
  localNome: string;
  outrosLocais: { id: string; nome: string }[];
}) {
  const pathname = usePathname();
  const base = `/${localId}`;
  const [colapsada, setColapsada] = useState(false);
  // Toggle manual de cada grupo. Sem entrada aqui, o grupo abre sozinho se a
  // página atual estiver dentro dele (ver aberto()) — depois do primeiro
  // clique do usuário, o que ele escolheu manda.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  function estaAtivo(href: string) {
    const caminho = `${base}${href}`;
    return href === "" ? pathname === base : pathname === caminho || pathname.startsWith(`${caminho}/`);
  }

  // Mais de um item pode casar por prefixo (ex.: /categorias e
  // /categorias/trocar) — só o mais específico fica destacado.
  function itemAtivo(href: string, irmaos: ItemNav[]) {
    if (!estaAtivo(href)) return false;
    return !irmaos.some((o) => o.href !== href && o.href.startsWith(`${href}/`) && estaAtivo(o.href));
  }

  function grupoAtivo(grupo: GrupoNav) {
    return grupo.itens.some((item) => estaAtivo(item.href));
  }

  function aberto(grupo: GrupoNav) {
    return overrides[grupo.rotulo] ?? grupoAtivo(grupo);
  }

  function alternarGrupo(grupo: GrupoNav) {
    // Colapsada, o grupo nunca aparece aberto — clicar nele precisa expandir
    // a sidebar de novo, senão o clique não tem efeito nenhum visível.
    if (colapsada) {
      setColapsada(false);
      setOverrides((atual) => ({ ...atual, [grupo.rotulo]: true }));
      return;
    }
    setOverrides((atual) => ({ ...atual, [grupo.rotulo]: !aberto(grupo) }));
  }

  return (
    <aside
      className={cn(
        // sticky + h-screen: a sidebar não cresce junto com páginas longas,
        // então o rodapé (Sair/Recolher) fica sempre à vista.
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-background transition-[width] duration-200 md:flex",
        colapsada ? "w-[72px]" : "w-64",
      )}
    >
      {/* Topo: local + trocar de local */}
      <div className="flex items-center gap-2 border-b px-3 py-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {localNome.slice(0, 1).toUpperCase()}
        </div>
        {!colapsada && (
          <>
            <Link
              href={`${base}/local`}
              className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline"
            >
              {localNome}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="shrink-0 rounded-md p-1 outline-none hover:bg-muted"
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
                <DropdownMenuItem render={<Link href="/novo-local" />}>Novo local...</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* Navegação, com scroll próprio */}
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {itensPrincipais.map((item) => {
          const Icone = iconesItem[item.rotulo] ?? ChevronRight;
          const ativo = itemAtivo(item.href, itensPrincipais);
          return (
            <Link
              key={item.href}
              href={`${base}${item.href}`}
              title={item.rotulo}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                // Colapsada só mostra o ícone, centralizado.
                colapsada && "justify-center",
                ativo ? "bg-secondary font-medium text-secondary-foreground" : "hover:bg-muted",
              )}
            >
              <Icone className="size-[18px] shrink-0" />
              {!colapsada && <span className="truncate">{item.rotulo}</span>}
            </Link>
          );
        })}

        <div className="my-2 border-t" />

        {grupos
          .filter((grupo) => grupo.itens.length > 0)
          .map((grupo) => {
            const IconeGrupo = iconesGrupo[grupo.rotulo] ?? ChevronRight;
            const grupoEstaAberto = !colapsada && aberto(grupo);
            return (
              <div key={grupo.rotulo}>
                <button
                  type="button"
                  onClick={() => alternarGrupo(grupo)}
                  title={grupo.rotulo}
                  aria-expanded={grupoEstaAberto}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                    colapsada && "justify-center",
                    grupoAtivo(grupo) && "font-medium",
                  )}
                >
                  <IconeGrupo className="size-[18px] shrink-0" />
                  {!colapsada && (
                    <>
                      <span className="min-w-0 flex-1 truncate">{grupo.rotulo}</span>
                      <ChevronDown
                        className={cn("size-4 shrink-0 transition-transform", grupoEstaAberto && "rotate-180")}
                      />
                    </>
                  )}
                </button>
                {grupoEstaAberto && (
                  <div className="flex flex-col gap-0.5 pl-[34px]">
                    {grupo.itens.map((item) => (
                      <Link
                        key={item.href}
                        href={`${base}${item.href}`}
                        className={cn(
                          "truncate rounded-md px-3 py-1.5 text-sm",
                          itemAtivo(item.href, grupo.itens)
                            ? "bg-secondary font-medium text-secondary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {item.rotulo}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </nav>

      {/* Rodapé: sair + recolher */}
      <div className="flex flex-col gap-0.5 border-t p-2">
        <form action={sair}>
          <button
            type="submit"
            title="Sair"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              colapsada && "justify-center",
            )}
          >
            <LogOut className="size-[18px] shrink-0" />
            {!colapsada && <span>Sair</span>}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setColapsada((c) => !c)}
          title={colapsada ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
            colapsada && "justify-center",
          )}
        >
          {colapsada ? (
            <PanelLeftOpen className="size-[18px] shrink-0" />
          ) : (
            <PanelLeftClose className="size-[18px] shrink-0" />
          )}
          {!colapsada && <span>Recolher menu</span>}
        </button>
      </div>
    </aside>
  );
}
