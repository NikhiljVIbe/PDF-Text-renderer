import React from "react";
import { BlockType, type ParsedBlock } from "./types";

// ── Inline style constants ──────────────────────────────────────────────

const STYLES: Record<string, React.CSSProperties> = {
  // Page markers (headers/footers from original PDF)
  pageMarker: {
    color: "#999",
    fontSize: "0.75rem",
    borderBottom: "1px dashed #ccc",
    padding: "4px 0",
    marginBottom: "1rem",
    fontFamily: "monospace",
    userSelect: "none",
  },

  // Exhibit / Figure headers
  exhibitHeader: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#2a5a8a",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginTop: "2.5rem",
    marginBottom: "0.5rem",
    paddingBottom: "0.4rem",
    borderBottom: "1px solid #2a5a8a",
  },

  // Metadata (authors, institution, date)
  metadata: {
    color: "#666",
    fontSize: "0.9rem",
    fontStyle: "italic",
    marginBottom: "0.5rem",
    lineHeight: 1.5,
    textAlign: "center",
  },

  // Footnotes
  footnote: {
    fontSize: "0.8rem",
    color: "#555",
    paddingLeft: "1.5em",
    textIndent: "-1.5em",
    lineHeight: 1.5,
    marginBottom: "0.3rem",
  },

  // Table wrapper (for horizontal scroll)
  tableWrapper: {
    overflowX: "auto",
    marginBottom: "1.5rem",
    marginTop: "0.5rem",
  },
  table: {
    borderCollapse: "collapse",
    width: "100%",
    fontSize: "0.85rem",
    fontFamily: "'Courier New', Courier, monospace",
  },
  tableHeaderCell: {
    border: "1px solid #bbb",
    padding: "8px 12px",
    textAlign: "left",
    fontWeight: 700,
    backgroundColor: "#f0f0f0",
    whiteSpace: "nowrap",
  },
  tableCell: {
    border: "1px solid #ddd",
    padding: "6px 12px",
    textAlign: "left",
    verticalAlign: "top",
  },

  // Lists
  list: {
    paddingLeft: "1.8em",
    marginBottom: "1.2rem",
    lineHeight: 1.7,
  },
  listItem: {
    marginBottom: "0.35rem",
  },

  // Blockquotes
  blockquote: {
    borderLeft: "4px solid #DAA520",
    paddingLeft: "1.2em",
    marginLeft: 0,
    marginRight: 0,
    marginTop: "1.2rem",
    marginBottom: "1.2rem",
    fontStyle: "italic",
    color: "#444",
    lineHeight: 1.7,
  },
  attribution: {
    display: "block",
    marginTop: "0.5rem",
    fontStyle: "normal",
    fontWeight: 600,
    fontSize: "0.9rem",
    color: "#666",
  },

  // Headings
  heading1: {
    fontSize: "1.65rem",
    fontWeight: 700,
    marginTop: "2.5rem",
    marginBottom: "0.8rem",
    lineHeight: 1.3,
    color: "#111",
    borderBottom: "2px solid #e0e0e0",
    paddingBottom: "0.4rem",
  },
  heading2: {
    fontSize: "1.3rem",
    fontWeight: 700,
    marginTop: "2rem",
    marginBottom: "0.6rem",
    lineHeight: 1.3,
    color: "#1a1a1a",
    letterSpacing: "0.02em",
  },
  heading3: {
    fontSize: "1.1rem",
    fontWeight: 600,
    marginTop: "1.5rem",
    marginBottom: "0.5rem",
    lineHeight: 1.4,
    color: "#333",
  },

  // Paragraphs
  paragraph: {
    marginTop: 0,
    marginBottom: "1.2rem",
    lineHeight: 1.75,
    textAlign: "justify",
  },
};

// ── Table parser ────────────────────────────────────────────────────────

function parseTableLines(lines: string[]): {
  headers: string[];
  rows: string[][];
} {
  const splitLine = (line: string): string[] =>
    line
      .trim()
      .split(/\s{2,}|\t/)
      .map((cell) => cell.trim());

  const allRows = lines.map(splitLine);
  if (allRows.length === 0) return { headers: [], rows: [] };

  // First row is the header
  const headers = allRows[0];
  const rows = allRows.slice(1);

  // Normalize column count — pad shorter rows
  const maxCols = Math.max(headers.length, ...rows.map((r) => r.length));
  const padRow = (row: string[]): string[] => {
    while (row.length < maxCols) row.push("");
    return row.slice(0, maxCols);
  };

  return {
    headers: padRow([...headers]),
    rows: rows.map((r) => padRow([...r])),
  };
}

// ── List parser ─────────────────────────────────────────────────────────

function parseListItems(lines: string[]): { ordered: boolean; items: string[] } {
  const BULLET_STRIP_RE = /^\s*(?:[-*]|\d{1,3}[.)]|\(?[ivxlcdm]+[.)]|[a-z][.)])\s+/i;

  const items: string[] = [];
  let hasOrderedBullet = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (BULLET_STRIP_RE.test(trimmed)) {
      // New list item — strip the bullet
      const text = trimmed.replace(BULLET_STRIP_RE, "");
      items.push(text);
      if (/^\s*\d{1,3}[.)]/.test(trimmed) || /^\s*\(?[ivxlcdm]+[.)]/.test(trimmed)) {
        hasOrderedBullet = true;
      }
    } else if (items.length > 0) {
      // Continuation line — append to previous item
      items[items.length - 1] += " " + trimmed;
    } else {
      items.push(trimmed);
    }
  }

  return { ordered: hasOrderedBullet, items };
}

// ── Blockquote parser ───────────────────────────────────────────────────

function parseBlockquote(content: string, lines: string[]): {
  text: string;
  attribution?: string;
} {
  const lastLine = lines[lines.length - 1].trim();
  const hasAttribution = /^\s*[—\u2014\u2013-]\s*\S/.test(lastLine);

  if (hasAttribution && lines.length > 1) {
    const quoteLines = lines.slice(0, -1);
    const quoteText = quoteLines.map((l) => l.trim()).join(" ");
    return {
      text: stripQuoteMarks(quoteText),
      attribution: lastLine.replace(/^[—\u2014\u2013-]\s*/, ""),
    };
  }

  return { text: stripQuoteMarks(content) };
}

function stripQuoteMarks(text: string): string {
  return text.replace(/^[""\u201C]\s*/, "").replace(/\s*[""\u201D]$/, "");
}

// ── Heading level determination ─────────────────────────────────────────

function getHeadingLevel(
  text: string,
  headingIndex: number
): 1 | 2 | 3 {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  const isAllCapsText = letters.length > 3 && letters === letters.toUpperCase();

  // First heading in the document gets level 1
  if (headingIndex === 1) return 1;

  // All-caps headings → level 2 (major section)
  if (isAllCapsText) return 2;

  // Title-case or other → level 3 (subsection)
  return 3;
}

// ── Block renderers ─────────────────────────────────────────────────────

function renderPageMarker(block: ParsedBlock, key: string): React.ReactNode {
  return (
    <div key={key} style={STYLES.pageMarker} aria-hidden="true">
      {block.content}
    </div>
  );
}

function renderExhibitHeader(block: ParsedBlock, key: string): React.ReactNode {
  return (
    <div key={key} style={STYLES.exhibitHeader}>
      {block.content}
    </div>
  );
}

function renderMetadata(block: ParsedBlock, key: string): React.ReactNode {
  return (
    <div key={key} style={STYLES.metadata}>
      {block.content}
    </div>
  );
}

function renderFootnote(block: ParsedBlock, key: string): React.ReactNode {
  return (
    <div key={key}>
      {block.lines.map((line, i) => {
        const trimmed = line.trim();
        const match = trimmed.match(/^(\d{1,2})\s+(.*)/);
        if (match) {
          return (
            <p key={i} style={STYLES.footnote}>
              <sup style={{ fontWeight: 700, marginRight: "0.25em" }}>
                {match[1]}
              </sup>
              {match[2]}
            </p>
          );
        }
        return (
          <p key={i} style={STYLES.footnote}>
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

function renderTable(block: ParsedBlock, key: string): React.ReactNode {
  const { headers, rows } = parseTableLines(block.lines);

  return (
    <div key={key} style={STYLES.tableWrapper}>
      <table style={STYLES.table}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={STYLES.tableHeaderCell}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={STYLES.tableCell}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderList(block: ParsedBlock, key: string): React.ReactNode {
  const { ordered, items } = parseListItems(block.lines);
  const Tag = ordered ? "ol" : "ul";

  return (
    <Tag key={key} style={STYLES.list}>
      {items.map((item, i) => (
        <li key={i} style={STYLES.listItem}>
          {item}
        </li>
      ))}
    </Tag>
  );
}

function renderBlockquoteBlock(
  block: ParsedBlock,
  key: string
): React.ReactNode {
  const { text, attribution } = parseBlockquote(block.content, block.lines);

  return (
    <blockquote key={key} style={STYLES.blockquote}>
      {text}
      {attribution && <span style={STYLES.attribution}>— {attribution}</span>}
    </blockquote>
  );
}

function renderHeading(
  block: ParsedBlock,
  key: string,
  headingIndex: number
): React.ReactNode {
  const level = getHeadingLevel(block.content, headingIndex);
  const style =
    level === 1
      ? STYLES.heading1
      : level === 2
        ? STYLES.heading2
        : STYLES.heading3;
  const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";

  return (
    <Tag key={key} style={style}>
      {block.content}
    </Tag>
  );
}

function renderParagraph(block: ParsedBlock, key: string): React.ReactNode {
  return (
    <p key={key} style={STYLES.paragraph}>
      {block.content}
    </p>
  );
}

// ── Main dispatcher ─────────────────────────────────────────────────────

export function renderBlock(
  block: ParsedBlock,
  index: number,
  showPageMarkers: boolean,
  headingIndex: number
): React.ReactNode {
  const key = `block-${index}`;

  switch (block.type) {
    case BlockType.PageMarker:
      return showPageMarkers ? renderPageMarker(block, key) : null;
    case BlockType.ExhibitHeader:
      return renderExhibitHeader(block, key);
    case BlockType.Metadata:
      return renderMetadata(block, key);
    case BlockType.Footnote:
      return renderFootnote(block, key);
    case BlockType.Table:
      return renderTable(block, key);
    case BlockType.List:
      return renderList(block, key);
    case BlockType.Blockquote:
      return renderBlockquoteBlock(block, key);
    case BlockType.Heading:
      return renderHeading(block, key, headingIndex);
    case BlockType.Paragraph:
      return renderParagraph(block, key);
    default:
      return renderParagraph(block, key);
  }
}
