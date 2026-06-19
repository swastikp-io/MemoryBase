import React, { useState } from 'react';
import { Download, FileText, File, FileDown, Loader2, AlertCircle } from 'lucide-react';
import { saveAs } from 'file-saver';
import { exportToDocx } from '../../utils/docxExport';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Alert, AlertDescription } from '../ui/alert';

interface ReportExportProps {
  content: string;
  title?: string;
  sources?: any[];
  isGenerating?: boolean;
}

export const ReportExport: React.FC<ReportExportProps> = ({ content, title = "Deep_Research_Report", sources = [], isGenerating = false }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Create a clean filename
  const dateStr = new Date().toISOString().split('T')[0];
  const safeTitle = `${(title || "research-report").replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${dateStr}`;

  const appendSourcesToMarkdown = (md: string) => {
    if (!sources || sources.length === 0) return md;
    let appended = md + "\n\n### References\n\n";
    sources.forEach((s, i) => {
      appended += `${i + 1}. [${s.title}](${s.url})\n`;
    });
    return appended;
  };

  const handleDownloadMarkdown = () => {
    try {
      const fullContent = appendSourcesToMarkdown(content);
      const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
      saveAs(blob, `${safeTitle}.md`);
    } catch (e) {
      console.error(e);
      setError("Export failed. Please try again.");
    }
  };

  const handleDownloadDocx = async () => {
    try {
      setIsExporting(true);
      await exportToDocx(content, sources, `${safeTitle}.docx`);
    } catch (e) {
      console.error(e);
      setError("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      const element = document.getElementById('pdf-export-container');
      if (!element) throw new Error("PDF container not found");

      // We dynamically import html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      const opt = {
        margin:       0.75,
        filename:     `${safeTitle}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error("PDF export failed:", e);
      setError("Failed to export PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const isDisabled = isGenerating || isExporting || !content;

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-[var(--border)]">
        <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
          Export Report:
        </span>
        <button 
          onClick={handleDownloadPdf}
          disabled={isDisabled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--surfaceSecondary)] hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed text-text-primary rounded-lg border border-[var(--border)] transition-colors shadow-sm"
        >
          <FileText className="w-4 h-4 text-red-500" /> PDF
        </button>
        <button 
          onClick={handleDownloadDocx}
          disabled={isDisabled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--surfaceSecondary)] hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed text-text-primary rounded-lg border border-[var(--border)] transition-colors shadow-sm"
        >
          <File className="w-4 h-4 text-blue-500" /> DOCX
        </button>
        <button 
          onClick={handleDownloadMarkdown}
          disabled={isDisabled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--surfaceSecondary)] hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed text-text-primary rounded-lg border border-[var(--border)] transition-colors shadow-sm"
        >
          <FileDown className="w-4 h-4 text-gray-500" /> Markdown
        </button>
      </div>

      {/* Hidden print container for PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px', backgroundColor: 'white' }}>
        <div id="pdf-export-container" className="markdown-body" style={{ padding: '40px', color: 'black', background: 'white' }}>
          <h1 style={{ borderBottom: '1px solid #eaecef', paddingBottom: '0.3em' }}>{title || "Research Report"}</h1>
          <p style={{ color: '#6a737d', marginBottom: '2em' }}>Generated on {new Date().toLocaleDateString()}</p>
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
          
          {sources && sources.length > 0 && (
            <>
              <h2 style={{ marginTop: '2em', borderBottom: '1px solid #eaecef', paddingBottom: '0.3em' }}>References</h2>
              <ol style={{ paddingLeft: '2em' }}>
                {sources.map((s, i) => (
                  <li key={i} style={{ marginBottom: '0.5em' }}>
                    <strong>{s.title}</strong><br/>
                    <a href={s.url} style={{ color: '#0366d6', wordBreak: 'break-all' }}>{s.url}</a>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </>
  );
};
