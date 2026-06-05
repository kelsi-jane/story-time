import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import { getPreferences, applyTheme } from './api/preferences'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/lora/400.css'
import '@fontsource/lora/400-italic.css'
import '@fontsource/lora/500.css'
import '@fontsource/lora/500-italic.css'
import '@fontsource/caveat/400.css'
import '@fontsource/caveat/700.css'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import './index.css'
import './styles/artifacts.css'

applyTheme(getPreferences().theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
