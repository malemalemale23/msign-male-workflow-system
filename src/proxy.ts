import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

// Deny-by-default: everything requires a session except these.
const publicRoutes = ["/login"];

// Optimistic check only: reads the cookie, doesn't hit the database.
// Real authorization happens in the DAL (src/lib/dal.ts) on every request.
export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);

  const cookie = req.cookies.get("session")?.value;
  const session = await decrypt(cookie);
  // Must match the DAL's definition of valid (src/lib/dal.ts verifySession):
  // a signature can verify against an older payload shape that's missing
  // fields we now require. Disagreeing on that here caused a redirect loop,
  // proxy waved a stale cookie through as "logged in", the page then
  // rejected it and bounced back to /login, which proxy sent away again.
  const isValidSession = Boolean(session?.userId && session?.roleId);

  if (path === "/") {
    return NextResponse.redirect(
      new URL(isValidSession ? "/home" : "/login", req.nextUrl)
    );
  }

  if (!isPublicRoute && !isValidSession) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isPublicRoute && isValidSession) {
    return NextResponse.redirect(new URL("/home", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
