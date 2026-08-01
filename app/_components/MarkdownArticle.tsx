import type { ReactNode } from "react";

function inline(text: string): ReactNode {
  const pieces = text.split(/(\*\*[^*]+\*\*)/g);
  return pieces.map((piece, index) => {
    if (piece.startsWith("**") && piece.endsWith("**")) {
      return <strong key={index}>{piece.slice(2, -2)}</strong>;
    }
    return piece;
  });
}

export function MarkdownArticle({ content }: { content: string }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const nodes: ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (!list.length) return;
    nodes.push(
      <ul key={`list-${nodes.length}`}>
        {list.map((item, index) => <li key={index}>{inline(item)}</li>)}
      </ul>,
    );
    list = [];
  };

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      return;
    }
    flushList();
    if (!line) return;
    if (line.startsWith("### ")) {
      nodes.push(<h3 key={index}>{inline(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      nodes.push(<h2 key={index}>{inline(line.slice(3))}</h2>);
    } else {
      nodes.push(<p key={index}>{inline(line)}</p>);
    }
  });
  flushList();

  return <div className="article-content">{nodes}</div>;
}
