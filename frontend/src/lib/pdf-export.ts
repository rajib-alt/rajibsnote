import jsPDF from 'jspdf';

export async function exportNoteToPDF(note: { title: string; content: string; type: string; tags: string[]; summary?: string; createdAt: string; updatedAt: string }): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("Rajib's Note", margin, 8);
  doc.text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), pageW - margin, 8, { align: 'right' });

  y = 22;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(note.title, contentW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 9 + 4;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const metaStr = [`Type: ${note.type}`, note.tags.length > 0 ? `Tags: ${note.tags.join(', ')}` : null].filter(Boolean).join('   ·   ');
  doc.text(metaStr, margin, y);
  y += 6;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  if (note.summary) {
    doc.setFillColor(239, 246, 255);
    const summaryLines = doc.splitTextToSize(note.summary, contentW - 8);
    const boxH = summaryLines.length * 5 + 8;
    doc.roundedRect(margin, y, contentW, boxH, 2, 2, 'F');
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Summary', margin + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(9);
    doc.text(summaryLines, margin + 4, y + 10);
    y += boxH + 6;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');

  for (const line of note.content.split('\n')) {
    if (y > pageH - margin - 10) { doc.addPage(); y = margin; }
    if (line.startsWith('# ')) {
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      const w = doc.splitTextToSize(line.slice(2), contentW);
      doc.text(w, margin, y); y += w.length * 7 + 2;
      doc.setFontSize(10.5); doc.setFont('helvetica', 'normal');
    } else if (line.startsWith('## ')) {
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      const w = doc.splitTextToSize(line.slice(3), contentW);
      doc.text(w, margin, y); y += w.length * 6 + 2;
      doc.setFontSize(10.5); doc.setFont('helvetica', 'normal');
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const w = doc.splitTextToSize(`• ${line.slice(2)}`, contentW - 6);
      doc.text(w, margin + 4, y); y += w.length * 5.5;
    } else if (line === '' || line === '---') {
      y += 3;
    } else {
      const clean = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1');
      const w = doc.splitTextToSize(clean, contentW);
      doc.text(w, margin, y); y += w.length * 5.5 + 1;
    }
  }

  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' });
    doc.text("Exported from Rajib's Note", margin, pageH - 8);
  }

  doc.save(`${note.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`);
}
