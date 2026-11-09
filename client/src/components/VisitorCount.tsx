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
    <p className={`text-sm ${className}`} data-testid="visitor-count">
      {visitors.toLocaleString("en-IN")} {visitors === 1 ? "visitor" : "visitors"}
    </p>
  );
}
