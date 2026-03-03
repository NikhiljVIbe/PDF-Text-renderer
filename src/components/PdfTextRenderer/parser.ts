import { BlockType, type ParsedBlock } from "./types";
import { classifyChunk } from "./classifyChunk";

// ── Regex patterns for normalizer (aligned with classifyChunk.ts) ───────

const PAGE_MARKER_RE = /^[A-Z]{2,}\d{2,}\s.*\|\s*\d+\s*$/;
const PAGE_NUMBER_RE = /^\s*\d{1,3}\s*$/;
const EXHIBIT_HEADER_RE = /^(Exhibit|Figure|Table|Chart|Appendix)\s+\d+/i;
const FOOTNOTE_START_RE = /^\d{1,2}\s+\S/;
const MULTI_SPACE_SPLIT_RE = /\s{2,}|\t/;
const BULLET_UNORDERED_RE = /^\s*[-*]\s+/;
const BULLET_ORDERED_NUM_RE = /^\s*\d{1,3}[.)]\s+/;
const BULLET_ORDERED_ROMAN_RE = /^\s*\(?[ivxlcdm]+[.)]\s+/i;
const BULLET_ORDERED_ALPHA_RE = /^\s*[a-z][.)]\s+/i;
const TERMINAL_PUNCT_RE = /[.!?;,)]\s*$/;
const ALL_CAPS_RE = /^[A-Z\s\d&:''"\-/,()]+$/;
const BLOCKQUOTE_OPEN_RE = /^["\u201C]/;
const ATTRIBUTION_RE = /^\s*[\u2014\u2013\u2015—-]{1,2}\s*[A-Z]/;
const SENTENCE_TERMINAL_RE = /[.!?]\s*$/;
const CONTINUATION_WORDS_RE =
  /^(the|a|an|and|or|but|in|on|at|to|for|of|with|by|from|as|is|was|were|are|be|been|have|has|had|that|this|these|those|which|who|it|its|not|so|if|than|can|will|should|would|could|may|might|do|does|did|about|into|through|during|before|after|also)\s/i;

// ── Helper functions (duplicated from classifyChunk.ts — not exported) ──

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

function isPageMarker(line: string): boolean {
  const trimmed = line.trim();
  return PAGE_MARKER_RE.test(trimmed) || PAGE_NUMBER_RE.test(trimmed);
}

function countColumns(line: string): number {
  return line.trim().split(MULTI_SPACE_SPLIT_RE).length;
}

// ── normalizeText: insert blank lines at structural boundaries ──────────

/**
 * Pre-processes raw PDF text to insert blank-line boundaries at structural
 * transitions. This enables splitIntoChunks (which splits on blank lines)
 * to produce correctly-sized chunks for classification.
 *
 * If the text already has blank lines (≥5%), it is returned unchanged.
 */
function normalizeText(raw: string): string {
  // Step 0: Normalize line endings
  const cleaned = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleaned.split("\n");

  // Fast path: if text already has sufficient blank lines, return as-is
  const blankCount = lines.filter((l) => l.trim() === "").length;
  if (lines.length > 0 && blankCount / lines.length >= 0.05) {
    return cleaned;
  }

  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const curr = lines[i];
    const currTrimmed = curr.trim();
    const prev = i > 0 ? lines[i - 1] : "";
    const prevTrimmed = prev.trim();

    let insertBlankBefore = false;
    let insertBlankAfter = false;

    // Only detect boundaries between two non-empty lines (skip first line)
    if (i > 0 && currTrimmed !== "" && prevTrimmed !== "") {
      // Rule 1: Page marker — always isolate
      if (isPageMarker(currTrimmed)) {
        insertBlankBefore = true;
        insertBlankAfter = true;
      }
      // Rule 2: Previous line was a page marker
      else if (isPageMarker(prevTrimmed)) {
        insertBlankBefore = true;
      }

      // Rule 3: Exhibit / Figure header
      else if (EXHIBIT_HEADER_RE.test(currTrimmed)) {
        insertBlankBefore = true;
      }

      // Rule 4: All-caps heading (skip if line looks tabular)
      else if (
        isAllCaps(currTrimmed) &&
        currTrimmed.length <= 80 &&
        !TERMINAL_PUNCT_RE.test(currTrimmed) &&
        !isAllCaps(prevTrimmed) && // keep consecutive all-caps lines together
        countColumns(currTrimmed) < 3 // not tabular data
      ) {
        insertBlankBefore = true;
        insertBlankAfter = true; // isolate heading from following content
      }

      // Rule 4b: Previous line was an all-caps heading — break after it
      else if (
        isAllCaps(prevTrimmed) &&
        prevTrimmed.length <= 80 &&
        !TERMINAL_PUNCT_RE.test(prevTrimmed) &&
        !isAllCaps(currTrimmed) &&
        countColumns(prevTrimmed) < 3 // prev wasn't tabular data
      ) {
        insertBlankBefore = true;
      }

      // Rule 5: Title-case heading (skip if line looks tabular)
      else if (
        isTitleCase(currTrimmed) &&
        currTrimmed.length <= 60 &&
        !TERMINAL_PUNCT_RE.test(currTrimmed) &&
        prevTrimmed.length > currTrimmed.length && // prev was a longer paragraph line
        countColumns(currTrimmed) < 3 // not tabular data
      ) {
        insertBlankBefore = true;
        insertBlankAfter = true; // isolate heading from following content
      }

      // Rule 6: Blockquote start
      else if (
        BLOCKQUOTE_OPEN_RE.test(currTrimmed) &&
        !BLOCKQUOTE_OPEN_RE.test(prevTrimmed)
      ) {
        insertBlankBefore = true;
      }

      // Rule 7: Attribution line — blank AFTER (keep with its quote)
      // Exclude bullet-pattern lines (e.g. "- First item") which also match attribution RE
      else if (
        ATTRIBUTION_RE.test(currTrimmed) &&
        !matchesBulletPattern(currTrimmed)
      ) {
        insertBlankAfter = true;
      }

      // Rule 8: List start — transition into a list
      else if (
        matchesBulletPattern(currTrimmed) &&
        !matchesBulletPattern(prevTrimmed)
      ) {
        insertBlankBefore = true;
      }

      // Rule 9: List end — transition out of a list
      else if (
        matchesBulletPattern(prevTrimmed) &&
        !matchesBulletPattern(currTrimmed) &&
        !/^\s{2,}/.test(curr) // not an indented continuation
      ) {
        insertBlankBefore = true;
      }

      // Rule 10: Footnote cluster start
      else if (
        FOOTNOTE_START_RE.test(currTrimmed) &&
        !FOOTNOTE_START_RE.test(prevTrimmed)
      ) {
        insertBlankBefore = true;
      }

      // Rule 11: Table boundary (entering or leaving tabular data)
      else if (
        countColumns(currTrimmed) >= 3 &&
        countColumns(prevTrimmed) < 3
      ) {
        insertBlankBefore = true;
      } else if (
        countColumns(prevTrimmed) >= 3 &&
        countColumns(currTrimmed) < 3
      ) {
        insertBlankBefore = true;
      }

      // Rule 12: Paragraph break (soft, conservative)
      else if (
        SENTENCE_TERMINAL_RE.test(prevTrimmed) &&
        prevTrimmed.length >= 60 &&
        /^[A-Z]/.test(currTrimmed) &&
        !CONTINUATION_WORDS_RE.test(currTrimmed) &&
        currTrimmed.length < prevTrimmed.length * 0.7
      ) {
        insertBlankBefore = true;
      }
    }

    // Insert blank line before (avoid duplicates)
    if (
      insertBlankBefore &&
      result.length > 0 &&
      result[result.length - 1].trim() !== ""
    ) {
      result.push("");
    }

    result.push(curr);

    // Insert blank line after
    if (insertBlankAfter) {
      result.push("");
    }
  }

  return result.join("\n");
}

// ── Pass 1: Split text into chunks (groups of consecutive non-empty lines) ──

function splitIntoChunks(text: string): string[][] {
  const lines = text.split("\n");
  const chunks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) {
        chunks.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

// ── Pass 2: Classify each chunk and produce ParsedBlock array ──

export function parseText(text: string): ParsedBlock[] {
  if (!text || !text.trim()) return [];

  const normalized = normalizeText(text);
  const chunks = splitIntoChunks(normalized);
  const blocks: ParsedBlock[] = [];
  let foundFirstParagraph = false;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const blockType = classifyChunk(
      chunk,
      i,
      chunks.length,
      !foundFirstParagraph
    );

    // Join lines: for tables preserve newlines, for everything else join with spaces
    const content =
      blockType === BlockType.Table
        ? chunk.join("\n")
        : chunk.map((l) => l.trim()).join(" ");

    blocks.push({
      type: blockType,
      lines: chunk,
      content,
    });

    if (
      blockType === BlockType.Paragraph ||
      blockType === BlockType.List ||
      blockType === BlockType.Blockquote
    ) {
      foundFirstParagraph = true;
    }
  }

  return blocks;
}
