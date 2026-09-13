import { type NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/middleware";

const REGEX_LOCAL_ID = /^\/([0-9a-fA-F-]{36})(\/|$)/;

export async function proxy(request: NextRequest) {
  const resposta = await atualizarSessao(request);

  // Grava qual local o usuário visitou por último, pra pré-selecionar da
  // próxima vez que ele entrar com mais de um local (ver src/app/page.tsx).
  const match = request.nextUrl.pathname.match(REGEX_LOCAL_ID);
  if (match) {
    resposta.cookies.set("ultimo_local_id", match[1], {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return resposta;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
