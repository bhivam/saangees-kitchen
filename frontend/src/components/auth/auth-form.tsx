import { useEffect } from "react";
import { useAuthForm, type AuthFormCallbacks } from "@/hooks/use-auth-form";
import { AuthFormPhoneStep } from "./auth-form-phone-step";
import { AuthFormOTPStep } from "./auth-form-otp-step";
import { AuthFormNameStep } from "./auth-form-name-step";
import { useAuth } from "@/hooks/use-auth";
import { isProfileIncomplete } from "@/lib/auth-utils";

interface AuthFormProps {
  onSuccess?: AuthFormCallbacks["onSuccess"];
  onAnonymousConvert?: AuthFormCallbacks["onAnonymousConvert"];
  title?: {
    phone?: string;
    otp?: string;
    name?: string;
  };
  description?: {
    phone?: string;
    otp?: string;
    name?: string;
  };
}

export function AuthForm({
  onSuccess,
  onAnonymousConvert,
  title,
  description,
}: AuthFormProps) {
  const { user } = useAuth();
  const { form, currentStep, isLoading, goBack, setCurrentStep } = useAuthForm({
    onSuccess,
    onAnonymousConvert,
  });

  // Check if user has incomplete profile on mount
  useEffect(() => {
    if (user && isProfileIncomplete(user)) {
      // Skip directly to name step for incomplete profiles
      setCurrentStep("name");
    }
  }, [user, setCurrentStep]);

  const defaultTitles = {
    phone: "Welcome",
    otp: "Verify your number",
    name: "Complete your profile",
  };

  const defaultDescriptions = {
    phone: "Enter your phone number to continue",
    otp: "Enter the verification code we sent you",
    name: "Tell us your name to complete signup",
  };

  const currentTitle = title?.[currentStep] ?? defaultTitles[currentStep];
  const currentDesc =
    description?.[currentStep] ?? defaultDescriptions[currentStep];

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          {currentTitle}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">{currentDesc}</p>
      </div>

      <div>
        {currentStep === "phone" && (
          <AuthFormPhoneStep
            form={form}
            isLoading={isLoading}
            onSubmit={() => form.handleSubmit()}
          />
        )}

        {currentStep === "otp" && (
          <AuthFormOTPStep
            form={form}
            phoneNumber={form.state.values.phoneNumber}
            isLoading={isLoading}
            onSubmit={() => form.handleSubmit()}
            onBack={goBack}
          />
        )}

        {currentStep === "name" && (
          <AuthFormNameStep
            form={form}
            isLoading={isLoading}
            onSubmit={() => form.handleSubmit()}
          />
        )}
      </div>
    </div>
  );
}
