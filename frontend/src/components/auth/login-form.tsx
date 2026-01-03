import { useState } from "react";
import { PhoneInput } from "./phone-input";
import { OTPVerify } from "./otp-verify";

export function LoginForm() {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div>
          <p>
            {phoneNumber
              ? `Enter the verification code sent to ${phoneNumber}`
              : "Enter your phone number to receive an OTP"}
          </p>
        </div>
        <div>
          {phoneNumber ? (
            <OTPVerify
              phoneNumber={phoneNumber}
              onBack={() => setPhoneNumber(null)}
            />
          ) : (
            <PhoneInput onOTPSent={setPhoneNumber} />
          )}
        </div>
      </div>
    </div>
  );
}

