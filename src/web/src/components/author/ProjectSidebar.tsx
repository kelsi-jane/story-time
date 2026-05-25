import type { ProjectMeta } from '../../types';
import { getTemplate } from '../../data/templates';

interface Props {
  meta: ProjectMeta;
  blockCount: number;
  collapsed?: boolean;
}

const NAV_ITEMS = [
  { icon: 'ti-layout-board', label: 'brainstorm', active: true },
  { icon: 'ti-list-details', label: 'outline', active: false },
  { icon: 'ti-users',        label: 'characters', active: false },
  { icon: 'ti-map-pin',      label: 'locations', active: false },
  { icon: 'ti-git-branch',   label: 'history', active: false },
  { icon: 'ti-message-circle', label: 'feedback', active: false },
];

export default function ProjectSidebar({ meta, blockCount, collapsed }: Props) {
  const template = getTemplate(meta.templateId);

  return (
    <div className={`board-sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="board-sidebar-top">
        <div className="board-sidebar-brand">wistful.me</div>
        <div className="board-sidebar-story">{meta.title}</div>
        <div className="board-sidebar-meta">{blockCount} {blockCount === 1 ? 'idea' : 'ideas'}</div>
      </div>

      <nav className="board-sidebar-nav">
        {NAV_ITEMS.map(item => (
          <div
            key={item.label}
            className={`board-nav-item${item.active ? ' active' : ' disabled'}`}
          >
            <i className={`ti ${item.icon}`} />
            {item.label}
          </div>
        ))}
      </nav>

      <div className="board-sidebar-foot">
        {template && (
          <div className="board-template-chip">
            <i className={`ti ${template.icon}`} />
            {template.name}
          </div>
        )}
      </div>
    </div>
  );
}
