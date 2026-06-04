import { createBrowserRouter } from 'react-router-dom';
import Discovery from './pages/reader/Discovery';
import StoryTitle from './pages/reader/StoryTitle';
import Chapter from './pages/reader/Chapter';
import { ErrorPage } from './pages/ErrorPage';
import RouteErrorPage from './pages/ErrorPage';
import AdminIndex from './pages/admin/Index';
import StoryNew from './pages/admin/StoryNew';
import StoryEdit from './pages/admin/StoryEdit';
import ChapterNew from './pages/admin/ChapterNew';
import Admins from './pages/admin/Admins';
import Settings from './pages/reader/Settings';
import AuthorIndex from './pages/author/Index';
import Project from './pages/author/Project';
import Story from './pages/author/Story';
import Chapters from './pages/author/Chapters';
import BlockDetail from './pages/author/BlockDetail';

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <Discovery /> },
      { path: '/stories/:slug', element: <StoryTitle /> },
      { path: '/stories/:slug/chapters/:chapterId', element: <Chapter /> },
      { path: '/unauthorized', element: <ErrorPage status={403} /> },
      { path: '/admin', element: <AdminIndex /> },
      { path: '/admin/admins', element: <Admins /> },
      { path: '/admin/stories/new', element: <StoryNew /> },
      { path: '/admin/stories/:slug', element: <StoryEdit /> },
      { path: '/admin/stories/:slug/chapters/new', element: <ChapterNew /> },
      { path: '/admin/stories/:slug/chapters/:chapterId/edit', element: <ChapterNew /> },
      { path: '/settings', element: <Settings /> },
      { path: '/author', element: <AuthorIndex /> },
      { path: '/author/projects/:projectId', element: <Project /> },
      { path: '/author/projects/:projectId/story', element: <Story /> },
      { path: '/author/projects/:projectId/chapters', element: <Chapters /> },
      { path: '/author/projects/:projectId/blocks/:blockId', element: <BlockDetail /> },
      { path: '/teapot', element: <ErrorPage status={418} /> },
    ],
  },
]);
