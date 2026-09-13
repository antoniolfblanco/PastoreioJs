"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type ItemNav = { rotulo: string; href: string };
export type GrupoNav = { rotulo: string; itens: ItemNav[] };

export function NavPrincipal({
  localId,
  itensPrincipais,
  grupos = [],
}: {
  localId: string;
  itensPrincipais: ItemNav[];
  grupos?: GrupoNav[];
}) {
  const pathname = usePathname();
  const base = `/${localId}`;
  const [menuAberto, setMenuAberto] = useState(false);

  function estaAtivo(href: string) {
    const caminho = `${base}${href}`;
    // "" (Início) só ativa na raiz exata do local, senão ficaria sempre
    // destacado junto com qualquer outra aba.
    return href === "" ? pathname === base : pathname === caminho || pathname.startsWith(`${caminho}/`);
  }

  function grupoAtivo(grupo: GrupoNav) {
    return grupo.itens.some((item) => estaAtivo(item.href));
  }

  return (
    <>
      {/* Desktop: barra horizontal, cabe tranquilo e fica tudo visível de
          cara, sem precisar clicar em nada. */}
      <nav className="hidden min-w-0 items-center gap-1 overflow-x-auto md:flex">
        {itensPrincipais.map((item) => (
          <Link
            key={item.href}
            href={`${base}${item.href}`}
            className={cn(
              buttonVariants({ variant: estaAtivo(item.href) ? "secondary" : "ghost", size: "sm" }),
              "shrink-0",
            )}
          >
            {item.rotulo}
          </Link>
        ))}
        {grupos
          .filter((grupo) => grupo.itens.length > 0)
          .map((grupo) => (
            <DropdownMenu key={grupo.rotulo}>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({
                    variant: grupoAtivo(grupo) ? "secondary" : "ghost",
                    size: "sm",
                  }),
                  "shrink-0",
                )}
              >
                {grupo.rotulo}
                <ChevronDown className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {grupo.itens.map((item) => (
                  <DropdownMenuItem key={item.href} render={<Link href={`${base}${item.href}`} />}>
                    {item.rotulo}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
      </nav>

      {/* Mobile: vira um ícone de menu abrindo um painel lateral com tudo. */}
      <div className="md:hidden">
        <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
          <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}>
            <Menu className="size-5" />
            <span className="sr-only">Abrir menu</span>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1">
              {itensPrincipais.map((item) => (
                <Link
                  key={item.href}
                  href={`${base}${item.href}`}
                  onClick={() => setMenuAberto(false)}
                  className={cn(
                    buttonVariants({ variant: estaAtivo(item.href) ? "secondary" : "ghost", size: "sm" }),
                    "justify-start",
                  )}
                >
                  {item.rotulo}
                </Link>
              ))}
              {grupos
                .filter((grupo) => grupo.itens.length > 0)
                .map((grupo) => (
                  <div key={grupo.rotulo} className="flex flex-col gap-1">
                    <p className="mt-3 px-3 text-xs font-medium text-muted-foreground">
                      {grupo.rotulo}
                    </p>
                    {grupo.itens.map((item) => (
                      <Link
                        key={item.href}
                        href={`${base}${item.href}`}
                        onClick={() => setMenuAberto(false)}
                        className={cn(
                          buttonVariants({
                            variant: estaAtivo(item.href) ? "secondary" : "ghost",
                            size: "sm",
                          }),
                          "justify-start",
                        )}
                      >
                        {item.rotulo}
                      </Link>
                    ))}
                  </div>
                ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
