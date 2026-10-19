export function normalizeAttendeeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) ? email : null;
}

export function normalizeAttendeePhone(value: string) {
  const phone = value.trim();
  const digits = phone.replace(/\D/g, "");
  if (!/^\+?[0-9](?:[0-9 ()().-]*[0-9])?$/.test(phone) || digits.length < 7 || digits.length > 15) return null;
  return phone.replace(/[^+0-9]/g, "") || null;
}

export function attendeeContactFlags(email: string, phone: string) {
  return {
    email: !email ? "missing" as const : normalizeAttendeeEmail(email) ? "valid" as const : "invalid" as const,
    phone: !phone ? "missing" as const : normalizeAttendeePhone(phone) ? "valid" as const : "invalid" as const,
  };
}
