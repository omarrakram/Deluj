import { BrandMessage } from "@/components/shared/brand-message";

export default function NotFound() {
  return (
    <BrandMessage
      eyebrow="Oops"
      title="This page isn't on the menu."
      body="Let's get you back to something delicious."
      action={{ href: "/", label: "Back to Deluj" }}
    />
  );
}
