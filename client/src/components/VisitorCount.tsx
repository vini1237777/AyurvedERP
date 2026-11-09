import { useEffect, useState } from "react";
import api from "../utils/api";

export default function VisitorCount({ className = "" }: { className?: string }) {
  const [visitors, setVisitors] = useState<number | null>(null);

  useEffect(() => {
    api
      .post("/visits")
      .then((res) => setVisitors(res.data.visitors))
      .catch(() => setVisitors(null));
  }, []);

  if (visitors === null) return null;

  return (
    <p
      className={`flex items-center gap-2 whitespace-nowrap ${className}`}
      data-testid="visitor-count"
    >
      <span className="text-sm text-ink">Profile visits</span>
      <span className="ledger-total px-1.5 text-base font-bold leading-tight tabular-nums text-ink">
        {visitors.toLocaleString("en-IN")}
      </span>
    </p>
  );
}
