import { GRAMMAR } from './grammar';
import { LISTENING } from './listening';
import { READING } from './reading';
import type { Level, Options } from './types';
import { VOCABULARY } from './vocabulary';

export type McqSection = 'grammar' | 'vocabulary' | 'reading' | 'listening';

/** One multiple-choice question in a common shape. `options[0]` is the answer. */
export type BankItem = {
  id: string;
  section: McqSection;
  level: Level;
  prompt: string;
  options: Options;
  explanation: string;
  topic: string | null;
  /** Items that are always shown together (the questions of one reading passage) share a unit. */
  unit: string;
  passage: { title: string; text: string } | null;
  lines: readonly { speaker: 'A' | 'B'; text: string }[] | null;
};

const items = new Map<string, BankItem>();
/** section -> level -> units, each unit a list of item ids in display order */
const units: Record<McqSection, Map<Level, string[][]>> = {
  grammar: new Map(),
  vocabulary: new Map(),
  reading: new Map(),
  listening: new Map(),
};

function add(item: BankItem) {
  if (items.has(item.id)) throw new Error(`Duplicate placement item id ${item.id}`);
  items.set(item.id, item);
  const list = units[item.section].get(item.level) ?? [];
  const existing = list.find((u) => items.get(u[0])?.unit === item.unit);
  if (existing) existing.push(item.id);
  else list.push([item.id]);
  units[item.section].set(item.level, list);
}

for (const g of GRAMMAR) add({ ...g, section: 'grammar', unit: g.id, passage: null, lines: null });
for (const v of VOCABULARY) add({ ...v, section: 'vocabulary', unit: v.id, passage: null, lines: null });
for (const p of READING)
  for (const q of p.questions)
    add({ ...q, section: 'reading', level: p.level, topic: null, unit: p.id, passage: { title: p.title, text: p.text }, lines: null });
for (const l of LISTENING) add({ ...l, section: 'listening', topic: null, unit: l.id, passage: null, lines: l.lines });

export function getItem(id: string): BankItem | undefined {
  return items.get(id);
}

export function unitsAt(section: McqSection, level: Level): string[][] {
  return units[section].get(level) ?? [];
}

export function allItems(): BankItem[] {
  return [...items.values()];
}
