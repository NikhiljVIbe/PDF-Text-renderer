import { BlockType, type ParsedBlock } from "./types";
import { classifyChunk } from "./classifyChunk";

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

  const chunks = splitIntoChunks(text);
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
