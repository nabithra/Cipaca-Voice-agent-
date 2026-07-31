export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `****${digits.slice(-4)}`;
}

export function maskName(name: string, reveal = false): string {
  if (reveal || !name) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].length <= 2 ? "**" : `${parts[0][0]}${"*".repeat(parts[0].length - 1)}`;
  }
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
