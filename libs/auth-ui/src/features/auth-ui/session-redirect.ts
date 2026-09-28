import { loginPath } from "./login-redirect.ts";

import type { Role } from "@repo/config";

const SECURITY_PATH = "/security";

type GatedSession = Readonly<{ strong: boolean; user: Readonly<{ role: Role }> }>;

type SessionVisit = Readonly<{
  href: string;
  pathname: string;
  role: Role | undefined;
  securityExempt: boolean;
}>;

const sessionAllowed = (session: GatedSession, visit: SessionVisit): boolean =>
  (session.strong && (visit.role === undefined || session.user.role === visit.role)) ||
  (visit.securityExempt && visit.pathname === SECURITY_PATH);

const sessionAdmission = <Session extends GatedSession>(
  session: Session | null,
  visit: SessionVisit,
): Readonly<{ admitted: Session }> | Readonly<{ destination: string }> => {
  if (session === null) {
    return { destination: loginPath(visit.href) };
  }
  return sessionAllowed(session, visit) ? { admitted: session } : { destination: SECURITY_PATH };
};

export { sessionAdmission };
export type { SessionVisit };
