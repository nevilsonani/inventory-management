import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The page you are looking for does not exist or has moved."
      action={<ButtonLink href="/" variant="primary">Back to dashboard</ButtonLink>}
      className="py-24"
    />
  );
}
