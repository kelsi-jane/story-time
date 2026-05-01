import { useState, type KeyboardEvent } from 'react';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ value, onChange }: Props) {
  const [input, setInput] = useState('');

  function commit() {
    const tag = input.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setInput('');
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !input && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="tag-input">
      {value.map((tag) => (
        <span key={tag} className="tag-input-pill">
          {tag}
          <button type="button" onClick={() => remove(tag)} className="tag-input-remove">×</button>
        </span>
      ))}
      <input
        className="tag-input-field"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={value.length === 0 ? 'Type a tag and press Enter…' : ''}
      />
    </div>
  );
}
