export const ADMIN_PHONE_NUMBERS = [
  "+1234567890",
  "+0987654321",
  "+1111111111",
] as const;

export function isAdminPhoneNumber(
  phoneNumber: string | null | undefined,
): boolean {
  if (!phoneNumber) return false;
  return ADMIN_PHONE_NUMBERS.includes(phoneNumber as any);
}

