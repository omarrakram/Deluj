import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerApp } from "@/components/customer/customer-app";
import { BrandMessage } from "@/components/shared/brand-message";
import { parseTableCode, tableLabel } from "@/domain/tables";

export async function generateMetadata(props: PageProps<"/order/[table]">): Promise<Metadata> {
  const { table } = await props.params;
  const code = parseTableCode(table);
  return { title: code ? `${tableLabel(code)} · Order` : "Table not found" };
}

export default async function OrderPage(props: PageProps<"/order/[table]">) {
  const { table } = await props.params;
  const code = parseTableCode(table);
  if (!code) {
    return (
      <BrandMessage
        eyebrow="Hmm"
        title="We couldn't find that table."
        body="The QR code may be from another table or a little worn. Ask any of our team and we'll get you sorted in seconds."
        action={{ href: "/order/table-07", label: "Open Table 07" }}
      />
    );
  }
  if (code !== table) redirect(`/order/${code}`);
  return <CustomerApp tableCode={code} />;
}
