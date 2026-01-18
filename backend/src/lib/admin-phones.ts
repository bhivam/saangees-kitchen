const ADMIN_PHONE_NUMBERS = [
  "+13333333333",
  "+14444444444",
  "+12222222222",
  "+15555555555",
];

export function isAdminPhoneNumber(
  phoneNumber: string | null | undefined,
): boolean {
  if (!phoneNumber) return false;
  return ADMIN_PHONE_NUMBERS.includes(phoneNumber);
}

