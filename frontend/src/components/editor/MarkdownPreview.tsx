import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let inBlockquote = false;
  let inUl = false;
  let inOl = false;

  const flushList = () => {
    if (inUl) { html.push('</ul>'); inUl = false; }
    if (inOl) { html.push('</ol>'); inOl = false; }
  };
  const flushBlockquote = () => {
    if (inBlockquote) { html.push('</blockquote>'); inBlockquote = false; }
  };

  const inlineRender = (text: string): string => {
    // wikilinks [[title]]
    text = text.replace(/\[\[([^\]]+)\]\]/g, '<span class="md-wikilink">[[$1]]</span>');
    // bold + italic ***
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    // strikethrough
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
    // inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // checkbox
    text = text.replace(/^\s*\[ \]\s/, '<input type="checkbox" disabled class="md-checkbox" /> ');
    text = text.replace(/^\s*\[x\]\s/i, '<input type="checkbox" disabled checked class="md-checkbox" /> ');
    return text;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block fence
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        flushList(); flushBlockquote();
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        inCodeBlock = false;
        const escaped = codeLines.map(escapeHtml).join('\n');
        html.push(`<pre><code${codeLang ? ` class="language-${codeLang}"` : ''}>${escaped}</code></pre>`);
      }
      continue;
    }

    if (inCodeBlock) { codeLines.push(line); continue; }

    // Horizontal rule
    if (/^---+$|^\*\*\*+$/.test(line.trim())) {
      flushList(); flushBlockquote();
      html.push('<hr />');
      continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      flushList(); flushBlockquote();
      const level = hMatch[1].length;
      html.push(`<h${level}>${inlineRender(escapeHtml(hMatch[2]))}</h${level}>`);
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      if (!inBlockquote) { html.push('<blockquote>'); inBlockquote = true; }
      html.push(`<p>${inlineRender(escapeHtml(line.slice(2)))}</p>`);
      continue;
    } else if (inBlockquote && line.trim() === '') {
      flushBlockquote();
    } else {
      flushBlockquote();
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[*\-+]\s+(.+)/);
    if (ulMatch) {
      if (!inUl) { html.push('<ul>'); inUl = true; }
      html.push(`<li>${inlineRender(escapeHtml(ulMatch[2]))}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (!inOl) { html.push('<ol>'); inOl = true; }
      html.push(`<li>${inlineRender(escapeHtml(olMatch[1]))}</li>`);
      continue;
    }

    // Flush lists on blank or normal line
    if (!ulMatch && !olMatch) flushList();

    // Blank line
    if (line.trim() === '') {
      html.push('<br />');
      continue;
    }

    // Paragraph / normal line
    html.push(`<p>${inlineRender(escapeHtml(line))}</p>`);
  }

  if (inCodeBlock) {
    html.push(`<pre><code>${codeLines.map(escapeHtml).join('\n')}</code></pre>`);
  }
  flushList();
  flushBlockquote();

  return html.join('\n');
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className={cn('md-preview prose-sm max-w-none overflow-y-auto', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
