import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkDirective from 'remark-directive';
import remarkArtifacts from '../../lib/remarkArtifacts';

export default function MarkdownGuide() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/markdown-guide.md')
      .then(r => r.text())
      .then(text => { setContent(text); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="markdown-guide-shell">
      <div className="markdown-guide-body">
        {loading ? (
          <p className="markdown-guide-loading">Loading…</p>
        ) : (
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkDirective, remarkArtifacts]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
