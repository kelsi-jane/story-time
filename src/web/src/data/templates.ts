export interface TemplateSlot {
  id: string;
  label: string;
  order: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  slots: TemplateSlot[];
}

export const TEMPLATES: Template[] = [
  {
    id: '7-point',
    name: '7-point structure',
    description: 'Define your resolution first, then work backwards through plot turns, pinch points, and your hook. Strong for genre fiction and any story driven by a clear character arc.',
    icon: 'ti-arrows-split',
    slots: [
      { id: 'hook',        label: 'hook',        order: 0 },
      { id: 'plot-turn-1', label: 'plot turn 1', order: 1 },
      { id: 'pinch-1',     label: 'pinch 1',     order: 2 },
      { id: 'midpoint',    label: 'midpoint',    order: 3 },
      { id: 'pinch-2',     label: 'pinch 2',     order: 4 },
      { id: 'plot-turn-2', label: 'plot turn 2', order: 5 },
      { id: 'resolution',  label: 'resolution',  order: 6 },
    ],
  },
  {
    id: '3-act',
    name: '3-act structure',
    description: 'The foundation of dramatic storytelling. Setup, confrontation, resolution — three movements that give a story its shape and momentum.',
    icon: 'ti-layout-columns',
    slots: [
      { id: 'act-1', label: 'act 1 — setup',          order: 0 },
      { id: 'act-2', label: 'act 2 — confrontation',  order: 1 },
      { id: 'act-3', label: 'act 3 — resolution',     order: 2 },
    ],
  },
  {
    id: 'save-the-cat',
    name: 'save the cat',
    description: "Blake Snyder's 15-beat structure. Precise, commercial, and proven. Best for high-concept stories with a clear protagonist transformation.",
    icon: 'ti-list-numbers',
    slots: [
      { id: 'stc-opening-image',    label: 'opening image',      order: 0 },
      { id: 'stc-theme-stated',     label: 'theme stated',       order: 1 },
      { id: 'stc-setup',            label: 'setup',              order: 2 },
      { id: 'stc-catalyst',         label: 'catalyst',           order: 3 },
      { id: 'stc-debate',           label: 'debate',             order: 4 },
      { id: 'stc-break-into-two',   label: 'break into two',    order: 5 },
      { id: 'stc-b-story',          label: 'b story',            order: 6 },
      { id: 'stc-fun-and-games',    label: 'fun and games',      order: 7 },
      { id: 'stc-midpoint',         label: 'midpoint',           order: 8 },
      { id: 'stc-bad-guys-close',   label: 'bad guys close in',  order: 9 },
      { id: 'stc-all-is-lost',      label: 'all is lost',        order: 10 },
      { id: 'stc-dark-night',       label: 'dark night of soul', order: 11 },
      { id: 'stc-break-into-three', label: 'break into three',   order: 12 },
      { id: 'stc-finale',           label: 'finale',             order: 13 },
      { id: 'stc-closing-image',    label: 'closing image',      order: 14 },
    ],
  },
  {
    id: 'heros-journey',
    name: "hero's journey",
    description: "Campbell's 12-stage monomyth. Timeless structure for transformation stories — departure, initiation, return.",
    icon: 'ti-route',
    slots: [
      { id: 'hj-ordinary-world', label: 'ordinary world',        order: 0 },
      { id: 'hj-call',           label: 'call to adventure',     order: 1 },
      { id: 'hj-refusal',        label: 'refusal of the call',   order: 2 },
      { id: 'hj-mentor',         label: 'meeting the mentor',    order: 3 },
      { id: 'hj-threshold',      label: 'crossing the threshold',order: 4 },
      { id: 'hj-tests',          label: 'tests, allies, enemies',order: 5 },
      { id: 'hj-approach',       label: 'approach',              order: 6 },
      { id: 'hj-ordeal',         label: 'the ordeal',            order: 7 },
      { id: 'hj-reward',         label: 'reward',                order: 8 },
      { id: 'hj-road-back',      label: 'the road back',         order: 9 },
      { id: 'hj-resurrection',   label: 'resurrection',          order: 10 },
      { id: 'hj-return',         label: 'return with the elixir',order: 11 },
    ],
  },
  {
    id: 'freytag',
    name: "freytag's pyramid",
    description: 'Classical five-part dramatic arc. Exposition, rising action, climax, falling action, denouement. Best for literary and tragedy-adjacent stories.',
    icon: 'ti-chart-line',
    slots: [
      { id: 'ft-exposition',    label: 'exposition',    order: 0 },
      { id: 'ft-rising-action', label: 'rising action', order: 1 },
      { id: 'ft-climax',        label: 'climax',        order: 2 },
      { id: 'ft-falling-action',label: 'falling action',order: 3 },
      { id: 'ft-denouement',    label: 'denouement',    order: 4 },
    ],
  },
  {
    id: 'fichtean',
    name: 'fichtean curve',
    description: 'Opens in crisis, escalates through complications, peaks at climax, resolves. No slow setup — throws the reader into the middle of tension immediately.',
    icon: 'ti-trending-up',
    slots: [
      { id: 'fc-crisis',       label: 'crisis',       order: 0 },
      { id: 'fc-complications',label: 'complications',order: 1 },
      { id: 'fc-climax',       label: 'climax',       order: 2 },
      { id: 'fc-resolution',   label: 'resolution',   order: 3 },
    ],
  },
  {
    id: 'blank',
    name: 'blank',
    description: 'No starting structure. Build your own slots from scratch as the story reveals itself.',
    icon: 'ti-circle-dashed',
    slots: [],
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find(t => t.id === id);
}
