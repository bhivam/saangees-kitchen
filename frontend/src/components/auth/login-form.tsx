import { useNavigate } from "@tanstack/react-router";
import { AuthForm } from "./auth-form";

export function LoginForm() {
  const navigate = useNavigate();

  const handleSuccess = (user: any) => {
    if (user.isAdmin) {
      navigate({ to: "/dashboard" });
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <AuthForm onSuccess={handleSuccess} />
    </div>
  );
}

