import { useEffect, useState } from "react";
import api from "../utils/api";

export default function VisitorCount() {
  const [visitors, setVisitors] = useState<number | null>(null);

  useEffect(() => {
    api
      .post("/visits")
      .then((res) => setVisitors(res.data.visitors))
      .catch(() => setVisitors(null));
  }, []);

  if (visitors === null) return null;

  return (
    <p className="mt-3 text-sm text-slate-600" data-testid="visitor-count">
      {visitors.toLocaleString("en-IN")} {visitors === 1 ? "visitor" : "visitors"}
    </p>
  );
}
