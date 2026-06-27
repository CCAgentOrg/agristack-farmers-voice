import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Star, Quote } from "lucide-react";
import { Link } from "react-router-dom";

const DATA_URL = "/agristack-apps.json";
const MIN_REVIEW_LENGTH = 20;
const ROTATE_INTERVAL_MS = 12000;
const TRANSITION_DURATION = 600;
const theme = { bg: "#10100f", fg: "#f5f1e8", card: "rgba(28,26,22,0.82)", muted: "#aaa39a", accent: "#d8a657" };

function detectScript(text) {
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn";
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml";
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu";
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa";
  return "en";
}

const SCRIPT_LABELS = { en: "English", hi: "हिन्दी", ta: "தமிழ்", te: "తెలుగు", kn: "ಕನ್ನಡ", ml: "മലയാളം", gu: "ગુજરાતી", bn: "বাংলা", pa: "ਪੰਜਾਬੀ" };

function buildCommentPool(apps) {
  const all = [];
  for (const app of apps) {
    if (!app.reviews?.length) continue;
    for (const r of app.reviews) {
      const text = (r.text || "").trim();
      if (text.length < MIN_REVIEW_LENGTH) continue;
      const lang = detectScript(text);
      const score = Math.log(text.length + 1) * 50
        + (r.score === 1 ? 5 : r.score === 2 ? 12 : r.score === 3 ? 15 : r.score === 4 ? 10 : 3)
        + (lang === "en" ? 3 : 18);
      all.push({
        appId: app.appId, appName: app.name || app.appId, appState: app.state || "",
        appCategory: app.category, appIcon: app.icon, userName: r.userName || "Anonymous",
        date: r.date, score: r.score, text, lang, langLabel: SCRIPT_LABELS[lang] || lang, rankingScore: score
      });
    }
  }
  all.sort((a, b) => b.rankingScore - a.rankingScore);
  return all;
}

function ReviewCard({ review, fade, onPrev, onNext, onPause, paused, total, idx, onShuffle }) {
  const stars = Math.round(review.score);
  const dateStr = review.date ? new Date(review.date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "";
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8"
      style={{
        background: `radial-gradient(ellipse at 50% 30%, rgba(214,166,87,0.04) 0%, transparent 60%), ${theme.bg}`,
        opacity: fade ? 0 : 1, transition: `opacity ${TRANSITION_DURATION}ms ease-in-out`, color: theme.fg
      }}>
      <div className="w-full max-w-3xl flex items-center justify-between mb-8">
        <Link to="/dashboard" className="text-xs hover:underline" style={{ color: theme.muted }}>← App Dashboard</Link>
        <span className="text-xs font-mono" style={{ color: theme.muted }}>{idx + 1} / {total}</span>
      </div>

      <div className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-xs"
        style={{ background: theme.card, border: "1px solid rgba(255,255,255,0.06)" }}>
        {review.appIcon && <img src={review.appIcon} alt="" className="w-5 h-5 rounded" onError={e => e.target.style.display = "none"} />}
        <span className="font-medium">{review.appName}</span>
        {review.appState && <span style={{ color: theme.muted }}>· {review.appState}</span>}
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{ background: "rgba(255,255,255,0.06)", color: theme.muted }}>{review.langLabel}</span>
      </div>

      <div className="flex gap-1 mb-4">
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={18} className={s <= stars ? "fill-yellow-400 text-yellow-400" : "text-zinc-600"} />
        ))}
      </div>

      <Quote size={24} className="mb-4 opacity-30" style={{ color: theme.accent }} />

      <div className="max-w-2xl w-full">
        <p className="text-lg md:text-xl leading-relaxed text-center font-light tracking-wide"
          style={{ color: theme.fg, textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>{review.text}</p>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm font-medium">— {review.userName}</p>
        {dateStr && <p className="text-xs mt-0.5" style={{ color: theme.muted }}>{dateStr}</p>}
      </div>

      <div className="mt-10 flex items-center gap-4">
        <button onClick={onPrev} className="p-2 rounded-full transition-all hover:scale-110" style={{ background: theme.card }}>
          <SkipBack size={20} style={{ color: theme.muted }} />
        </button>
        <button onClick={onPause} className="p-3 rounded-full transition-all hover:scale-110"
          style={{ background: theme.accent, color: "#10100f" }}>
          {paused ? <Play size={24} /> : <Pause size={24} />}
        </button>
        <button onClick={onNext} className="p-2 rounded-full transition-all hover:scale-110" style={{ background: theme.card }}>
          <SkipForward size={20} style={{ color: theme.muted }} />
        </button>
        <button onClick={onShuffle} className="p-2 rounded-full transition-all hover:scale-110 ml-2" style={{ background: theme.card }}>
          <Shuffle size={16} style={{ color: theme.muted }} />
        </button>
      </div>
    </div>
  );
}

export default function Reviews() {
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fade, setFade] = useState(false);
  const timerRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const poolRef = useRef([]);

  // Start the auto-rotation interval
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (paused || poolRef.current.length === 0) return;
    timerRef.current = setInterval(() => rotate(1), ROTATE_INTERVAL_MS);
  }, [paused]);

  useEffect(() => {
    fetch(DATA_URL)
      .then(r => r.json())
      .then(data => {
        const p = buildCommentPool(data);
        setPool(p);
        poolRef.current = p;
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Start timer whenever paused or pool changes
  useEffect(() => {
    startTimer();
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, pool.length, startTimer]);

  const advance = useCallback((dir = 1) => {
    setCurrentIdx(prev => {
      const p = poolRef.current;
      if (p.length === 0) return prev;
      if (dir === 1) return (prev + 1) % p.length;
      return (prev - 1 + p.length) % p.length;
    });
  }, []);

  const rotate = useCallback((dir = 1) => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setFade(true);
    // Reset the auto-timer on manual navigation
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => rotate(1), ROTATE_INTERVAL_MS);
    }
    fadeTimerRef.current = setTimeout(() => {
      advance(dir);
      setFade(false);
      fadeTimerRef.current = null;
    }, TRANSITION_DURATION);
  }, [advance]);

  const shuffle = useCallback(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setFade(true);
    // Reset the auto-timer on manual shuffle
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => rotate(1), ROTATE_INTERVAL_MS);
    }
    fadeTimerRef.current = setTimeout(() => {
      setCurrentIdx(Math.floor(Math.random() * poolRef.current.length));
      setFade(false);
      fadeTimerRef.current = null;
    }, TRANSITION_DURATION);
  }, []);

  const togglePause = useCallback(() => setPaused(p => !p), []);

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: theme.bg, color: theme.muted }}>
      <div className="animate-pulse text-lg">Loading farmer voices...</div>
    </main>
  );

  const review = pool[currentIdx];
  if (!review) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: theme.bg, color: theme.muted }}>
      <div className="text-center">
        <p className="text-lg">No quality reviews found.</p>
        <p className="text-xs mt-2">Try checking back later.</p>
      </div>
    </main>
  );

  return (
    <ReviewCard
      review={review} fade={fade}
      onPrev={() => rotate(-1)} onNext={() => rotate(1)}
      onPause={togglePause} paused={paused}
      total={pool.length} idx={currentIdx} onShuffle={shuffle}
    />
  );
}
