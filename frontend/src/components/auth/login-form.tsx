import { useState } from "react";
import { PhoneInput } from "./phone-input";
import { OTPVerify } from "./otp-verify";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginForm() {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Saangee's Kitchen</CardTitle>
          <CardDescription>
            {phoneNumber
              ? "Enter the verification code sent to your phone"
              : "Enter your phone number to receive an OTP"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {phoneNumber ? (
            <OTPVerify
              phoneNumber={phoneNumber}
              onBack={() => setPhoneNumber(null)}
            />
          ) : (
            <PhoneInput onOTPSent={setPhoneNumber} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
