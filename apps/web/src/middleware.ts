import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/sign-in', '/sign-up'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Allow public routes through without auth check
  if (PUBLIC_ROUTES.includes(pathname)) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: object }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Protect all routes except static files, images, and Next internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
