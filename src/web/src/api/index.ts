import type { Story, Chapter, AdminUser } from '../types';

const INITIAL_STORIES: Story[] = [
  {
    id: '1',
    title: 'The Silver Thread',
    slug: 'the-silver-thread',
    description: 'In a village where dreams are woven into cloth, a girl discovers a single silver thread that connects her to a boy she\'s never met.',
    tags: ['fantasy', 'romance'],
    seriesSlug: 'the-silver-thread',
    seriesOrder: 1,
    publishedAt: '2026-01-15T00:00:00Z',
    chapters: [
      { id: 'ch1',  storyId: '1', title: 'The Loom at Dawn',      order: 1, blobPath: '/content/the-silver-thread/chapter-1.md' },
      { id: 'ch2',  storyId: '1', title: 'The Thread Remembers',   order: 2, blobPath: '/content/the-silver-thread/chapter-2.md' },
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
    publishedAt: '2026-03-01T00:00:00Z',
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
console.log('initial_admins', INITIAL_ADMINS);

const ADMINS_KEY = 'st-mock-admins';

function loadAdmins(): AdminUser[] {
  /*try {
    const raw = localStorage.getItem(ADMINS_KEY);
    if (raw) return JSON.parse(raw) as AdminUser[];
  } catch {}*/
  console.log('loadAdmins, [...INITIAL_ADMINS];
  return [...INITIAL_ADMINS];
}

function saveAdmins(a: AdminUser[]): void {
  localStorage.setItem(ADMINS_KEY, JSON.stringify(a));
}

let admins: AdminUser[] = loadAdmins();

export async function getAdmins(): Promise<AdminUser[]> {
  return admins;
}

export async function isAdminUser(username: string): Promise<AdminUser | null> {
  console.log('isAdminUser', username, admins);
  return admins.find((a) => a.username.toLowerCase() === username.toLowerCase()) ?? null;
}

export async function addAdmin(username: string): Promise<AdminUser> {
  if (admins.find((a) => a.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('User is already an admin');
  }
  const admin: AdminUser = { id: crypto.randomUUID(), username, isPrimary: false, addedAt: new Date().toISOString() };
  admins = [...admins, admin];
  saveAdmins(admins);
  return admin;
}

export async function removeAdmin(id: string): Promise<void> {
  const target = admins.find((a) => a.id === id);
  if (!target) throw new Error('Admin not found');
  if (target.isPrimary) throw new Error('Cannot remove the primary admin');
  admins = admins.filter((a) => a.id !== id);
  saveAdmins(admins);
}

export async function transferPrimary(toId: string): Promise<void> {
  const target = admins.find((a) => a.id === toId);
  if (!target) throw new Error('Admin not found');
  admins = admins.map((a) => ({ ...a, isPrimary: a.id === toId }));
  saveAdmins(admins);
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
