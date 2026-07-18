import { NextResponse } from "next/server";
import { auth } from "@/auth";

const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

// Dev/testing-only bypass: when set, skip auth enforcement entirely so the app
// is usable without wiring up real Google OAuth. See docs/PHASE1-AUTH-PLAN.md.
// The backend AuthFilter enforces this independently — this is UX-only, not
// the security boundary.
export const proxy = auth((request) => {
  if (skipAuth || request.auth) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
});

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
