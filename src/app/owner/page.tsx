import type { Metadata } from "next";
import { cookies } from "next/headers";
import { OwnerApp } from "@/components/owner/owner-app";
import { AccessGate } from "@/components/shared/access-gate";
import { ACCESS_COOKIE, isAuthorized } from "@/server/access";

export const metadata: Metadata = { title: "Command Center" };

export default async function OwnerPage() {
  const jar = await cookies();
  if (!isAuthorized(jar.get(ACCESS_COOKIE)?.value)) return <AccessGate area="Deluj Command Center" />;
  return <OwnerApp />;
}
