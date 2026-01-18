import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { isProfileIncomplete } from "@/lib/auth-utils";
import { toast } from "sonner";

// Step state machine
type AuthStep = "phone" | "otp" | "name";

// Form values structure
type AuthFormValues = {
  phoneNumber: string; // Full format: +15555555555
  otp: string;
  firstName: string;
  lastName: string;
};

// Infer User type from auth client
type Session = Awaited<ReturnType<typeof authClient.getSession>>;
type User = NonNullable<Session["data"]>["user"];

export type AuthFormCallbacks = {
  onSuccess?: (user: User) => void; // Called after successful auth
  onAnonymousConvert?: (user: User) => void; // Called when anon → authenticated
};

export function useAuthForm(callbacks?: AuthFormCallbacks) {
  const [currentStep, setCurrentStep] = useState<AuthStep>("phone");
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      phoneNumber: "",
      otp: "",
      firstName: "",
      lastName: "",
    } as AuthFormValues,
    onSubmit: async ({ value }) => {
      // Handle submission based on current step
      if (currentStep === "phone") {
        await handlePhoneSubmit(value.phoneNumber);
      } else if (currentStep === "otp") {
        await handleOTPSubmit(value.phoneNumber, value.otp);
      } else if (currentStep === "name") {
        await handleNameSubmit(value.firstName, value.lastName);
      }
    },
  });

  const handlePhoneSubmit = async (phoneNumber: string) => {
    // Validate phone number
    const phoneSchema = z
      .string()
      .regex(/^\+1\d{10}$/, "Valid phone number required");

    const result = phoneSchema.safeParse(phoneNumber);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    try {
      await authClient.phoneNumber.sendOtp({ phoneNumber });
      toast.success("OTP sent! Check backend console for code");
      setCurrentStep("otp");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSubmit = async (phoneNumber: string, code: string) => {
    // Validate OTP
    const otpSchema = z.string().length(6, "OTP must be 6 digits");
    const result = otpSchema.safeParse(code);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await authClient.phoneNumber.verify({
        phoneNumber,
        code,
      });

      if (error || !data) {
        throw new Error(error?.message || "Verification failed");
      }

      const { user } = data;

      // Check if this is a new user or incomplete profile (temp name indicates new signup)
      const isIncomplete = isProfileIncomplete(user);
      setIsNewUser(isIncomplete);

      if (isIncomplete) {
        // New user or incomplete profile - collect name
        toast.success("Phone verified! Please enter your name");
        setCurrentStep("name");
      } else {
        // Existing user with complete profile
        toast.success(`Welcome back, ${user.name}!`);
        callbacks?.onSuccess?.(user);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameSubmit = async (firstName: string, lastName: string) => {
    // Validate names
    const nameSchema = z.object({
      firstName: z.string().min(1, "First name required"),
      lastName: z.string().min(1, "Last name required"),
    });

    const result = nameSchema.safeParse({ firstName, lastName });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const { data, error } = await authClient.updateUser({ name: fullName });

      if (error || !data) {
        throw new Error(error?.message || "Failed to update profile");
      }

      toast.success(`Welcome, ${fullName}!`);
      callbacks?.onSuccess?.(data);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update name");
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (currentStep === "otp") {
      setCurrentStep("phone");
      // Clear OTP field when going back
      form.setFieldValue("otp", "");
    }
    // Cannot go back from name step - already verified
  };

  return {
    form,
    currentStep,
    isNewUser,
    isLoading,
    goBack,
    setCurrentStep, // Expose for external control (e.g., skipping to name step)
  };
}
