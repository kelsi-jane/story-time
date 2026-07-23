export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'export';
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildChapterMarkdownExport(
  storyTitle: string,
  chapters: { title: string; content: string }[],
): string {
  const sections = chapters.map(c => `## ${c.title}\n\n${c.content}`.trimEnd());
  return [`# ${storyTitle}`, ...sections].join('\n\n---\n\n');
}
