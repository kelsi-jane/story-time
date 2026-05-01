import { createBrowserRouter } from 'react-router-dom';
import Discovery from './pages/reader/Discovery';
import StoryTitle from './pages/reader/StoryTitle';
import Chapter from './pages/reader/Chapter';
import AdminIndex from './pages/admin/Index';
import StoryNew from './pages/admin/StoryNew';
import StoryEdit from './pages/admin/StoryEdit';
import ChapterNew from './pages/admin/ChapterNew';

export const router = createBrowserRouter([
  { path: '/', element: <Discovery /> },
  { path: '/stories/:slug', element: <StoryTitle /> },
  { path: '/stories/:slug/chapters/:chapterId', element: <Chapter /> },
  { path: '/admin', element: <AdminIndex /> },
  { path: '/admin/stories/new', element: <StoryNew /> },
  { path: '/admin/stories/:slug', element: <StoryEdit /> },
  { path: '/admin/stories/:slug/chapters/new', element: <ChapterNew /> },
  { path: '/admin/stories/:slug/chapters/:chapterId/edit', element: <ChapterNew /> },
]);
