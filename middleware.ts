import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware global: corre antes de cada request de página.
 *
 * Su único trabajo es renovar la sesión de Supabase (el access token vence
 * periódicamente) y propagar las cookies actualizadas en la respuesta. Sin
 * esto, un usuario logueado podría empezar a ver la app como si no lo
 * estuviera después de un rato de inactividad.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Solo con llamar a getUser() alcanza para que la librería renueve el
  // token si está por vencer y lo guarde en la cookie de la respuesta.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Corre en todas las rutas menos assets estáticos (no tiene sentido
  // renovar sesión para pedir una imagen o un archivo de Next).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
