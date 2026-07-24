import React from 'react';

const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

function renderLine(line) {
  const parts = line.split(EMAIL_RE);
  return parts.map((part, i) =>
    EMAIL_RE.test(part) ? <a key={i} href={`mailto:${part}`} className="text-gold hover:underline">{part}</a> : part
  );
}

export default function OnboardingInfoView({ text }) {
  if (!text || !text.trim()) return null;
  const blocks = text.split(/\n\s*\n/);

  return (
    <div className="space-y-4 text-sm text-ink/80 leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim() !== '');
        const isList = lines.length > 0 && lines.every((l) => l.trim().startsWith('* '));
        if (isList) {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {lines.map((l, j) => <li key={j}>{renderLine(l.replace(/^\*\s*/, ''))}</li>)}
            </ul>
          );
        }
        if (lines.length === 1 && lines[0].length < 60 && !lines[0].includes('.')) {
          return <h4 key={i} className="font-display font-semibold text-ink">{lines[0]}</h4>;
        }
        return <p key={i}>{lines.map((l, j) => <React.Fragment key={j}>{renderLine(l)}{j < lines.length - 1 && <br />}</React.Fragment>)}</p>;
      })}
    </div>
  );
}
