import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function MarkdownEditor({ value, onChange }: Props) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  return (
    <div className="mde">
      <div className="mde-tabs">
        <button type="button" className={`mde-tab${tab === 'write' ? ' active' : ''}`} onClick={() => setTab('write')}>
          Write
        </button>
        <button type="button" className={`mde-tab${tab === 'preview' ? ' active' : ''}`} onClick={() => setTab('preview')}>
          Preview
        </button>
      </div>

      <div className="mde-panes">
        <textarea
          className={`mde-input${tab === 'preview' ? ' mde-hide-mobile' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your chapter in Markdown…"
          spellCheck
        />
        <div className={`mde-preview prose${tab === 'write' ? ' mde-hide-mobile' : ''}`}>
          {value
            ? <ReactMarkdown>{value}</ReactMarkdown>
            : <span className="mde-empty">Preview will appear here.</span>
          }
        </div>
      </div>
    </div>
  );
}
