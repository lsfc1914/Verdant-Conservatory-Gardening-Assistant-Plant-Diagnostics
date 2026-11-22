import React from 'react';

interface MarkdownProseProps {
  content: string;
  className?: string;
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[#ECF2EF]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="font-mono text-[0.85em] px-1.5 py-0.5 rounded bg-[#0A0F0D] border border-[#22312B] text-emerald-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-[#D4E0DA]">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function MarkdownProse({ content, className = '' }: MarkdownProseProps) {
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listOrdered = false;

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0) return;
    if (listOrdered) {
      blocks.push(
        <ol
          key={`${keyPrefix}-ol`}
          className="list-decimal list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-[#D2DDD7]"
        >
          {listItems.map((item, i) => (
            <li key={i}>{renderInlineFormatting(item)}</li>
          ))}
        </ol>
      );
    } else {
      blocks.push(
        <ul
          key={`${keyPrefix}-ul`}
          className="list-disc list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-[#D2DDD7]"
        >
          {listItems.map((item, i) => (
            <li key={i}>{renderInlineFormatting(item)}</li>
          ))}
        </ul>
      );
    }
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(`b-${index}`);
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushList(`b-${index}`);
      blocks.push(
        <h4
          key={`h-${index}`}
          className="text-sm font-semibold text-[#ECF2EF] pt-2 first:pt-0"
        >
          {renderInlineFormatting(headingMatch[2])}
        </h4>
      );
      return;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (listItems.length > 0 && listOrdered) {
        flushList(`b-${index}`);
      }
      listOrdered = false;
      listItems.push(bulletMatch[1]);
      return;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      if (listItems.length > 0 && !listOrdered) {
        flushList(`b-${index}`);
      }
      listOrdered = true;
      listItems.push(orderedMatch[1]);
      return;
    }

    flushList(`b-${index}`);
    blocks.push(
      <p key={`p-${index}`} className="text-sm leading-relaxed text-[#D2DDD7]">
        {renderInlineFormatting(line)}
      </p>
    );
  });

  flushList('end');

  return <div className={`space-y-2.5 ${className}`}>{blocks}</div>;
}
