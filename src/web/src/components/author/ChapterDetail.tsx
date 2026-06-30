import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkDirective from 'remark-directive';
import remarkArtifacts from '../../lib/remarkArtifacts';
import BlockDetailContent from './BlockDetailContent';
import { getChapterDraft, saveChapterDraft, appendEvent, getChapterDraftHistory, getChapterDraftSnapshot, deleteChapterDraftSnapshot, DraftConflictError } from '../../api/planning';
import type { Block, ProjectChapter, Projection, PersistedEvent } from '../../types';

type Tab = 'notes' | 'content' | 'preview' | 'history';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

const SNAPSHOT_INTERVAL = 10 * 60 * 1000; // 10 minutes

interface Props {
  block: Block;
  chapter: ProjectChapter;
  projection: Projection;
  projectId: string;
  onRefresh: () => Promise<void>;
  onNewBlock?: () => void;
  showBanner?: boolean;
  // Controlled draft — undefined = uncontrolled (BlockDetail full-page).
  // null = pane mode, loading. string = pane mode, loaded.
  controlledDraft?: string | null;
  onDraftChange?: (value: string) => void;
  // ETag from the pane-mode parent load; updated via callback on each successful save.
  initialEtag?: string | null;
  onEtagChange?: (etag: string | null) => void;
  // Controlled tab — persisted by parent in pane view state.
  initialTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

export default function ChapterDetail({ block, chapter, projection, projectId, onRefresh, onNewBlock, showBanner = true, controlledDraft, onDraftChange, initialEtag, onEtagChange, initialTab, onTabChange }: Props) {
  // undefined = full-page (uncontrolled); null = pane loading; string = pane loaded.
  const isControlled = controlledDraft !== undefined;

  const [bannerDismissed, setBannerDismissed] = useState(() =>
    localStorage.getItem(`chapter-banner-${chapter.id}-dismissed`) === '1'
  );
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? 'notes');

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    onTabChange?.(tab);
  }
  const locked = chapter.locked ?? false;

  async function toggleLock() {
    await appendEvent(projectId, {
      type: 'ChapterLockChanged',
      payload: { chapterId: chapter.id, locked: !locked },
    });
    await onRefresh();
  }

  // Inline title editing on the Content tab toolbar.
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  function startEditTitle() {
    setTitleValue(chapter.title);
    setEditingTitle(true);
  }

  async function saveTitle() {
    setEditingTitle(false);
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed === chapter.title) return;
    await appendEvent(projectId, { type: 'ChapterRenamed', payload: { chapterId: chapter.id, title: trimmed } });
    await onRefresh();
  }

  // Internal draft state — only used in uncontrolled (full-page) mode.
  const [internalDraft, setInternalDraft] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the value waiting to be written to blob (set when debounce starts, cleared on save).
  const pendingDraftRef = useRef<string | null>(null);
  // ETag of the last-fetched or last-saved draft blob — used for optimistic concurrency.
  const etagRef = useRef<string | null>(initialEtag ?? null);
  // Timestamp of the last checkpoint snapshot, for rate-limiting history events.
  const lastSnapshotAtRef = useRef<number>(Date.now());

  // History tab state.
  const [historyEntries, setHistoryEntries] = useState<PersistedEvent[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [restoringSnapshot, setRestoringSnapshot] = useState<string | null>(null);
  const [deletingSnapshot, setDeletingSnapshot] = useState<string | null>(null);

  // Manual snapshot input state.
  const [snapshotInputOpen, setSnapshotInputOpen] = useState(false);
  const [snapshotNoteValue, setSnapshotNoteValue] = useState('');

  // Flush any pending draft save when navigating away without waiting for the debounce.
  // On 412 (stale session), silently drop — the server has newer content.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingDraftRef.current !== null) {
        saveChapterDraft(projectId, chapter.id, pendingDraftRef.current, etagRef.current, true, 'automatically created')
          .catch(() => {});
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const draft = isControlled ? (controlledDraft ?? '') : internalDraft;
  const draftReady = isControlled ? controlledDraft !== null : draftLoaded;

  useEffect(() => {
    if (isControlled) return; // parent manages loading and ETag
    if (activeTab !== 'content' && activeTab !== 'preview') return;
    if (draftLoaded) return;
    getChapterDraft(projectId, chapter.id).then(({ content, etag }) => {
      setInternalDraft(content);
      etagRef.current = etag;
      setDraftLoaded(true);
    });
  }, [isControlled, activeTab, draftLoaded, projectId, chapter.id]);

  function dismissBanner() {
    localStorage.setItem(`chapter-banner-${chapter.id}-dismissed`, '1');
    setBannerDismissed(true);
  }

  function handleDraftChange(value: string) {
    if (isControlled) {
      onDraftChange?.(value);
    } else {
      setInternalDraft(value);
    }
    pendingDraftRef.current = value;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      const shouldSnapshot = Date.now() - lastSnapshotAtRef.current > SNAPSHOT_INTERVAL;
      try {
        const { etag: newEtag } = await saveChapterDraft(projectId, chapter.id, value, etagRef.current, shouldSnapshot, shouldSnapshot ? 'automatically created' : undefined);
        if (shouldSnapshot) lastSnapshotAtRef.current = Date.now();
        etagRef.current = newEtag;
        onEtagChange?.(newEtag);
        setSaveStatus('saved');
      } catch (err) {
        if (err instanceof DraftConflictError) {
          setSaveStatus('conflict');
        } else {
          setSaveStatus('error');
        }
      }
      pendingDraftRef.current = null;
      saveTimerRef.current = null;
    }, 1500);
  }

  async function forceOverwrite() {
    if (pendingDraftRef.current === null && !draft) return;
    const content = pendingDraftRef.current ?? draft;
    setSaveStatus('saving');
    try {
      const { etag: newEtag } = await saveChapterDraft(projectId, chapter.id, content, undefined, true);
      etagRef.current = newEtag;
      onEtagChange?.(newEtag);
      lastSnapshotAtRef.current = Date.now();
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }

  async function manualSnapshot(note: string) {
    setSnapshotInputOpen(false);
    setSnapshotNoteValue('');
    const content = pendingDraftRef.current ?? draft;
    setSaveStatus('saving');
    try {
      const { etag: newEtag } = await saveChapterDraft(projectId, chapter.id, content, etagRef.current, true, note.trim() || undefined);
      etagRef.current = newEtag;
      onEtagChange?.(newEtag);
      lastSnapshotAtRef.current = Date.now();
      setHistoryLoaded(false);
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus(err instanceof DraftConflictError ? 'conflict' : 'error');
    }
  }

  async function reloadLatest() {
    const { content, etag } = await getChapterDraft(projectId, chapter.id);
    if (!isControlled) {
      setInternalDraft(content);
    } else {
      onDraftChange?.(content);
    }
    etagRef.current = etag;
    onEtagChange?.(etag);
    pendingDraftRef.current = null;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setSaveStatus('idle');
  }

  useEffect(() => {
    if (activeTab !== 'history') return;
    if (historyLoaded) return;
    getChapterDraftHistory(projectId, chapter.id).then(entries => {
      setHistoryEntries([...entries].reverse()); // newest first
      setHistoryLoaded(true);
    });
  }, [activeTab, historyLoaded, projectId, chapter.id]);

  async function restoreSnapshot(snapshotId: string) {
    setRestoringSnapshot(snapshotId);
    try {
      const content = await getChapterDraftSnapshot(projectId, chapter.id, snapshotId);
      if (!isControlled) {
        setInternalDraft(content);
        setDraftLoaded(true);
      } else {
        onDraftChange?.(content);
      }
      pendingDraftRef.current = content;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          const { etag: newEtag } = await saveChapterDraft(projectId, chapter.id, content, etagRef.current, true, 'restored from checkpoint');
          etagRef.current = newEtag;
          onEtagChange?.(newEtag);
          lastSnapshotAtRef.current = Date.now();
          setHistoryLoaded(false); // refresh history list after restore
          setSaveStatus('saved');
        } catch (err) {
          setSaveStatus(err instanceof DraftConflictError ? 'conflict' : 'error');
        }
        pendingDraftRef.current = null;
        saveTimerRef.current = null;
      }, 1500);
      handleTabChange('content');
    } finally {
      setRestoringSnapshot(null);
    }
  }

  async function handleDeleteSnapshot(snapshotId: string) {
    setDeletingSnapshot(snapshotId);
    try {
      await deleteChapterDraftSnapshot(projectId, chapter.id, snapshotId);
      setHistoryEntries(prev => prev.filter(e => {
        const path = (e as any).payload?.snapshotPath ?? '';
        return !path.endsWith(`/${snapshotId}.md`);
      }));
    } finally {
      setDeletingSnapshot(null);
    }
  }

  const saveStatusLabel =
    saveStatus === 'saving' ? 'saving…' :
    saveStatus === 'saved'  ? 'saved' :
    saveStatus === 'error'  ? 'save failed' :
    null;

  return (
    <div className="chapter-detail-shell">
      {showBanner && !bannerDismissed && (
        <div className="chapter-banner">
          <div className="chapter-banner-text">
            <strong>You&apos;re writing in full-screen mode</strong> — but your story has more to offer.
            Open Story View to write this chapter alongside your notes, outline, and character references,
            all in a single split workspace.
          </div>
          <div className="chapter-banner-actions">
            <Link to={`/author/projects/${projectId}/story`} className="chapter-banner-link">
              Open Story View
            </Link>
            <button className="chapter-banner-dismiss" onClick={dismissBanner}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="chapter-detail-tabs">
        {(['notes', 'content', 'preview', 'history'] as Tab[]).map(tab => (
          <button
            key={tab}
            className={`chapter-detail-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="chapter-detail-content">
        {activeTab === 'notes' && (
          <BlockDetailContent
            block={block}
            projection={projection}
            projectId={projectId}
            onRefresh={onRefresh}
            onNewBlock={onNewBlock}
          />
        )}

        {activeTab === 'content' && (
          <div className="chapter-draft-area">
            <div className="chapter-draft-toolbar">
              {editingTitle ? (
                <input
                  className="chapter-draft-title-input"
                  value={titleValue}
                  onChange={e => setTitleValue(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  autoFocus
                />
              ) : (
                <span
                  className="chapter-draft-title chapter-draft-title-editable"
                  onClick={startEditTitle}
                  title="Click to rename"
                >
                  {chapter.title}
                </span>
              )}
              <div className="chapter-draft-toolbar-actions">
                {saveStatusLabel && (
                  <span className={`chapter-draft-save-status chapter-draft-save-status--${saveStatus}`}>
                    {saveStatusLabel}
                  </span>
                )}
                <button
                  className={`chapter-snapshot-btn${snapshotInputOpen ? ' active' : ''}`}
                  onClick={() => { setSnapshotInputOpen(o => !o); setSnapshotNoteValue(''); }}
                  disabled={!draftReady || saveStatus === 'saving'}
                  title="Save a checkpoint to history"
                >
                  <i className="ti ti-clock" />
                </button>
                <button
                  className={`chapter-lock-btn${locked ? ' locked' : ''}`}
                  onClick={toggleLock}
                  title={locked ? 'Locked — click to unlock' : 'Unlocked — click to lock'}
                >
                  <i className={`ti ${locked ? 'ti-lock' : 'ti-lock-open'}`} />
                </button>
                <a
                  href="/author/markdown-guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chapter-draft-help"
                  title="Writing & artifact guide"
                >
                  <i className="ti ti-help-circle" /> markdown help
                </a>
              </div>
            </div>
            {snapshotInputOpen && (
              <div className="chapter-snapshot-input-bar">
                <input
                  className="chapter-snapshot-note-input"
                  type="text"
                  placeholder="Label this checkpoint (optional)"
                  value={snapshotNoteValue}
                  onChange={e => setSnapshotNoteValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') manualSnapshot(snapshotNoteValue);
                    if (e.key === 'Escape') { setSnapshotInputOpen(false); setSnapshotNoteValue(''); }
                  }}
                  autoFocus
                />
                <button className="chapter-snapshot-save-btn" onClick={() => manualSnapshot(snapshotNoteValue)}>
                  Save checkpoint
                </button>
                <button className="chapter-snapshot-cancel-btn" onClick={() => { setSnapshotInputOpen(false); setSnapshotNoteValue(''); }}>
                  Cancel
                </button>
              </div>
            )}
            {saveStatus === 'conflict' && (
              <div className="chapter-draft-conflict">
                <span>This chapter was saved by another session.</span>
                <button className="chapter-draft-conflict-btn" onClick={forceOverwrite}>
                  Overwrite
                </button>
                <button className="chapter-draft-conflict-btn" onClick={reloadLatest}>
                  Reload latest
                </button>
              </div>
            )}
            {draftReady ? (
              <textarea
                className={`chapter-draft-textarea${locked ? ' locked' : ''}`}
                value={draft}
                onChange={locked ? undefined : e => handleDraftChange(e.target.value)}
                readOnly={locked}
                placeholder={locked ? '' : 'Write your chapter in Markdown…'}
                spellCheck={!locked}
              />
            ) : (
              <p className="chapter-draft-loading">Loading…</p>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="chapter-history-area">
            {!historyLoaded ? (
              <p className="chapter-draft-loading">Loading…</p>
            ) : historyEntries.length === 0 ? (
              <p className="chapter-draft-loading">No saved checkpoints yet. Checkpoints are created automatically every 10 minutes while writing and whenever you navigate away.</p>
            ) : (
              <ul className="chapter-history-list">
                {historyEntries.map(entry => {
                  const payload = (entry as any).payload as { chapterId: string; snapshotPath: string };
                  const snapshotId = payload.snapshotPath.split('/').pop()?.replace('.md', '') ?? '';
                  const isRestoring = restoringSnapshot === snapshotId;
                  return (
                    <li key={entry.id} className="chapter-history-entry">
                      <div className="chapter-history-meta">
                        <span className="chapter-history-time">
                          {new Date(entry.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                        {entry.note && (
                          <span className="chapter-history-note">{entry.note}</span>
                        )}
                      </div>
                      <div className="chapter-history-actions">
                        <button
                          className="chapter-history-restore-btn"
                          onClick={() => restoreSnapshot(snapshotId)}
                          disabled={isRestoring || deletingSnapshot === snapshotId}
                        >
                          {isRestoring ? 'Restoring…' : 'Restore'}
                        </button>
                        <button
                          className="chapter-history-delete-btn"
                          onClick={() => handleDeleteSnapshot(snapshotId)}
                          disabled={isRestoring || deletingSnapshot === snapshotId}
                          title="Delete this checkpoint"
                        >
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="chapter-preview-area">
            <div className="chapter-draft-title chapter-preview-title">{chapter.title}</div>
            <hr className="chapter-preview-rule" />
            {draftReady ? (
              draft ? (
                <div className="prose">
                  <ReactMarkdown remarkPlugins={[remarkDirective, remarkArtifacts]}>{draft}</ReactMarkdown>
                </div>
              ) : (
                <p className="chapter-draft-loading">No content yet — write something in the Content tab.</p>
              )
            ) : (
              <p className="chapter-draft-loading">Loading…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
