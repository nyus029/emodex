export function generateStorageName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

export function parseStorageNameToJapaneseDate(
  storageName: string,
): string | null {
  const match = storageName.match(/^(\d{4})(\d{2})(\d{2})\d{6}$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${year}年${parseInt(month!, 10)}月${parseInt(day!, 10)}日`;
}
