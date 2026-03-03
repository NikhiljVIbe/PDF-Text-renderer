export const BlockType = {
  PageMarker: "page_marker",
  ExhibitHeader: "exhibit_header",
  Metadata: "metadata",
  Footnote: "footnote",
  Table: "table",
  List: "list",
  Blockquote: "blockquote",
  Heading: "heading",
  Paragraph: "paragraph",
} as const;

export type BlockType = (typeof BlockType)[keyof typeof BlockType];

export interface ParsedBlock {
  type: BlockType;
  lines: string[];
  content: string;
}

export interface PdfTextRendererProps {
  text: string;
  showPageMarkers?: boolean;
  className?: string;
}
