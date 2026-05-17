import type { Story, Chapter, AdminUser, Author, ReadingEvent, Bookmark } from '../types';
import { getOrCreateReaderId } from './reader-identity';
import { getAuthUser } from './auth';

// ── Admin whitelist ──────────────────────────────────────────────────────────

const INITIAL_ADMINS: AdminUser[] = (import.meta.env.VITE_INITIAL_ADMIN_USERNAMES as string | undefined ?? '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean)
  .map((username, index) => ({
    id: `admin-seed-${index + 1}`,
    username,
    isPrimary: index === 0,
    addedAt: '2026-01-01T00:00:00Z',
  }));

const ADMINS_KEY = 'st-mock-admins';

function loadAdmins(): AdminUser[] {
  return [...INITIAL_ADMINS];
}

function saveAdmins(a: AdminUser[]): void {
  localStorage.setItem(ADMINS_KEY, JSON.stringify(a));
}

let admins: AdminUser[] = loadAdmins();

// ── Author profiles ──────────────────────────────────────────────────────────

const AUTHORS_KEY = 'st-mock-authors';

function loadAuthors(): Author[] {
  try {
    const raw = localStorage.getItem(AUTHORS_KEY);
    if (raw) return JSON.parse(raw) as Author[];
  } catch {}
  return INITIAL_ADMINS.map((admin) => ({
    githubUsername: admin.username,
    fullName: '',
    penName: admin.username,
  }));
}

function saveAuthors(a: Author[]): void {
  localStorage.setItem(AUTHORS_KEY, JSON.stringify(a));
}

let authors: Author[] = loadAuthors();

export async function getAuthors(): Promise<Author[]> {
  const adminUsernames = new Set(admins.map((a) => a.username.toLowerCase()));
  return authors.filter((a) => adminUsernames.has(a.githubUsername.toLowerCase()));
}

export async function getAuthor(username: string): Promise<Author | null> {
  return authors.find((a) => a.githubUsername.toLowerCase() === username.toLowerCase()) ?? null;
}

export async function updateAuthor(username: string, data: { fullName: string; penName: string }): Promise<Author> {
  const penName = data.penName.trim() || data.fullName.trim();
  authors = authors.map((a) =>
    a.githubUsername.toLowerCase() === username.toLowerCase()
      ? { ...a, fullName: data.fullName.trim(), penName }
      : a,
  );
  saveAuthors(authors);
  return authors.find((a) => a.githubUsername.toLowerCase() === username.toLowerCase())!;
}

export async function getAdmins(): Promise<AdminUser[]> {
  return admins;
}

export async function isAdminUser(username: string): Promise<AdminUser | null> {
  return admins.find((a) => a.username.toLowerCase() === username.toLowerCase()) ?? null;
}

export async function addAdmin(username: string): Promise<AdminUser> {
  if (admins.find((a) => a.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('User is already an admin');
  }
  const admin: AdminUser = { id: crypto.randomUUID(), username, isPrimary: false, addedAt: new Date().toISOString() };
  admins = [...admins, admin];
  saveAdmins(admins);
  if (!authors.find((a) => a.githubUsername.toLowerCase() === username.toLowerCase())) {
    authors = [...authors, { githubUsername: username, fullName: '', penName: username }];
    saveAuthors(authors);
  }
  return admin;
}

export async function removeAdmin(id: string): Promise<void> {
  const target = admins.find((a) => a.id === id);
  if (!target) throw new Error('Admin not found');
  if (target.isPrimary) throw new Error('Cannot remove the primary admin');
  admins = admins.filter((a) => a.id !== id);
  saveAdmins(admins);
  authors = authors.filter((a) => a.githubUsername.toLowerCase() !== target.username.toLowerCase());
  saveAuthors(authors);
}

export async function transferPrimary(toId: string): Promise<void> {
  const target = admins.find((a) => a.id === toId);
  if (!target) throw new Error('Admin not found');
  admins = admins.map((a) => ({ ...a, isPrimary: a.id === toId }));
  saveAdmins(admins);
}

// ── Stories ──────────────────────────────────────────────────────────────────

export async function getStories(): Promise<Story[]> {
  const res = await fetch('/api/stories');
  if (!res.ok) throw new Error('Failed to load stories');
  return res.json();
}

export async function getStory(slug: string): Promise<Story | null> {
  const res = await fetch(`/api/stories/${slug}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load story');
  return res.json();
}

export async function createStory(data: Omit<Story, 'id' | 'chapters'>): Promise<Story> {
  const res = await fetch('/api/stories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create story');
  return res.json();
}

export async function updateStory(slug: string, data: Partial<Omit<Story, 'id' | 'slug' | 'chapters'>>): Promise<Story> {
  const res = await fetch(`/api/stories/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update story');
  return res.json();
}

export async function deleteStory(slug: string): Promise<void> {
  const res = await fetch(`/api/stories/${slug}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete story');
}

export async function migrateStoryAuthors(_defaultUsername: string): Promise<Story[]> {
  return getStories();
}

// ── Chapter content ───────────────────────────────────────────────────────────

export async function getChapterContent(blobPath: string): Promise<string> {
  const res = await fetch(blobPath);
  if (!res.ok) throw new Error(`Failed to load chapter: ${res.status}`);
  return res.text();
}

// ── Chapters ──────────────────────────────────────────────────────────────────

export async function createChapter(
  storySlug: string,
  data: { title: string; order: number },
  content: string,
): Promise<Chapter> {
  const story = await getStory(storySlug);
  if (!story) throw new Error('Story not found');
  const id = `ch-${Date.now()}`;
  const blobPath = `/api/chapters/${id}/content`;

  const contentRes = await fetch(blobPath, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: content,
  });
  if (!contentRes.ok) throw new Error('Failed to upload chapter content');

  const chapter: Omit<Chapter, 'id'> & { id: string } = {
    id,
    storyId: story.id,
    title: data.title,
    order: data.order,
    blobPath,
  };

  const metaRes = await fetch(`/api/stories/${storySlug}/chapters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chapter),
  });
  if (!metaRes.ok) throw new Error('Failed to save chapter metadata');
  return metaRes.json();
}

export async function updateChapter(
  storySlug: string,
  chapterId: string,
  data: { title: string },
  content: string,
): Promise<Chapter> {
  const blobPath = `/api/chapters/${chapterId}/content`;
  const contentRes = await fetch(blobPath, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: content,
  });
  if (!contentRes.ok) throw new Error('Failed to upload chapter content');

  const metaRes = await fetch(`/api/stories/${storySlug}/chapters/${chapterId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: data.title, blobPath }),
  });
  if (!metaRes.ok) throw new Error('Failed to update chapter metadata');
  return metaRes.json();
}

export async function deleteChapter(storySlug: string, chapterId: string): Promise<void> {
  const res = await fetch(`/api/stories/${storySlug}/chapters/${chapterId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete chapter');
}

export async function reorderChapters(storySlug: string, orderedIds: string[]): Promise<void> {
  const res = await fetch(`/api/stories/${storySlug}/chapters/order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  });
  if (!res.ok) throw new Error('Failed to reorder chapters');
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────

const BOOKMARK_EVENTS_KEY = 'st-story-bookmarks';

function loadBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(BOOKMARK_EVENTS_KEY);
    if (raw) return JSON.parse(raw) as Bookmark[];
  } catch {}
  return [];
}

function saveBookmarks(events: Bookmark[]): void {
  try {
    localStorage.setItem(BOOKMARK_EVENTS_KEY, JSON.stringify(events));
  } catch {}
}

export async function placeBookmark(
  chapter: Pick<Chapter, 'id' | 'storyId' | 'order'>,
  storySlug: string,
): Promise<void> {
  const authUser = await getAuthUser();
  const readerId = authUser?.userId ?? getOrCreateReaderId();
  const event: Bookmark = {
    id: crypto.randomUUID(),
    readerId,
    storyId: chapter.storyId,
    chapterId: chapter.id,
    storySlug,
    chapterOrder: chapter.order,
    occurredAt: new Date().toISOString(),
  };
  const events = loadBookmarks().filter((e) => e.storyId !== chapter.storyId);
  events.push(event);
  saveBookmarks(events);
}

export async function getBookmarks(filters?: {
  readerId?: string;
  storyId?: string;
  chapterId?: string;
  from?: string;
  to?: string;
}): Promise<Bookmark[]> {
  let events = loadBookmarks();
  if (!filters) return events;
  if (filters.readerId)  events = events.filter((e) => e.readerId === filters.readerId);
  if (filters.storyId)   events = events.filter((e) => e.storyId === filters.storyId);
  if (filters.chapterId) events = events.filter((e) => e.chapterId === filters.chapterId);
  if (filters.from)      events = events.filter((e) => e.occurredAt >= filters.from!);
  if (filters.to)        events = events.filter((e) => e.occurredAt <= filters.to!);
  return events;
}

export async function removeBookmark(chapterId: string): Promise<void> {
  saveBookmarks(loadBookmarks().filter((e) => e.chapterId !== chapterId));
}

// ── Reading history ───────────────────────────────────────────────────────────

const READING_EVENTS_KEY = 'st-reading-events';

function loadReadingEvents(): ReadingEvent[] {
  try {
    const raw = localStorage.getItem(READING_EVENTS_KEY);
    if (raw) return JSON.parse(raw) as ReadingEvent[];
  } catch {}
  return [];
}

function saveReadingEvents(events: ReadingEvent[]): void {
  try {
    localStorage.setItem(READING_EVENTS_KEY, JSON.stringify(events));
  } catch {}
}

export async function logReadingEvent(
  chapter: Pick<Chapter, 'id' | 'storyId' | 'order'>,
  storySlug: string,
): Promise<void> {
  const authUser = await getAuthUser();
  const readerId = authUser?.userId ?? getOrCreateReaderId();
  const event: ReadingEvent = {
    id: crypto.randomUUID(),
    readerId,
    storyId: chapter.storyId,
    chapterId: chapter.id,
    storySlug,
    chapterOrder: chapter.order,
    occurredAt: new Date().toISOString(),
  };
  const events = loadReadingEvents();
  events.push(event);
  saveReadingEvents(events);
}

export async function getReadingEvents(filters?: {
  readerId?: string;
  storyId?: string;
  chapterId?: string;
  from?: string;
  to?: string;
}): Promise<ReadingEvent[]> {
  let events = loadReadingEvents();
  if (!filters) return events;
  if (filters.readerId)  events = events.filter((e) => e.readerId === filters.readerId);
  if (filters.storyId)   events = events.filter((e) => e.storyId === filters.storyId);
  if (filters.chapterId) events = events.filter((e) => e.chapterId === filters.chapterId);
  if (filters.from)      events = events.filter((e) => e.occurredAt >= filters.from!);
  if (filters.to)        events = events.filter((e) => e.occurredAt <= filters.to!);
  return events;
}
