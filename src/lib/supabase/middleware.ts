import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Renova a sessão a cada request (Server Components não conseguem escrever
// cookie, então isso precisa acontecer aqui pra sessão não expirar em
// silêncio). Padrão recomendado do @supabase/ssr pro Next.js App Router.
export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaDefinir) {
          for (const { name, value } of cookiesParaDefinir) {
            request.cookies.set(name, value);
          }
          resposta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesParaDefinir) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /redefinir-senha chega com a sessão de recuperação só no hash da URL
  // (#access_token=...), que nunca é enviado ao servidor — nesse momento o
  // usuário ainda parece deslogado aqui no middleware, então precisa ser
  // pública mesmo. Ela (e /recuperar-senha) também não força redirect pra
  // "/" quando já logado, diferente de /login e /cadastro.
  const rotaSoDeslogado =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/cadastro");
  const rotaPublica =
    rotaSoDeslogado ||
    request.nextUrl.pathname.startsWith("/recuperar-senha") ||
    request.nextUrl.pathname.startsWith("/redefinir-senha");

  if (!user && !rotaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && rotaSoDeslogado) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return resposta;
}
