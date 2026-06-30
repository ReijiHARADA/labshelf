export type ParsedPublicationDate = {
  publishedDate?: string;
  publishedYear?: number;
};

function toIsoDate(year: number, month?: number, day?: number): string {
  if (!month) return `${year.toString().padStart(4, '0')}`;
  if (!day) return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}`;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function parsePublicationDate(input?: string | null): ParsedPublicationDate {
  if (!input) return {};
  const trimmed = input.trim();
  if (!trimmed) return {};

  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length >= 8) {
    const year = Number.parseInt(digits.slice(0, 4), 10);
    const month = Number.parseInt(digits.slice(4, 6), 10);
    const day = Number.parseInt(digits.slice(6, 8), 10);
    if (Number.isFinite(year) && year > 0) {
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { publishedDate: toIsoDate(year, month, day), publishedYear: year };
      }
      if (month >= 1 && month <= 12) {
        return { publishedDate: toIsoDate(year, month), publishedYear: year };
      }
      return { publishedDate: toIsoDate(year), publishedYear: year };
    }
  }

  if (digits.length === 6) {
    const year = Number.parseInt(digits.slice(0, 4), 10);
    const month = Number.parseInt(digits.slice(4, 6), 10);
    if (Number.isFinite(year) && year > 0) {
      if (month >= 1 && month <= 12) {
        return { publishedDate: toIsoDate(year, month), publishedYear: year };
      }
      return { publishedDate: toIsoDate(year), publishedYear: year };
    }
  }

  if (digits.length >= 4) {
    const year = Number.parseInt(digits.slice(0, 4), 10);
    if (Number.isFinite(year) && year > 0) {
      return { publishedDate: toIsoDate(year), publishedYear: year };
    }
  }

  return {};
}

export function publicationTimestamp(
  value?: string,
  fallbackYear?: number
): number {
  const parsed = parsePublicationDate(value);
  if (parsed.publishedDate) {
    const parts = parsed.publishedDate.split('-').map((v) => Number.parseInt(v, 10));
    const year = parts[0];
    const month = parts[1] ?? 1;
    const day = parts[2] ?? 1;
    return Date.UTC(year, month - 1, day);
  }
  if (fallbackYear) {
    return Date.UTC(fallbackYear, 0, 1);
  }
  return 0;
}
