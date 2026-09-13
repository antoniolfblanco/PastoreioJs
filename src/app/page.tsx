import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConvitesPendentes } from "./convites-pendentes";

// Ponto de entrada depois do login: auto-entra se o usuário só tiver um
// local, ou lembra o último visitado via cookie; com mais de um, mostra a
// lista pra escolher. Convites pendentes (por e-mail, antes de sequer
// pertencer a algum local) aparecem sempre.
export default async function Home() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: locais, error: erroLocais },
    { data: convites, error: erroConvites },
  ] = await Promise.all([
    supabase.from("usuario_locais").select("local_id, perfil, locais(id, nome)").order("criado_em"),
    supabase
      .from("convites")
      .select("id, email, perfil, criado_em, locais(nome)")
      .eq("status", "pendente")
      .eq("email", user?.email ?? "")
      .order("criado_em"),
  ]);

  // Se a consulta falhou de verdade (rede, RLS, etc.), não trata como "zero
  // locais" — isso mandava o usuário direto pra tela de criar local mesmo já
  // tendo um, só porque a query deu erro transitório.
  if (erroLocais || erroConvites) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <p className="text-sm text-destructive">
          Não foi possível carregar seus locais agora. Tente recarregar a página.
        </p>
      </div>
    );
  }

  const temConvites = (convites?.length ?? 0) > 0;

  if ((!locais || locais.length === 0) && !temConvites) {
    redirect("/novo-local");
  }

  if (!temConvites) {
    if ((locais ?? []).length === 1) redirect(`/${locais![0].local_id}`);
    if ((locais ?? []).length > 1) {
      const ultimoLocalId = (await cookies()).get("ultimo_local_id")?.value;
      if (ultimoLocalId && locais!.some((l) => l.local_id === ultimoLocalId)) {
        redirect(`/${ultimoLocalId}`);
      }
    }
  }

  function nomeLocal(l: { locais: { id: string; nome: string } | { id: string; nome: string }[] | null }) {
    return (Array.isArray(l.locais) ? l.locais[0] : l.locais)?.nome ?? "";
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {temConvites && (
          <ConvitesPendentes
            convites={(convites ?? []).map((c) => ({
              id: c.id,
              email: c.email,
              perfil: c.perfil,
              criado_em: c.criado_em,
              localNome: (Array.isArray(c.locais) ? c.locais[0] : c.locais)?.nome ?? "",
            }))}
          />
        )}

        {(locais ?? []).length > 0 ? (
          <div className="flex flex-col gap-3">
            <h1 className="text-lg font-medium">Escolha o local</h1>
            {(locais ?? []).map((l) => (
              <Link
                key={l.local_id}
                href={`/${l.local_id}`}
                className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
              >
                {nomeLocal(l)}
              </Link>
            ))}
          </div>
        ) : (
          !temConvites && (
            <Link href="/novo-local" className={cn(buttonVariants(), "justify-center")}>
              Criar meu local
            </Link>
          )
        )}
      </div>
    </div>
  );
}
