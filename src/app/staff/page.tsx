import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AccessGate } from "@/components/shared/access-gate";
import { StaffApp } from "@/components/staff/staff-app";
import { ACCESS_COOKIE, isAuthorized } from "@/server/access";

export const metadata: Metadata = { title: "Kitchen" };

export default async function StaffPage() {
  const jar = await cookies();
  if (!isAuthorized(jar.get(ACCESS_COOKIE)?.value)) return <AccessGate area="Deluj Kitchen" />;
  return <StaffApp />;
}
