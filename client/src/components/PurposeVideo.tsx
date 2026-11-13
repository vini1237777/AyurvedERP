import { useRef, useState } from "react";

// Start time of each part of the overview video, in seconds.
const PARTS = [
  { label: "Problem", at: 0 },
  { label: "What it does", at: 4.6 },
  { label: "How it works", at: 9.4 },
  { label: "Result", at: 14.6 },
];

// A 19 second overview of what Aushadhi is for. Loads nothing until it plays.
export default function PurposeVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [part, setPart] = useState(0);
  const [failed, setFailed] = useState(false);

  function play(at?: number) {
    const v = video.current;
    if (!v) return;
    if (at !== undefined) {
      if (v.readyState >= 1) v.currentTime = at;
      else
        v.addEventListener("loadedmetadata", () => (v.currentTime = at), {
          once: true,
        });
    }
    v.play().catch(() => setPlaying(false));
  }

  function toggle() {
    const v = video.current;
    if (!v) return;
    if (v.paused) play();
    else v.pause();
  }

  function onTime() {
    const t = video.current?.currentTime ?? 0;
    let current = 0;
    PARTS.forEach((p, i) => {
      if (t >= p.at - 0.05) current = i;
    });
    setPart(current);
  }

  return (
    <div>
      <div className="relative aspect-[16/10] border-[1.5px] border-ink bg-white">
        <video
          ref={video}
          className="block w-full h-full"
          src="/videos/aushadhi-purpose.mp4"
          poster="/videos/aushadhi-purpose.jpg"
          preload="none"
          muted
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setFailed(true)}
          onTimeUpdate={onTime}
          onSeeked={onTime}
          aria-label="Overview of Aushadhi: the problem, what it does, how it works and the result"
        />
        {failed ? (
          <p
            role="status"
            className="absolute inset-x-0 bottom-0 bg-paper px-3 py-2 text-center text-sm border-t-[1.5px] border-ink"
          >
            The overview could not load right now. Open a demo account instead.
          </p>
        ) : (
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause the overview" : "Play the overview"}
            className="group absolute inset-0 grid place-items-center focus-visible:outline-none"
          >
            <span
              className={`grid place-items-center w-14 h-14 bg-ink text-white transition-opacity group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ink ${
                playing
                  ? "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                  : ""
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                {playing ? (
                  <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
                ) : (
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {PARTS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            onClick={() => play(p.at)}
            aria-current={i === part ? "step" : undefined}
            className={`min-h-[36px] px-3 text-sm border-[1.5px] border-ink transition-colors ${
              i === part ? "bg-ink text-white font-semibold" : "hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
