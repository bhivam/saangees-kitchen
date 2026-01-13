import type { authClient } from "./auth-client";

// Session comes back as any for some reason
// TODO remove this, see where it is used and just inline it
// or just stuff the regex test in utils.ts

type Session = Awaited<ReturnType<typeof authClient.getSession>["session"]>;
type User = NonNullable<Session["data"]>["user"];

export function isProfileIncomplete(user: User | null | undefined) {
  if (!user) return false;

  return /^User \d{4}$/.test(user.name);
}

