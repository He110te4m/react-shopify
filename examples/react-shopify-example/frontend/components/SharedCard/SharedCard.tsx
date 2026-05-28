import { useState, useCallback } from "react";
import "./SharedCard.css";

interface SharedCardProps {
  title: string;
  accentColor?: string;
  children: React.ReactNode;
}

export default function SharedCard({ title, accentColor = "#6c63ff", children }: SharedCardProps) {
  const [expanded, setExpanded] = useState(true);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <div className={`SharedCard-card${expanded ? " SharedCard-card--expanded" : ""}`}>
      <div
        className="SharedCard-accentLine"
        style={{ backgroundColor: accentColor }}
      />
      <div className="SharedCard-cardHeader" onClick={toggle}>
        <h3 className="SharedCard-cardTitle">{title}</h3>
        <button
          type="button"
          className="SharedCard-cardToggle"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>
      {expanded && <div className="SharedCard-cardBody">{children}</div>}
    </div>
  );
}
