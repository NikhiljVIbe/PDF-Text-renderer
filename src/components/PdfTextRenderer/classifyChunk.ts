import { BlockType } from "./types";

// ── Regex patterns (compiled once at module level) ──────────────────────

const PAGE_MARKER_RE = /^[A-Z]{2,}\d{2,}\s.*\|\s*\d+\s*$/;
const PAGE_NUMBER_RE = /^\s*\d{1,3}\s*$/;
const EXHIBIT_HEADER_RE =
  /^(Exhibit|Figure|Table|Chart|Appendix)\s+\d+/i;
const FOOTNOTE_START_RE = /^\d{1,2}\s+\S/;
const MULTI_SPACE_SPLIT_RE = /\s{2,}|\t/;
const BULLET_UNORDERED_RE = /^\s*[-*]\s+/;
const BULLET_ORDERED_NUM_RE = /^\s*\d{1,3}[.)]\s+/;
const BULLET_ORDERED_ROMAN_RE = /^\s*\(?[ivxlcdm]+[.)]\s+/i;
const BULLET_ORDERED_ALPHA_RE = /^\s*[a-z][.)]\s+/i;
const TERMINAL_PUNCT_RE = /[.!?;,)]\s*$/;
const ALL_CAPS_RE = /^[A-Z\s\d&:''"\-/,()]+$/;

// ── Helper utilities ────────────────────────────────────────────────────

function isPageMarker(line: string): boolean {
  const trimmed = line.trim();
  return PAGE_MARKER_RE.test(trimmed) || PAGE_NUMBER_RE.test(trimmed);
}

function isAllCaps(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  return letters.length > 3 && ALL_CAPS_RE.test(text.trim());
}

function isTitleCase(text: string): boolean {
  const words = text.split(/\s+/).filter((w) => w.length > 3);
  if (words.length < 2) return false;
  const capitalizedCount = words.filter((w) => /^[A-Z]/.test(w)).length;
  return capitalizedCount / words.length >= 0.5;
}

function matchesBulletPattern(line: string): boolean {
  return (
    BULLET_UNORDERED_RE.test(line) ||
    BULLET_ORDERED_NUM_RE.test(line) ||
    BULLET_ORDERED_ROMAN_RE.test(line) ||
    BULLET_ORDERED_ALPHA_RE.test(line)
  );
}

function countColumns(line: string): number {
  return line.trim().split(MULTI_SPACE_SPLIT_RE).length;
}

// ── Main classifier ─────────────────────────────────────────────────────

export function classifyChunk(
  lines: string[],
  chunkIndex: number,
  totalChunks: number,
  isBeforeFirstParagraph: boolean
): BlockType {
  const firstLine = lines[0].trim();
  const joinedText = lines.map((l) => l.trim()).join(" ");

  // 1. Page marker — single line matching page header/footer pattern
  if (lines.length === 1 && isPageMarker(firstLine)) {
    return BlockType.PageMarker;
  }

  // Also check if ALL lines in a multi-line chunk are page markers
  if (lines.length <= 2 && lines.every((l) => isPageMarker(l.trim()))) {
    return BlockType.PageMarker;
  }

  // 2. Exhibit / Figure header
  if (EXHIBIT_HEADER_RE.test(firstLine) && lines.length <= 3) {
    return BlockType.ExhibitHeader;
  }

  // 3. Metadata — only before the first paragraph; look for pipe separators,
  //    institutional words, short date-like lines, copyright notices
  if (isBeforeFirstParagraph && lines.length <= 5) {
    const hasPipe = lines.some((l) => l.includes("|"));
    const hasInstitution = /university|school|institute|college|department|copyright/i.test(
      joinedText
    );
    const hasDate = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/.test(
      joinedText
    );
    if (hasPipe || hasInstitution || (hasDate && joinedText.length < 120)) {
      return BlockType.Metadata;
    }
  }

  // 4. Footnote — in the last ~25% of chunks, lines starting with small numbers
  if (
    chunkIndex >= totalChunks * 0.7 &&
    lines.every((l) => FOOTNOTE_START_RE.test(l.trim()))
  ) {
    return BlockType.Footnote;
  }
  // Single footnote line in last quartile
  if (
    lines.length === 1 &&
    chunkIndex >= totalChunks * 0.7 &&
    FOOTNOTE_START_RE.test(firstLine)
  ) {
    return BlockType.Footnote;
  }

  // 5. Table — 3+ lines with consistent multi-column layout
  if (lines.length >= 3) {
    const columnCounts = lines.map(countColumns);
    const multiColumnLines = columnCounts.filter((c) => c >= 2).length;
    if (multiColumnLines / lines.length >= 0.6) {
      // Check consistency — most lines should have similar column count
      const modeCols = columnCounts
        .filter((c) => c >= 2)
        .sort(
          (a, b) =>
            columnCounts.filter((v) => v === b).length -
            columnCounts.filter((v) => v === a).length
        )[0];
      const consistent = columnCounts.filter(
        (c) => Math.abs(c - modeCols) <= 1
      ).length;
      if (consistent / lines.length >= 0.6) {
        return BlockType.Table;
      }
    }
  }

  // 6. List — majority of lines match a bullet/number pattern
  if (lines.length >= 2) {
    const bulletLines = lines.filter((l) => matchesBulletPattern(l.trim()));
    if (bulletLines.length / lines.length >= 0.5) {
      return BlockType.List;
    }
  }
  // Single-line list item (rare, but handle it)
  if (lines.length === 1 && matchesBulletPattern(firstLine)) {
    return BlockType.List;
  }

  // 7. Blockquote — content wrapped in double quotes or has attribution
  const hasOpenQuote = /^[""\u201C]/.test(joinedText);
  const hasCloseQuote = /[""\u201D]\s*$/.test(joinedText);
  const hasAttribution = lines.length > 1 && /^\s*[—\u2014\u2013-]\s*\S/.test(lines[lines.length - 1]);
  if ((hasOpenQuote && hasCloseQuote) || hasAttribution) {
    return BlockType.Blockquote;
  }

  // 8. Heading — short line(s), no terminal punctuation, all-caps or title-case
  if (lines.length <= 2 && joinedText.length <= 80) {
    const noTerminalPunct = !TERMINAL_PUNCT_RE.test(joinedText);
    if (noTerminalPunct && (isAllCaps(joinedText) || isTitleCase(joinedText))) {
      return BlockType.Heading;
    }
  }

  // 9. Paragraph — default
  return BlockType.Paragraph;
}
