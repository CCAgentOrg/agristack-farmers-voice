import { useState, useEffect, useMemo } from "react";
import { Search, ArrowUpDown, Star, Smartphone, Download, MessageSquare, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import React from "react";

const DATA_URL = "/agristack-apps.json";

const CATEGORY_COLORS = {
  "farmer-registry": { bg: "rgba(59,130,246,0.15)", text: "#93c5fd", label: "Farmer Registry" },
  "operator": { bg: "rgba(168,85,247,0.15)", text: "#c4a4f7", label: "Operator" },
  "dcs": { bg: "rgba(34,197,94,0.15)", text: "#86efac", label: "Crop Survey" },
  "platform": { bg: "rgba(249,115,22,0.15)", text: "#fdba74", label: "Platform" },
  "adjacent": { bg: "rgba(234,179,8,0.15)", text: "#fde68a", label: "Adjacent" },
};

const CATEGORY_LABELS = {
  "farmer-registry": "Farmer Registry",
  "operator": "Operator",
  "dcs": "Digital Crop Survey",
  "platform": "Platform",
  "adjacent": "Legacy / Adjacent"
};

function formatInstalls(n) {
  if (!n || n === 0) return "—";
  if (n >= 10000000) return (n/10000000).toFixed(1) + " Cr";
  if (n >= 100000) return (n/100000).toFixed(1) + " L";
  if (n >= 1000) return (n/1000).toFixed(0) + "K";
  return n.toString();
}

function ScoreBar({ score }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={12} className={s <= Math.round(score) ? "fill-yellow-400 text-yellow-400" : "text-zinc-600"} />
        ))}
      </div>
      <span className="text-xs font-mono tabular-nums">{score.toFixed(1)}</span>
    </div>
  );
}

const theme = {
  bg: "#10100f", fg: "#f5f1e8", card: "rgba(28, 26, 22, 0.82)", muted: "#aaa39a", accent: "#d8a657",
};

export default function Dashboard() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("installs");
  const [sortDir, setSortDir] = useState("desc");
  const [catFilter, setCatFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    fetch(DATA_URL)
      .then(r => r.json())
      .then(d => { setApps(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let f = [...apps];
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.state?.toLowerCase().includes(q) ||
        a.appId?.toLowerCase().includes(q)
      );
    }
    if (catFilter !== "all") f = f.filter(a => a.category === catFilter);
    f.sort((a, b) => {
      const getVal = (a) => {
        switch (sortKey) {
          case "name": return a.name || "";
          case "installs": return a.maxInstalls || a.minInstalls || 0;
          case "score": return a.score || 0;
          case "reviews": return (a.reviews?.length || 0);
          case "state": return a.state || "";
          default: return 0;
        }
      };
      const va = getVal(a), vb = getVal(b);
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return f;
  }, [apps, search, sortKey, sortDir, catFilter]);

  const categories = useMemo(() => {
    const c = new Set(apps.map(a => a.category).filter(Boolean));
    return ["all", ...c];
  }, [apps]);

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalInstalls = useMemo(() => apps.reduce((s, a) => s + (a.maxInstalls || 0), 0), [apps]);
  const totalReviews = useMemo(() => apps.reduce((s, a) => s + (a.reviews?.length || 0), 0), [apps]);

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: theme.bg, color: theme.fg }}>
      <div className="animate-pulse flex items-center gap-3 text-lg">Loading...</div>
    </main>
  );

  return (
    <main className="min-h-screen" style={{ background: theme.bg, color: theme.fg }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Smartphone className="inline" size={28} style={{ color: theme.accent }} />
            AgriStack App Directory
          </h1>
          <p className="mt-1 flex items-center gap-3" style={{ color: theme.muted }}>
            <span>{apps.length} apps · {totalInstalls >= 10000000 ? (totalInstalls/10000000).toFixed(1) + " Cr+" : (totalInstalls/100000).toFixed(1) + " L+"} combined installs · {totalReviews.toLocaleString()} play store reviews</span>
            <Link to="/reviews" className="text-xs hover:underline px-3 py-1 rounded-full" style={{ background: theme.card, color: theme.accent, border: "1px solid rgba(255,255,255,0.06)" }}>
              See what farmers say →
            </Link>
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.muted }} />
            <input type="text" placeholder="Search apps, states..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none border"
              style={{ background: theme.card, borderColor: "rgba(255,255,255,0.08)", color: theme.fg }} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: c === catFilter ? theme.accent : theme.card, color: c === catFilter ? "#10100f" : theme.muted, border: "1px solid rgba(255,255,255,0.06)" }}>
                {c === "all" ? "All" : (CATEGORY_LABELS[c] || c)}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  {[
                    { key: "name", label: "App" },
                    { key: "state", label: "State" },
                    { key: null, label: "Category" },
                    { key: "installs", label: "Installs", icon: Download },
                    { key: "score", label: "Rating" },
                    { key: "reviews", label: "Reviews", icon: MessageSquare },
                    { key: null, label: "Encrypted" },
                  ].map(col => (
                    <th key={col.label}
                      className={`${col.key ? "cursor-pointer select-none" : ""} text-left px-3 py-3 font-medium`}
                      onClick={() => col.key && toggleSort(col.key)}>
                      <span className="flex items-center gap-1 text-xs uppercase tracking-wider" style={{ color: theme.muted }}>
                        {col.icon && <col.icon size={12} />} {col.label} {col.key && <ArrowUpDown size={12} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => {
                  const catColor = CATEGORY_COLORS[app.category] || { bg: theme.card, text: theme.muted, label: app.category || "?" };
                  const reviewCount = app.reviews?.length || 0;
                  const encLabel = app.dataEncrypted === false ? "❌" : app.dataEncrypted === true ? "✅" : app.category === "adjacent" ? "" : "—";
                  return (
                    <React.Fragment key={app.appId}>
                      <tr onClick={() => toggleRow(app.appId)}
                        className="cursor-pointer transition-all hover:opacity-90 border-t"
                        style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {app.icon && <img src={app.icon} alt="" className="w-8 h-8 rounded-lg" onError={e => e.target.style.display = "none"} />}
                            <div>
                              <div className="font-medium text-sm">{app.name || app.appId?.split(".").pop()}</div>
                              <div className="text-xs font-mono" style={{ color: theme.muted }}>{app.appId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs">{app.state || "—"}</td>
                        <td className="px-3 py-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium"
                            style={{ background: catColor.bg, color: catColor.text }}>{catColor.label}</span>
                        </td>
                        <td className="px-3 py-3 font-mono tabular-nums text-xs">{formatInstalls(app.maxInstalls || app.minInstalls)}</td>
                        <td className="px-3 py-3"><ScoreBar score={app.score || 0} /></td>
                        <td className="px-3 py-3 font-mono tabular-nums text-xs">{reviewCount.toLocaleString()}</td>
                        <td className="px-3 py-3 text-xs text-center">{encLabel}</td>
                      </tr>
                      {expandedRows.has(app.appId) && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4" style={{ background: "rgba(255,255,255,0.02)" }}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <span className="block uppercase tracking-wider text-[10px] mb-1" style={{ color: theme.muted }}>Developer</span>
                                <span>{app.developerEmail || app.developerName || "—"}</span>
                              </div>
                              <div>
                                <span className="block uppercase tracking-wider text-[10px] mb-1" style={{ color: theme.muted }}>Updated</span>
                                <span>{app.updated ? new Date(app.updated).toLocaleDateString("en-IN") : "—"}</span>
                              </div>
                              <div>
                                <span className="block uppercase tracking-wider text-[10px] mb-1" style={{ color: theme.muted }}>Version</span>
                                <span>{app.version || "—"}</span>
                              </div>
                              <div>
                                <span className="block uppercase tracking-wider text-[10px] mb-1" style={{ color: theme.muted }}>Content Rating</span>
                                <span>{app.contentRating || "—"}</span>
                              </div>
                              <div className="col-span-2 md:col-span-4 flex gap-4">
                                {app.url && (
                                  <a href={app.url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:underline" style={{ color: theme.accent }}>
                                    <ExternalLink size={12} /> Play Store
                                  </a>
                                )}
                                {app.privacyPolicy && (
                                  <a href={app.privacyPolicy} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:underline" style={{ color: theme.accent }}>
                                    <ExternalLink size={12} /> Privacy Policy
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: theme.muted }}>
              <p className="text-lg">No apps match your search.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
