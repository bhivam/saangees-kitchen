import { createFileRoute } from "@tanstack/react-router";
import { MenuEditor } from "@/components/menu-editor";

export const Route = createFileRoute("/dashboard/menu")({
  component: MenuEditor,
});
