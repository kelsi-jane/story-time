import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

// Converts container directives (:::name ... :::) into styled artifact divs.
//
// Usage in markdown:
//   :::sticky-note
//   Content here
//   :::
//
// Two categories of allowed attributes — no raw HTML passthrough.
//
// CSS custom properties (ATTR_TO_VAR) — override visual tokens via inline style:
//   bg      background color      :::sticky-note{bg="#9FE1CB"}
//   fg      text color            :::sticky-note{fg="#04342C"}
//   tilt    rotation angle        :::sticky-note{tilt="1.5deg"}
//   font    font-family           :::letter{font="monospace"}
//
// Data attributes (ATTR_TO_DATA) — read by CSS via attr() for content / selectors:
//   torn    torn edges (clipping)  :::clipping{torn}
//   date    dateline (clipping)    :::clipping{date="March 14, 1923"}
//
// Adding a CSS var: entry in ATTR_TO_VAR + var() fallback in artifacts.css.
// Adding a data attr: entry in ATTR_TO_DATA + [data-x] selector in artifacts.css.

const ATTR_TO_VAR: Record<string, string> = {
  bg:   '--artifact-bg',
  fg:   '--artifact-color',
  tilt: '--artifact-tilt',
  font: '--artifact-font',
};

const ATTR_TO_DATA: Record<string, string> = {
  torn: 'data-torn',
  date: 'data-date',
};

export default function remarkArtifacts() {
  return (tree: Root) => {
    visit(tree, (node: any) => {
      if (node.type !== 'containerDirective' && node.type !== 'leafDirective') return;
      if (!node.data) node.data = {};

      const attrs = node.attributes ?? {};

      const cssVars = Object.entries(ATTR_TO_VAR)
        .filter(([attr]) => attrs[attr] !== undefined)
        .map(([attr, varName]) => `${varName}: ${attrs[attr]}`)
        .join('; ');

      const dataAttrs: Record<string, string> = {};
      for (const [attr, dataKey] of Object.entries(ATTR_TO_DATA)) {
        if (attrs[attr] !== undefined) dataAttrs[dataKey] = attrs[attr] ?? '';
      }

      node.data.hName = 'div';
      node.data.hProperties = {
        class: `artifact artifact-${node.name}`,
        ...(cssVars ? { style: cssVars } : {}),
        ...dataAttrs,
      };
    });
  };
}
