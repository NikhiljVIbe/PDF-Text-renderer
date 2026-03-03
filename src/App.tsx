import { PdfTextRenderer } from "./components/PdfTextRenderer";
import { sampleText } from "./data/sampleText";

const headerStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "2.5rem 1rem 0.5rem",
  fontFamily: "'Georgia', 'Times New Roman', serif",
  borderBottom: "1px solid #e0e0e0",
  marginBottom: "1rem",
  maxWidth: "72ch",
  margin: "0 auto",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.8rem",
  fontWeight: 700,
  color: "#1a1a1a",
  marginTop: 0,
  marginBottom: "0.3rem",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "1rem",
  color: "#888",
  fontWeight: 400,
  marginTop: 0,
  marginBottom: "1.5rem",
};

function App() {
  return (
    <div>
      <header style={headerStyle}>
        <h1 style={titleStyle}>PDF Text Renderer</h1>
        <p style={subtitleStyle}>
          Auto-detection and formatting of structural elements from raw parsed
          PDF text
        </p>
      </header>
      <main>
        <PdfTextRenderer text={sampleText} showPageMarkers={false} />
      </main>
    </div>
  );
}

export default App;
