const ADMIN_PHONE_NUMBERS = [
  "+33333333333",
  "+44444444444",
  "+22222222222",
  "+55555555555",
];

export function isAdminPhoneNumber(
  phoneNumber: string | null | undefined,
): boolean {
  console.log(phoneNumber);
  if (!phoneNumber) return false;
  return ADMIN_PHONE_NUMBERS.includes(phoneNumber);
}

