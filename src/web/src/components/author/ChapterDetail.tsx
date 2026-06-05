import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkDirective from 'remark-directive';
import remarkArtifacts from '../../lib/remarkArtifacts';
import BlockDetailContent from './BlockDetailContent';
import { getChapterDraft, saveChapterDraft, appendEvent } from '../../api/planning';
import type { Block, ProjectChapter, Projection } from '../../types';

type Tab = 'notes' | 'content' | 'preview';

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
  // Controlled tab — persisted by parent in pane view state.
  initialTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

export default function ChapterDetail({ block, chapter, projection, projectId, onRefresh, onNewBlock, showBanner = true, controlledDraft, onDraftChange, initialTab, onTabChange }: Props) {
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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the value waiting to be written to blob (set when debounce starts, cleared on save).
  const pendingDraftRef = useRef<string | null>(null);

  // Flush any pending draft save when navigating away without waiting for the debounce.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingDraftRef.current !== null) {
        saveChapterDraft(projectId, chapter.id, pendingDraftRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const draft = isControlled ? (controlledDraft ?? '') : internalDraft;
  const draftReady = isControlled ? controlledDraft !== null : draftLoaded;

  useEffect(() => {
    if (isControlled) return; // parent manages loading
    if (activeTab !== 'content' && activeTab !== 'preview') return;
    if (draftLoaded) return;
    getChapterDraft(projectId, chapter.id).then(content => {
      setInternalDraft(content);
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
    saveTimerRef.current = setTimeout(() => {
      saveChapterDraft(projectId, chapter.id, value);
      pendingDraftRef.current = null;
      saveTimerRef.current = null;
    }, 1500);
  }

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
        {(['notes', 'content', 'preview'] as Tab[]).map(tab => (
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
            {draftReady ? (
              <textarea
                className="chapter-draft-textarea"
                value={draft}
                onChange={e => handleDraftChange(e.target.value)}
                placeholder="Write your chapter in Markdown…"
                spellCheck
              />
            ) : (
              <p className="chapter-draft-loading">Loading…</p>
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
