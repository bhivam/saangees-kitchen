const ADMIN_PHONE_NUMBERS = ["+17325892069", "+18622502699"];

export function isAdminPhoneNumber(
  phoneNumber: string | null | undefined,
): boolean {
  if (!phoneNumber) return false;
  return ADMIN_PHONE_NUMBERS.includes(phoneNumber);
}

