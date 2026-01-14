import { saveAs } from "file-saver";

interface ExportOptions {
  filename?: string;
}

export async function exportToPdf(content: string, options: ExportOptions = {}) {
  // Dynamic import to handle SSR 
  const html2pdf = (await import("html2pdf.js")).default;
  
  const element = document.createElement("div");
  element.className = "pdf-export-container";
  // Add some styling for the PDF
  element.style.padding = "40px";
  element.style.fontFamily = "Arial, sans-serif";
  element.style.color = "#000000";
  element.style.background = "#ffffff";
  element.style.fontSize = "12pt";
  element.style.lineHeight = "1.6";

  // Convert newlines to breaks for HTML rendering relative to plain text
  // or wrap in pre-wrap. Better to use pre-wrap div for fidelity.
  const contentDiv = document.createElement("div");
  contentDiv.style.whiteSpace = "pre-wrap";
  contentDiv.textContent = content; // Safe text insertion
  
  // Add a Header
  const header = document.createElement("h1");
  header.textContent = "Report";
  header.style.marginBottom = "20px";
  header.style.fontSize = "24px";
  header.style.borderBottom = "2px solid #333";
  header.style.paddingBottom = "10px";
  
  element.appendChild(header);
  element.appendChild(contentDiv);

  // Footer removed per user request

  const opt = {
    margin: 10,
    filename: options.filename || 'report.pdf',
    image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      // Ignore global stylesheets to prevent 'oklch' parsing errors and ensure clean export
      ignoreElements: (element: Element) => {
        return element.tagName === 'STYLE' || element.tagName === 'LINK'; 
      }
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
}

export function exportToWord(content: string, options: ExportOptions = {}) {
  const filename = options.filename || 'report.doc';
  
  // Create a proper HTML document structure that Word understands
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
                        xmlns:w='urn:schemas-microsoft-com:office:word' 
                        xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <title>Export HTML to Word Document with JavaScript</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; }
      h1 { font-size: 18pt; margin-bottom: 20px; }
      .content { font-family: Arial, sans-serif; } 
    </style>
  </head><body>
  <div class="content">`;
  
  const footer = "</div></body></html>";
  
  // Safe HTML encoding for the content and replacing newlines with <br/> for Word compatibility
  const safeContent = content.replace(/&/g, "&amp;")
                             .replace(/</g, "&lt;")
                             .replace(/>/g, "&gt;")
                             .replace(/\n/g, "<br/>");

  const sourceHTML = header + `<h1>Report</h1><br/>` + safeContent + footer;
  
  const blob = new Blob(['\ufeff', sourceHTML], {
    type: 'application/msword'
  });
  
  saveAs(blob, filename);
}
