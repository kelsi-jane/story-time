const READER_ID_KEY = 'st-reader-id';

export function getOrCreateReaderId(): string {
  const existing = localStorage.getItem(READER_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(READER_ID_KEY, id);
  return id;
}
