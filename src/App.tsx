import { useState } from "react";
import { PdfTextRenderer } from "./components/PdfTextRenderer";
import { sampleText } from "./data/sampleText";

// ── Styles ──────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  overflow: "hidden",
  fontFamily: "'Georgia', 'Times New Roman', serif",
};

const headerStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "1.2rem 1rem",
  borderBottom: "1px solid #e0e0e0",
  flexShrink: 0,
  backgroundColor: "#fafaf8",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#1a1a1a",
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  color: "#888",
  fontWeight: 400,
  margin: "0.25rem 0 0",
};

const splitContainerStyle: React.CSSProperties = {
  display: "flex",
  flex: 1,
  gap: "1rem",
  padding: "1rem",
  minHeight: 0, // critical for flex children to scroll
};

const leftPaneStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "50%",
  minWidth: 0,
};

const textareaStyle: React.CSSProperties = {
  flex: 1,
  width: "100%",
  resize: "none",
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: "0.82rem",
  lineHeight: 1.5,
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "1rem",
  outline: "none",
  backgroundColor: "#fdfdfd",
  color: "#333",
  boxSizing: "border-box",
};

const buttonBarStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.6rem",
  paddingTop: "0.75rem",
  flexShrink: 0,
};

const runButtonStyle: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  color: "#fff",
  border: "none",
  padding: "0.55rem 1.6rem",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9rem",
  fontFamily: "inherit",
};

const sampleButtonStyle: React.CSSProperties = {
  backgroundColor: "transparent",
  color: "#555",
  border: "1px solid #ccc",
  padding: "0.55rem 1.2rem",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "0.85rem",
  fontFamily: "inherit",
};

const clearButtonStyle: React.CSSProperties = {
  backgroundColor: "transparent",
  color: "#999",
  border: "none",
  padding: "0.55rem 0.8rem",
  cursor: "pointer",
  fontSize: "0.85rem",
  textDecoration: "underline",
  fontFamily: "inherit",
  marginLeft: "auto",
};

const rightPaneStyle: React.CSSProperties = {
  width: "50%",
  minWidth: 0,
  overflowY: "auto",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
  backgroundColor: "#fff",
};

const placeholderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  color: "#bbb",
  fontStyle: "italic",
  fontSize: "1rem",
  padding: "2rem",
  textAlign: "center",
};

// ── Component ───────────────────────────────────────────────────────────

function App() {
  const [inputText, setInputText] = useState("");
  const [renderedText, setRenderedText] = useState("");

  const handleRun = () => {
    setRenderedText(inputText);
  };

  const handleLoadSample = () => {
    setInputText(sampleText);
  };

  const handleClear = () => {
    setInputText("");
    setRenderedText("");
  };

  return (
    <div style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <h1 style={titleStyle}>PDF Text Renderer</h1>
        <p style={subtitleStyle}>
          Paste parsed PDF text, click Run, and see it formatted
        </p>
      </header>

      {/* Split panes */}
      <div style={splitContainerStyle}>
        {/* Left pane — input */}
        <div style={leftPaneStyle}>
          <textarea
            style={textareaStyle}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your parsed PDF text here..."
            spellCheck={false}
          />
          <div style={buttonBarStyle}>
            <button
              style={runButtonStyle}
              onClick={handleRun}
              disabled={!inputText.trim()}
            >
              Run
            </button>
            <button style={sampleButtonStyle} onClick={handleLoadSample}>
              Load Sample
            </button>
            <button
              style={clearButtonStyle}
              onClick={handleClear}
              disabled={!inputText && !renderedText}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Right pane — output */}
        <div style={rightPaneStyle}>
          {renderedText ? (
            <PdfTextRenderer text={renderedText} showPageMarkers={false} />
          ) : (
            <div style={placeholderStyle}>
              Paste text on the left and click <strong>&nbsp;Run&nbsp;</strong>{" "}
              to see formatted output
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
