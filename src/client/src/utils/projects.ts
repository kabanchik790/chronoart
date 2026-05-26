export function formatProjectNumber(id: number) {
  return String(id).padStart(3, '0');
}

export function getProjectMeta(description: string | null | undefined) {
  const cleanDescription = description?.replace(/\s+/g, ' ').trim();

  if (!cleanDescription) {
    return 'РУЧНАЯ РАБОТА, ИНДИВИДУАЛЬНО';
  }

  const parts = cleanDescription
    .split(/[,;.\n]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`.toUpperCase();
  }

  const size = cleanDescription.match(/\b\d{2}\s?мм\b/i)?.[0];

  if (size && parts[0]) {
    return `${parts[0]}, ${size}`.toUpperCase();
  }

  return `${parts[0] ?? cleanDescription}, ИНДИВИДУАЛЬНО`.toUpperCase();
}
