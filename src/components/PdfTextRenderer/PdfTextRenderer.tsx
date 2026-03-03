import { useMemo } from "react";
import { parseText } from "./parser";
import { renderBlock } from "./blockRenderers";
import { BlockType } from "./types";
import type { PdfTextRendererProps } from "./types";

const containerStyle: React.CSSProperties = {
  fontFamily: "'Georgia', 'Times New Roman', serif",
  lineHeight: 1.7,
  maxWidth: "72ch",
  margin: "0 auto",
  padding: "2rem 1rem",
  color: "#1a1a1a",
};

export const PdfTextRenderer: React.FC<PdfTextRendererProps> = ({
  text,
  showPageMarkers = false,
  className = "",
}) => {
  const blocks = useMemo(() => parseText(text), [text]);

  // Pre-compute heading ordinal so first heading gets level-1 styling
  let headingCount = 0;

  return (
    <article style={containerStyle} className={className}>
      {blocks.map((block, index) => {
        let headingIndex = 0;
        if (block.type === BlockType.Heading) {
          headingCount++;
          headingIndex = headingCount;
        }
        return renderBlock(block, index, showPageMarkers, headingIndex);
      })}
    </article>
  );
};
