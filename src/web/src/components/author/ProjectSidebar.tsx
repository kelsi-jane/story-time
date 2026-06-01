import { Link, useLocation } from 'react-router-dom';
import type { ProjectMeta } from '../../types';
import { getTemplate } from '../../data/templates';

interface Props {
  meta: ProjectMeta;
  blockCount: number;
  collapsed?: boolean;
}

interface NavItem {
  icon: string;
  label: string;
  path?: (projectId: string) => string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { icon: 'ti-layout-board',    label: 'brainstorm', path: id => `/author/projects/${id}`,        exact: true  },
  { icon: 'ti-list-details',    label: 'story',      path: id => `/author/projects/${id}/story`,  exact: false },
  { icon: 'ti-book',            label: 'chapters'   },
  { icon: 'ti-users',           label: 'characters' },
  { icon: 'ti-map-pin',         label: 'locations'  },
  { icon: 'ti-git-branch',      label: 'history'    },
  { icon: 'ti-message-circle',  label: 'feedback'   },
];

export default function ProjectSidebar({ meta, blockCount, collapsed }: Props) {
  const template = getTemplate(meta.templateId);
  const location = useLocation();

  function isActive(item: NavItem): boolean {
    if (!item.path) return false;
    const href = item.path(meta.projectId);
    return item.exact ? location.pathname === href : location.pathname.startsWith(href);
  }

  return (
    <div className={`board-sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="board-sidebar-top">
        <div className="board-sidebar-story">{meta.title}</div>
        <div className="board-sidebar-meta">{blockCount} {blockCount === 1 ? 'idea' : 'ideas'}</div>
      </div>

      <nav className="board-sidebar-nav">
        {NAV_ITEMS.map(item => {
          const active = isActive(item);
          const href = item.path?.(meta.projectId);
          const className = `board-nav-item${active ? ' active' : !href ? ' disabled' : ''}`;
          return href ? (
            <Link key={item.label} to={href} className={className}>
              <i className={`ti ${item.icon}`} />
              {item.label}
            </Link>
          ) : (
            <div key={item.label} className={className}>
              <i className={`ti ${item.icon}`} />
              {item.label}
            </div>
          );
        })}
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
