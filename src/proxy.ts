import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { TOKEN_KEY } from "@/lib/auth-storage";

const PUBLIC_PATHS = ["/", "/deals", "/map", "/auth", "/profile", "/notifications"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/auth")) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_KEY)?.value;

  if (pathname.startsWith("/shop")) {
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      url.searchParams.set("role", "shop_owner");
      url.searchParams.set("tab", "login");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!isPublic(pathname) && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("tab", "login");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/shop/:path*", "/admin/:path*"],
};
