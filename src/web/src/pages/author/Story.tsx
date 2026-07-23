import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import SiteBanner from '../../components/SiteBanner';
import ProjectSidebar from '../../components/author/ProjectSidebar';
import PaneHeader from '../../components/author/PaneHeader';
import OutlinePanel from '../../components/author/OutlinePanel';
import StoryNotesPane from '../../components/author/StoryNotesPane';
import { getProjection, appendEvent, getChapterDraft } from '../../api/planning';
import ChapterDetail from '../../components/author/ChapterDetail';
import ExportControl from '../../components/author/ExportControl';
import { buildChapterMarkdownExport, downloadTextFile, slugify } from '../../lib/export';
import type { PaneView, Projection } from '../../types';

type PaneCount = 1 | 2 | 3;

const DEFAULT_DIVIDERS: Record<PaneCount, number[]> = {
  1: [],
  2: [50],
  3: [33, 67],
};

function readStoredPanes(projectId: string): { count: PaneCount; dividers: number[] } {
  const rawCount = Number(localStorage.getItem(`story-pane-count-${projectId}`));
  const count: PaneCount = (rawCount === 2 || rawCount === 3) ? rawCount : 1;
  try {
    const stored = JSON.parse(localStorage.getItem(`story-dividers-${projectId}`) ?? 'null');
    if (Array.isArray(stored) && stored.length === DEFAULT_DIVIDERS[count].length) {
      return { count, dividers: stored };
    }
  } catch { /* fall through */ }
  return { count, dividers: [...DEFAULT_DIVIDERS[count]] };
}

function readStoredViews(projectId: string, count: PaneCount): PaneView[] {
  return Array.from({ length: count }, (_, i) => {
    try {
      const raw = localStorage.getItem(`story-pane-view-${projectId}-${i}`);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed.kind === 'string') return parsed as PaneView;
    } catch { /* fall through */ }
    return { kind: 'empty' };
  });
}

function storeView(projectId: string, index: number, view: PaneView) {
  localStorage.setItem(`story-pane-view-${projectId}-${index}`, JSON.stringify(view));
}

export default function Story() {
  const { projectId } = useParams<{ projectId: string }>();
  const [projection, setProjection] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem(`sidebar-collapsed-${projectId}`) === 'true'
  );
  const [paneCount, setPaneCount] = useState<PaneCount>(() =>
    projectId ? readStoredPanes(projectId).count : 1
  );
  const [dividers, setDividers] = useState<number[]>(() =>
    projectId ? readStoredPanes(projectId).dividers : []
  );
  const [paneViews, setPaneViews] = useState<PaneView[]>(() =>
    projectId ? readStoredViews(projectId, readStoredPanes(projectId).count) : [{ kind: 'empty' }]
  );
  const [chapterDrafts, setChapterDrafts] = useState<Record<string, string | null>>({});
  const [chapterDraftEtags, setChapterDraftEtags] = useState<Record<string, string | null>>({});
  const loadingDrafts = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ index: number; startX: number; startValue: number } | null>(null);

  const loadProjection = useCallback(async () => {
    if (!projectId) return;
    try {
      const p = await getProjection(projectId);
      setProjection(p);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadProjection(); }, [loadProjection]);

  useEffect(() => {
    if (!projectId) return;
    for (const view of paneViews) {
      if (view.kind !== 'chapter') continue;
      if (view.chapterId in chapterDrafts) continue;
      if (loadingDrafts.current.has(view.chapterId)) continue;
      loadingDrafts.current.add(view.chapterId);
      setChapterDrafts(prev => ({ ...prev, [view.chapterId]: null })); // null = loading
      getChapterDraft(projectId, view.chapterId).then(({ content, etag }) => {
        loadingDrafts.current.delete(view.chapterId);
        setChapterDrafts(prev => ({ ...prev, [view.chapterId]: content }));
        setChapterDraftEtags(prev => ({ ...prev, [view.chapterId]: etag }));
      });
    }
  }, [paneViews, projectId]);

  function toggleSidebar() {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(`sidebar-collapsed-${projectId}`, String(next));
      return next;
    });
  }

  function setPanes(count: PaneCount) {
    const nextDividers = [...DEFAULT_DIVIDERS[count]];
    const nextViews = Array.from({ length: count }, (_, i) => paneViews[i] ?? { kind: 'empty' as const });
    setPaneCount(count);
    setDividers(nextDividers);
    setPaneViews(nextViews);
    if (projectId) {
      localStorage.setItem(`story-pane-count-${projectId}`, String(count));
      localStorage.setItem(`story-dividers-${projectId}`, JSON.stringify(nextDividers));
    }
  }

  function selectView(index: number, view: PaneView) {
    setPaneViews(prev => {
      const next = [...prev];
      next[index] = view;
      if (projectId) storeView(projectId, index, view);
      return next;
    });
  }

  function handleDividerMouseDown(index: number, e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { index, startX: e.clientX, startValue: dividers[index] };

    function onMouseMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag || !containerRef.current) return;
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const deltaPct = ((e.clientX - drag.startX) / containerWidth) * 100;
      const raw = drag.startValue + deltaPct;
      setDividers(prev => {
        const min = drag.index === 0 ? 10 : prev[drag.index - 1] + 10;
        const max = drag.index === prev.length - 1 ? 90 : prev[drag.index + 1] - 10;
        const next = [...prev];
        next[drag.index] = Math.max(min, Math.min(max, raw));
        return next;
      });
    }

    function onMouseUp() {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (projectId) {
        setDividers(current => {
          localStorage.setItem(`story-dividers-${projectId}`, JSON.stringify(current));
          return current;
        });
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function flexRatios(): number[] {
    if (paneCount === 1) return [1];
    if (paneCount === 2) return [dividers[0], 100 - dividers[0]];
    return [dividers[0], dividers[1] - dividers[0], 100 - dividers[1]];
  }

  function renderPaneContent(view: PaneView, paneIndex: number) {
    switch (view.kind) {
      case 'empty':
        return null;
      case 'outline':
        return projection ? (
          <OutlinePanel
            slots={projection.slots}
            blocks={projection.blocks}
            outlineAssignments={projection.outlineAssignments}
            outlineOrder={projection.outlineOrder}
            onBlockAssigned={async (blockId, fromSlot, toSlot) => {
              if (!projectId) return;
              const block = projection.blocks.find(b => b.id === blockId);
              await appendEvent(projectId, { type: 'BlockAssigned', payload: { blockId, fromSlot, toSlot, referenced: block?.pinned ?? false } });
              await loadProjection();
            }}
            onBlockUnassigned={async (blockId, fromSlot) => {
              if (!projectId) return;
              await appendEvent(projectId, { type: 'BlockUnassigned', payload: { blockId, fromSlot, toSlot: '' } });
              await loadProjection();
            }}
            onBlockClick={() => {}}
            onOutlineReordered={async (slotId, blockIds) => {
              if (!projectId) return;
              await appendEvent(projectId, { type: 'OutlineOrderChanged', payload: { slotId, blockIds } });
              await loadProjection();
            }}
          />
        ) : null;
      case 'notes':
        return projectId && projection ? (
          <StoryNotesPane
            projection={projection}
            projectId={projectId}
            onRefresh={loadProjection}
            selectedBlockId={view.selectedBlockId}
            onSelectBlock={id => selectView(paneIndex, { kind: 'notes', selectedBlockId: id ?? undefined })}
          />
        ) : null;
      case 'chapter': {
        if (!projection || !projectId) return null;
        const chapter = projection.chapters.find(c => c.id === view.chapterId);
        const block = chapter?.boardBlockId ? projection.blocks.find(b => b.id === chapter.boardBlockId) : null;
        if (!chapter || !block) return null;
        return (
          <ChapterDetail
            block={block}
            chapter={chapter}
            projection={projection}
            projectId={projectId}
            onRefresh={loadProjection}
            showBanner={false}
            controlledDraft={chapterDrafts[chapter.id]}
            onDraftChange={content => setChapterDrafts(prev => ({ ...prev, [chapter.id]: content }))}
            initialEtag={chapterDraftEtags[chapter.id] ?? null}
            onEtagChange={etag => setChapterDraftEtags(prev => ({ ...prev, [chapter.id]: etag }))}
            initialTab={view.tab}
            onTabChange={tab => selectView(paneIndex, { kind: 'chapter', chapterId: chapter.id, tab })}
          />
        );
      }
    }
  }

  if (loading) return (
    <div className="board-page-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-text-secondary)' }}>Loading…</span>
    </div>
  );

  if (!projection) return null;

  const activeBlocks = projection.blocks.filter(b => b.status !== 'archived').length;
  const chapters = [...projection.chapters].sort((a, b) => a.order - b.order);

  async function handleExport(chapterIds: string[]) {
    if (!projectId) return;
    const selected = chapters.filter(c => chapterIds.includes(c.id));
    const contents = await Promise.all(selected.map(c => getChapterDraft(projectId, c.id)));
    const md = buildChapterMarkdownExport(
      projection.meta.title,
      selected.map((c, i) => ({ title: c.title, content: contents[i].content })),
    );
    downloadTextFile(`${slugify(projection.meta.title)}.md`, md, 'text/markdown');
  }

  return (
    <div className="board-page-shell">
      <SiteBanner />
      <div className="board-app">
        <ProjectSidebar meta={projection.meta} blockCount={activeBlocks} collapsed={sidebarCollapsed} />
        <button
          className="board-sidebar-toggle"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`ti ti-chevron-${sidebarCollapsed ? 'right' : 'left'}`} />
        </button>

        <div className="board-main">
          <div className="board-toolbar">
            <nav className="board-toolbar-breadcrumb">
              <Link to="/author" className="author-breadcrumb-link">Author Studio</Link>
              <span className="author-breadcrumb-sep">/</span>
              <Link to={`/author/projects/${projectId}`} className="author-breadcrumb-link">{projection.meta.title}</Link>
              <span className="author-breadcrumb-sep">/</span>
              <span className="author-breadcrumb-current">story</span>
            </nav>
            <div className="board-toolbar-divider" />
            <div className="board-layout-toggle">
              <button className={`board-layout-btn${paneCount === 1 ? ' active' : ''}`} onClick={() => setPanes(1)} title="Single pane">
                <i className="ti ti-square" />
              </button>
              <button className={`board-layout-btn${paneCount === 2 ? ' active' : ''}`} onClick={() => setPanes(2)} title="Two panes">
                <i className="ti ti-layout-columns" />
              </button>
              <button className={`board-layout-btn${paneCount === 3 ? ' active' : ''}`} onClick={() => setPanes(3)} title="Three panes">
                <i className="ti ti-columns-3" />
              </button>
            </div>
            <div className="board-toolbar-divider" />
            <ExportControl chapters={chapters} onExport={handleExport} />
          </div>

          <div className="story-pane-area" ref={containerRef}>
            {flexRatios().map((ratio, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <div className="story-pane" style={{ flex: ratio }}>
                  <PaneHeader
                    view={paneViews[i] ?? { kind: 'empty' }}
                    chapters={chapters}
                    onSelect={v => selectView(i, v)}
                    onClear={() => selectView(i, { kind: 'empty' })}
                  />
                  <div className="story-pane-body">
                    {renderPaneContent(paneViews[i] ?? { kind: 'empty' }, i)}
                  </div>
                </div>
                {i < paneCount - 1 && (
                  <div
                    className="story-pane-divider"
                    onMouseDown={e => handleDividerMouseDown(i, e)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
