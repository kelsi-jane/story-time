import ReactMarkdown from 'react-markdown';
import remarkDirective from 'remark-directive';
import remarkArtifacts from '../../lib/remarkArtifacts';

interface Props {
  storyTitle: string;
  author: string;
  chapters: { id: string; title: string; content: string }[];
}

export default function ExportPrintView({ storyTitle, author, chapters }: Props) {
  return (
    <div id="export-print-root">
      <div className="export-print-titlepage">
        <h1 className="export-print-story-title">{storyTitle}</h1>
        <p className="export-print-story-author">by {author}</p>
      </div>
      <div className="export-print-footer">{storyTitle} · {author}</div>
      {chapters.map(c => (
        <article key={c.id} className="export-print-chapter">
          <h2 className="export-print-chapter-title">{c.title}</h2>
          <div className="export-print-chapter-rule" />
          <div className="prose export-print-prose">
            <ReactMarkdown remarkPlugins={[remarkDirective, remarkArtifacts]}>{c.content}</ReactMarkdown>
          </div>
        </article>
      ))}
    </div>
  );
}
