import { useState, useRef, useCallback } from 'react';
import { COLORS, verdictStyle, scoreColor, nextSteps } from '../lib/helpers';

function downloadReport(result) {
  const now = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const gaps = result.top_gaps?.length
    ? result.top_gaps.map(g => `- ${g}`).join('\n')
    : '- None — great work.';

  const dimRows = result.dimensions.map(d => {
    const fix = d.fix && d.fix !== 'null' ? d.fix : '—';
    return `| ${d.name} | ${d.score}/1 | ${d.finding} | ${fix} |`;
  }).join('\n');

  const report = `# PRD Readiness Report
Generated: ${now}
Score: ${result.total} / 10 — ${result.verdict}

## Summary
${result.summary}

## Critical Gaps
${gaps}

## Dimension Scores
| Dimension | Score | Finding | Recommended Fix |
|-----------|-------|---------|-----------------|
${dimRows}

## Recommended Next Steps
${nextSteps(result.verdict)}
`;

  const blob = new Blob([report], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'prd-readiness-report.md';
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [file, setFile] = useState(null);
  const [prdText, setPrdText] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const requiresToken = process.env.NEXT_PUBLIC_REQUIRE_ACCESS_TOKEN === 'true';
  const fileInputRef = useRef(null);
  const pdfLib = useRef(null);
  const mammothLib = useRef(null);

  // Load pdf.js lazily
  const loadPdf = useCallback(() => {
    return new Promise((resolve) => {
      if (pdfLib.current) return resolve(pdfLib.current);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfLib.current = window.pdfjsLib;
        resolve(pdfLib.current);
      };
      document.head.appendChild(script);
    });
  }, []);

  // Load mammoth lazily
  const loadMammoth = useCallback(() => {
    return new Promise((resolve) => {
      if (mammothLib.current) return resolve(mammothLib.current);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
      script.onload = () => {
        mammothLib.current = window.mammoth;
        resolve(mammothLib.current);
      };
      document.head.appendChild(script);
    });
  }, []);

  async function parseFile(f) {
    const ext = f.name.split('.').pop().toLowerCase();

    if (ext === 'md' || ext === 'txt') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(f);
      });
    }

    if (ext === 'pdf') {
      const pdfjsLib = await loadPdf();
      const arrayBuffer = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
      }
      return text;
    }

    if (ext === 'docx') {
      const mammoth = await loadMammoth();
      const arrayBuffer = await f.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }

    throw new Error('Unsupported file type. Please upload a .md, .txt, .pdf, or .docx file.');
  }

  async function handleFile(f) {
    setError('');
    setResult(null);
    try {
      const text = await parseFile(f);
      setFile(f);
      setPrdText(text);
    } catch (err) {
      setError(err.message || 'Could not read file.');
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleInputChange(e) {
    const f = e.target.files[0];
    if (f) handleFile(f);
  }

  function reset() {
    setFile(null);
    setPrdText('');
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function score() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdText, accessToken: requiresToken ? accessToken : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Scoring failed. Please try again.');
        return;
      }
      setResult(data);
    } catch (err) {
      setError('Could not reach the scoring service. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const charCount = prdText.length;
  const overLimit = charCount > 50000;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${COLORS.border}`, background: '#fff', padding: '20px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>AI Feature PRD Scorer</h1>
              <p style={{ color: COLORS.muted, marginTop: 4, fontSize: 14 }}>
                Upload your draft. Get a score. Ship with confidence.
              </p>
            </div>
            <a
              href="/AI-FEATURE-PRD-TEMPLATE.md"
              download="AI-FEATURE-PRD-TEMPLATE.md"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: COLORS.blue,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                marginTop: 4,
              }}
            >
              Download template ↓
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, padding: '32px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          {/* Access code */}
          {!result && requiresToken && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Access code
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter access code to use the scorer"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Upload zone */}
          {!result && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !file && fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? '#111827' : COLORS.border}`,
                  borderRadius: 12,
                  padding: '40px 24px',
                  textAlign: 'center',
                  background: dragOver ? '#F3F4F6' : '#fff',
                  cursor: file ? 'default' : 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt,.pdf,.docx"
                  style={{ display: 'none' }}
                  onChange={handleInputChange}
                />

                {!file ? (
                  <>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                    <p style={{ fontWeight: 600, marginBottom: 6 }}>Drag and drop your PRD here</p>
                    <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>
                      Supports .md, .txt, .pdf, .docx
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      style={btnOutline}
                    >
                      Browse files
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 600, marginBottom: 4 }}>{file.name}</p>
                        <p style={{ fontSize: 13, color: overLimit ? COLORS.failRed : COLORS.muted }}>
                          {charCount.toLocaleString()} characters
                          {overLimit && ' — exceeds 50,000 character limit'}
                        </p>
                      </div>
                      <button onClick={reset} style={btnOutline}>Clear</button>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p style={{ marginTop: 12, color: COLORS.failRed, fontSize: 13 }}>{error}</p>
              )}

              <div style={{ marginTop: 16 }}>
                <button
                  onClick={score}
                  disabled={!file || overLimit || loading || (requiresToken && !accessToken.trim())}
                  style={{
                    ...btnPrimary,
                    opacity: (!file || overLimit || loading || (requiresToken && !accessToken.trim())) ? 0.5 : 1,
                    cursor: (!file || overLimit || loading || (requiresToken && !accessToken.trim())) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {loading && <Spinner />}
                  {loading ? 'Evaluating…' : 'Score my PRD'}
                </button>
              </div>
            </>
          )}

          {/* Results */}
          {result && (
            <div>
              {/* Score header */}
              <div style={{
                background: '#fff',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: '28px 28px 24px',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{
                    fontSize: 48,
                    fontWeight: 800,
                    color: scoreColor(result.total),
                    lineHeight: 1,
                  }}>
                    {result.total} <span style={{ fontSize: 24, color: COLORS.muted, fontWeight: 500 }}>/ 10</span>
                  </div>
                  <span style={{
                    ...verdictStyle(result.verdict),
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 13,
                  }}>
                    {result.verdict}
                  </span>
                </div>

                <p style={{ marginTop: 16, color: '#374151', lineHeight: 1.7 }}>{result.summary}</p>

                {result.top_gaps?.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: COLORS.muted, marginBottom: 8 }}>
                      Critical gaps
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {result.top_gaps.map((gap, i) => (
                        <span key={i} style={{
                          background: COLORS.amberBg,
                          color: COLORS.amber,
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: 500,
                        }}>
                          {gap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dimensions */}
              <div style={{
                background: '#fff',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                overflow: 'hidden',
                marginBottom: 20,
              }}>
                {result.dimensions.map((dim, i) => (
                  <div key={dim.id} style={{
                    padding: '16px 20px',
                    borderBottom: i < result.dimensions.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{
                        fontSize: 16,
                        flexShrink: 0,
                        marginTop: 1,
                        color: dim.score === 1 ? COLORS.passGreen : COLORS.failRed,
                      }}>
                        {dim.score === 1 ? '✓' : '✗'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{dim.name}</span>
                          <span style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: dim.score === 1 ? COLORS.passGreen : COLORS.failRed,
                            flexShrink: 0,
                          }}>
                            {dim.score}/1
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: COLORS.muted, marginTop: 3 }}>{dim.finding}</p>
                        {dim.score === 0 && dim.fix && dim.fix !== 'null' && (
                          <div style={{
                            marginTop: 8,
                            background: COLORS.amberBg,
                            borderRadius: 6,
                            padding: '8px 12px',
                            fontSize: 13,
                            color: '#92400E',
                          }}>
                            <strong>Fix:</strong> {dim.fix}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={() => downloadReport(result)} style={btnPrimary}>
                  Download report
                </button>
                <button onClick={reset} style={btnOutline}>
                  Score again
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${COLORS.border}`,
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: 13,
        color: COLORS.muted,
      }}>
        Built by Amit Gambhir ·{' '}
        <a href="https://github.com/amitgambhir" target="_blank" rel="noopener noreferrer">
          github.com/amitgambhir
        </a>
        {' '}· This tool calls the Anthropic API server-side. Your document is never stored.
      </footer>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 14,
      height: 14,
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

const btnPrimary = {
  background: '#111827',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 20px',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const btnOutline = {
  background: '#fff',
  color: '#111827',
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: '8px 16px',
  fontWeight: 500,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
