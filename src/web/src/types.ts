export interface ReadingEvent {
  id: string;
  readerId: string;
  storyId: string;
  chapterId: string;
  storySlug: string;
  chapterOrder: number;
  occurredAt: string;
}

export interface AdminUser {
  id: string;
  username: string;  // GitHub username
  isPrimary: boolean;
  addedAt: string;
}

export interface Author {
  githubUsername: string;
  fullName: string;
  penName: string;
  bio?: string;
  profileImageUrl?: string;
}

export interface Chapter {
  id: string;
  storyId: string;
  title: string;
  order: number;
  blobPath: string;
}

export interface Story {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  coverImageUrl?: string;
  tags: string[];
  seriesSlug?: string;
  seriesOrder?: number;
  publishedAt: string | null;
  chapters: Chapter[];
  authorUsername?: string;
}

export interface Bookmark {
  id: string;
  readerId: string;
  storyId: string;
  chapterId: string;
  storySlug: string;
  chapterOrder: number;
  occurredAt: string;
}

// ── Writing tools ─────────────────────────────────────────────────────────────

export type BlockColor = 'amber' | 'teal' | 'coral' | 'purple' | 'blue';
export type BlockStatus = 'active' | 'hidden' | 'parked' | 'archived';
export type SlotArea = 'board' | 'outline';

export interface Slot {
  id: string;
  label: string;
  area: SlotArea;
  order: number;
  hidden: boolean;
}

export interface Block {
  id: string;
  title: string;
  color: BlockColor;
  slot: string;
  boardSlot: string;
  tags: string[];
  notes?: string;
  links?: string[];
  pinned: boolean;
  status: BlockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMeta {
  projectId: string;
  title: string;
  authorUsername: string;
  templateId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutlineAssignment {
  blockId: string;
  slotId: string;
}

export interface Projection {
  meta: ProjectMeta;
  slots: Slot[];
  blocks: Block[];
  outlineAssignments: OutlineAssignment[];
  outlineOrder: Record<string, string[]>;
  eventCount: number;
}

export interface ProjectListItem {
  projectId: string;
  title: string;
  createdAt: string;
  blockCount: number;
}

export type PaneView =
  | { kind: 'empty' }
  | { kind: 'outline' }
  | { kind: 'notes' }
  | { kind: 'chapter'; chapterId: string };

export type WritingEvent =
  | { type: 'ProjectCreated'; payload: { title: string; authorUsername: string; templateId: string } }
  | { type: 'SlotAdded'; payload: { slotId: string; label: string; area: SlotArea; order: number } }
  | { type: 'BlockCreated'; payload: { blockId: string; title: string; color: BlockColor; slot: string } }
  | { type: 'BlockMoved'; payload: { blockId: string; fromSlot: string; toSlot: string } }
  | { type: 'BlockAssigned'; payload: { blockId: string; fromSlot: string; toSlot: string; referenced?: boolean } }
  | { type: 'BlockUnassigned'; payload: { blockId: string; fromSlot: string; toSlot: string } }
  | { type: 'BlockPinned'; payload: { blockId: string } }
  | { type: 'BlockUnpinned'; payload: { blockId: string } }
  | { type: 'BlockStatusChanged'; payload: { blockId: string; status: BlockStatus } }
  | { type: 'BlockUpdated'; payload: { blockId: string; title?: string; notes?: string; tags?: string[]; color?: BlockColor; links?: string[] } }
  | { type: 'SlotReordered'; payload: { slotId: string; order: number } }
  | { type: 'OutlineOrderChanged'; payload: { slotId: string; blockIds: string[] } };

export type PersistedEvent = WritingEvent & {
  id: string;
  projectId: string;
  timestamp: string;
  userId: string;
  note?: string;
};
