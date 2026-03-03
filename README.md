# PDF Text Renderer

A browser-based tool that takes raw, unformatted text extracted from any PDF parser and intelligently reformats it into a clean, readable document. It auto-detects 9 structural block types — headings, tables, lists, blockquotes, footnotes, and more — and renders each with publication-quality styling.

![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Vite](https://img.shields.io/badge/Vite-7-purple)
![License](https://img.shields.io/badge/License-MIT-green)
![No External CSS](https://img.shields.io/badge/CSS_Libraries-None-orange)

## What It Does

- **Paste** raw text output from any PDF parser (pdfplumber, PyMuPDF, pdf.js, etc.) into the textarea
- **Click Run** to get a formatted, readable document instantly
- **Auto-detects** structural elements: headings, tables, lists, blockquotes, footnotes, metadata, exhibit headers, and page markers
- **Runs entirely in the browser** — no backend, no data leaves your machine

## Detected Block Types

| Block Type | What It Detects | Rendered As |
|---|---|---|
| **Heading** | ALL-CAPS or Title Case short lines without terminal punctuation | `<h1>` / `<h2>` / `<h3>` (auto-leveled) |
| **Paragraph** | Body text (default fallback) | Justified text with comfortable line-height |
| **Table** | Lines with 3+ columns separated by multiple spaces | HTML `<table>` with header row and borders |
| **List** | Unordered (`-` `*`), numeric (`1.`), roman (`i.`), alpha (`a.`) | `<ul>` or `<ol>` (auto-detected) |
| **Blockquote** | Quoted text with optional `— Author` attribution | Styled `<blockquote>` with gold border |
| **Exhibit Header** | "Exhibit 1:", "Figure 3:", "Table 2:", "Appendix A" | Bold section header with borders |
| **Metadata** | Author names, institutions, copyright, dates | Centered italic text |
| **Footnote** | Numbered notes in the last ~25% of the document | Superscript-numbered hanging-indent notes |
| **Page Marker** | PDF headers/footers with document IDs, lone page numbers | Hidden by default |

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
git clone https://github.com/NikhiljVIbe/PDF-Text-renderer.git
cd PDF-Text-renderer
npm install
```

### Running

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 5173) |
| `npm run build` | Production build (TypeScript check + Vite bundle) |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## How It Works

The parser uses a **3-stage pipeline** to transform raw text into structured blocks:

### 1. Normalize (`normalizeText`)

Raw PDF text often arrives as a wall of lines with no blank lines between sections. The normalizer applies 12 heuristic rules to insert blank-line boundaries at structural transitions — headings, tables, lists, blockquotes, page markers, and more. If the input already has sufficient blank lines (5%+), this step is bypassed entirely.

### 2. Chunk (`splitIntoChunks`)

The normalized text is split into groups of consecutive non-empty lines, separated by blank lines. Each group becomes a candidate structural block.

### 3. Classify & Render (`classifyChunk` + `renderBlock`)

Each chunk runs through a priority-ordered detection chain (page markers checked first, paragraph as fallback). The classified blocks are then rendered as semantic HTML with inline styles.

```
Raw PDF text
     |
     v
normalizeText()    -- insert blank-line boundaries (12 rules)
     |
     v
splitIntoChunks()  -- group consecutive non-empty lines
     |
     v
classifyChunk()    -- priority-ordered 9-type detection
     |
     v
renderBlock()      -- semantic HTML + inline styles
     |
     v
Formatted document
```

## Project Structure

```
src/
  App.tsx                              -- Split-pane UI: textarea input + formatted output
  main.tsx                             -- Entry point
  components/PdfTextRenderer/
    types.ts                           -- BlockType union + ParsedBlock interface
    parser.ts                          -- normalizeText + splitIntoChunks + parseText
    classifyChunk.ts                   -- Priority-ordered 9-type classifier
    blockRenderers.tsx                 -- Render function per block type (semantic HTML)
    PdfTextRenderer.tsx                -- Main React component (useMemo-optimized)
    index.ts                           -- Barrel exports
  data/
    sampleText.ts                      -- Preloaded sample (ISB case study)
```

## Tech Stack

- **React 19** — Functional components with hooks
- **TypeScript 5.9** — Strict mode
- **Vite 7** — Dev server and production builds
- **Zero external CSS or UI libraries** — All styling via inline `React.CSSProperties`
- **No backend** — Runs entirely in the browser
- **Semantic HTML** — Proper `<h1>`-`<h3>`, `<ul>`/`<ol>`, `<blockquote>`, `<table>` elements

## Design Decisions

- **Inline styles over CSS files** — Keeps the component self-contained and portable with no class name conflicts or external dependencies
- **`const as const` over `enum`** — Required by TypeScript's `erasableSyntaxOnly` config setting
- **Fast-path normalization bypass** — Text with 5%+ blank lines is assumed to already have structure, skipping unnecessary processing
- **`useMemo` for parsing** — The `parseText` function is memoized on the input text, so re-renders that don't change the text skip the entire pipeline
- **Priority-ordered classification** — Block types are checked in a fixed order (page marker first, paragraph last) so more specific patterns always win

## License

[MIT](LICENSE)
