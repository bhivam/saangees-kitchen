import { createFileRoute } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/about")({
  component: About,
  async beforeLoad() {
    const session = await authClient.getSession();
    if (session.error || !session.data) {
      const { error } = await authClient.signIn.anonymous();
      if (error) throw new Error("Failed to do create anonymous session");
    }
  },
});

function About() {
  return <div>about the kitchen</div>;
}

