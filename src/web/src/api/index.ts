import type { Story, Chapter, AdminUser, Author, ReadingEvent, Bookmark } from '../types';
import { getOrCreateReaderId } from './reader-identity';
import { getAuthUser } from './auth';

const INITIAL_STORIES: Story[] = [
  {
    id: '1',
    title: 'The Silver Thread',
    slug: 'the-silver-thread',
    description: 'In a village where dreams are woven into cloth, a girl discovers a single silver thread that connects her to a boy she\'s never met.',
    tags: ['fantasy', 'romance'],
    seriesSlug: 'the-silver-thread',
    seriesOrder: 1,
    authorUsername: 'kelsi-jane',
    publishedAt: '2026-01-15T00:00:00Z',
    coverImageUrl: 'https://www.wistful.me/assets/kelsi-jane/loom-sketch.jpeg',
    chapters: [
      { id: 'ch1',  storyId: '1', title: 'The Loom at Dawn',        order: 1, blobPath: '/content/the-silver-thread/chapter-1.md' },
      { id: 'ch2',  storyId: '1', title: 'The Thread Remembers',   order: 2, blobPath: '/content/the-silver-thread/chapter-2.md' },
      { id: 'ch3',  storyId: '1', title: 'The Map in the Weave',   order: 3, blobPath: '/content/the-silver-thread/chapter-3.md' },
      { id: 'ch4',  storyId: '1', title: 'The Boy Who Didn\'t Know', order: 4, blobPath: '/content/the-silver-thread/chapter-4.md' },
      { id: 'ch5',  storyId: '1', title: 'What Is Bound',          order: 5, blobPath: '/content/the-silver-thread/chapter-5.md' },
    ],
  },
  {
    id: '2',
    title: 'The Silver Thread',
    subtitle: 'Wedding Bells',
    slug: 'the-silver-thread-wedding-bells',
    description: 'An invitation arrives on silver cloth, and Mara must travel north to witness a wedding that will change everything she thought she understood about the thread.',
    tags: ['fantasy', 'romance'],
    seriesSlug: 'the-silver-thread',
    seriesOrder: 2,
    authorUsername: 'kelsi-jane',
    publishedAt: '2026-03-01T00:00:00Z',
    coverImageUrl: 'https://www.wistful.me/assets/kelsi-jane/wedding-bells-sketch.png',
    chapters: [
      { id: 'ch2-1', storyId: '2', title: 'An Invitation Arrives', order: 1, blobPath: '/content/the-silver-thread-wedding-bells/chapter-1.md' },
      { id: 'ch2-2', storyId: '2', title: 'Three Days North',      order: 2, blobPath: '/content/the-silver-thread-wedding-bells/chapter-2.md' },
    ],
  },
];

const STORIES_KEY = 'st-mock-stories';
const CONTENT_KEY = 'st-mock-content';

function loadStories(): Story[] {
  try {
    const raw = localStorage.getItem(STORIES_KEY);
    if (raw) return JSON.parse(raw) as Story[];
  } catch {}
  return [...INITIAL_STORIES];
}

function saveStories(s: Story[]): void {
  localStorage.setItem(STORIES_KEY, JSON.stringify(s));
}

function loadContent(): Map<string, string> {
  try {
    const raw = localStorage.getItem(CONTENT_KEY);
    if (raw) return new Map(JSON.parse(raw) as [string, string][]);
  } catch {}
  return new Map();
}

function saveContent(m: Map<string, string>): void {
  localStorage.setItem(CONTENT_KEY, JSON.stringify([...m]));
}

let stories: Story[] = loadStories();
const mockContent: Map<string, string> = loadContent();

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
  /*try {
    const raw = localStorage.getItem(ADMINS_KEY);
    if (raw) return JSON.parse(raw) as AdminUser[];
  } catch {}*/
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

// ── Migration ────────────────────────────────────────────────────────────────

export async function migrateStoryAuthors(defaultUsername: string): Promise<Story[]> {
  if (!stories.some((s) => !s.authorUsername)) return stories;
  stories = stories.map((s) => (s.authorUsername ? s : { ...s, authorUsername: defaultUsername }));
  saveStories(stories);
  return stories;
}

// ── Read ────────────────────────────────────────────────────────────────────

export async function getStories(): Promise<Story[]> {
  return stories;
}

export async function getStory(slug: string): Promise<Story | null> {
  return stories.find((s) => s.slug === slug) ?? null;
}

export async function getChapterContent(blobPath: string): Promise<string> {
  if (blobPath.startsWith('mock://')) {
    return mockContent.get(blobPath.slice('mock://'.length)) ?? '';
  }
  const res = await fetch(blobPath);
  if (!res.ok) throw new Error(`Failed to load chapter: ${res.status}`);
  return res.text();
}

// ── Bookmarks ────────────────────────────────────────────────────────────────────

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

// ── Stories ─────────────────────────────────────────────────────────────────

export async function createStory(data: Omit<Story, 'id' | 'chapters'>): Promise<Story> {
  const story: Story = { ...data, id: crypto.randomUUID(), chapters: [] };
  stories = [...stories, story];
  saveStories(stories);
  return story;
}

export async function updateStory(slug: string, data: Partial<Omit<Story, 'id' | 'slug' | 'chapters'>>): Promise<Story> {
  stories = stories.map((s) => (s.slug === slug ? { ...s, ...data } : s));
  saveStories(stories);
  return stories.find((s) => s.slug === slug)!;
}

export async function deleteStory(slug: string): Promise<void> {
  stories = stories.filter((s) => s.slug !== slug);
  saveStories(stories);
}

// ── Chapters ─────────────────────────────────────────────────────────────────

export async function createChapter(
  storySlug: string,
  data: { title: string; order: number },
  content: string,
): Promise<Chapter> {
  const story = stories.find((s) => s.slug === storySlug);
  if (!story) throw new Error('Story not found');
  const id = `ch-${Date.now()}`;
  const chapter: Chapter = { id, storyId: story.id, title: data.title, order: data.order, blobPath: `mock://${id}` };
  mockContent.set(id, content);
  saveContent(mockContent);
  stories = stories.map((s) =>
    s.slug === storySlug ? { ...s, chapters: [...s.chapters, chapter] } : s,
  );
  saveStories(stories);
  return chapter;
}

export async function updateChapter(
  storySlug: string,
  chapterId: string,
  data: { title: string },
  content: string,
): Promise<Chapter> {
  stories = stories.map((s) => {
    if (s.slug !== storySlug) return s;
    return { ...s, chapters: s.chapters.map((c) => c.id === chapterId ? { ...c, title: data.title } : c) };
  });
  const contentKey = (() => {
    const ch = stories.find((s) => s.slug === storySlug)?.chapters.find((c) => c.id === chapterId);
    if (!ch) return chapterId;
    if (ch.blobPath.startsWith('mock://')) return ch.blobPath.slice('mock://'.length);
    // For file-backed chapters, store under the chapterId key and update blobPath to mock://
    stories = stories.map((s) => {
      if (s.slug !== storySlug) return s;
      return { ...s, chapters: s.chapters.map((c) => c.id === chapterId ? { ...c, blobPath: `mock://${chapterId}` } : c) };
    });
    return chapterId;
  })();
  mockContent.set(contentKey, content);
  saveContent(mockContent);
  saveStories(stories);
  return stories.find((s) => s.slug === storySlug)!.chapters.find((c) => c.id === chapterId)!;
}

export async function deleteChapter(storySlug: string, chapterId: string): Promise<void> {
  stories = stories.map((s) => {
    if (s.slug !== storySlug) return s;
    return { ...s, chapters: s.chapters.filter((c) => c.id !== chapterId) };
  });
  saveStories(stories);
}

export async function reorderChapters(storySlug: string, orderedIds: string[]): Promise<void> {
  stories = stories.map((s) => {
    if (s.slug !== storySlug) return s;
    const reordered = orderedIds.map((id, index) => ({
      ...s.chapters.find((c) => c.id === id)!,
      order: index + 1,
    }));
    return { ...s, chapters: reordered };
  });
  saveStories(stories);
}

// ── Reading history ──────────────────────────────────────────────────────────

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
