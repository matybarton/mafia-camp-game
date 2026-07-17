import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ===== SUPABASE SETUP =====
// Pozor: Jdi do src/config.js a vyplň tvůj Supabase URL a ANON KEY
import { supabaseUrl, supabaseKey } from './config.js';
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_ADMIN_CODE = "DON-2026";
const TEAMS = {
  mexicka:  { name: "Mexická mafie",  flag: "🇲🇽", code: "MEX-SICARIO", color: "#2E8B57" },
  ceska:    { name: "Česká mafie",    flag: "🇨🇿", code: "CZE-KMOTR",   color: "#4A7FBF" },
  italska:  { name: "Italská mafie",  flag: "🇮🇹", code: "ITA-OMERTA",  color: "#3FA66A" },
  americka: { name: "Americká mafie", flag: "🇺🇸", code: "USA-CAPONE",  color: "#B33A3A" },
  japonska: { name: "Japonská mafie", flag: "🇯🇵", code: "JPN-YAKUZA",  color: "#D8557B" },
  ruska:    { name: "Ruská mafie",    flag: "🇷🇺", code: "RUS-BRATVA",  color: "#7B68B5" },
  anglicka: { name: "Anglická mafie", flag: "🏴", code: "ENG-KRAYS",   color: "#C97F3D" },
  tajna:    { name: "??? (tajná)",    flag: "🎭", code: "X-FANTOM",    color: "#8A8A8A" },
};

const AVATARS = ["🎩","🕶️","🐺","💀","🃏","👑","🐉","🥷","🦂","🍝","🍕","💼","⚡","🦅","🐍","🔥"];

const C = {
  bg: "#0E0C0A", panel: "#17130F", panel2: "#1E1913", line: "#2C2419",
  gold: "#C9A24B", goldDim: "#8A7238", paper: "#E8E0D0", dim: "#9A8F7C",
  green: "#7EE081", red: "#C05050",
};

const mono = "ui-monospace, 'Cascadia Mono', 'Courier New', monospace";
const serif = "Georgia, 'Times New Roman', serif";

// ===== HLAVNÍ APP =====
export default function App() {
  const [screen, setScreen] = useState("auth");
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const stored = localStorage.getItem("mafia_user");
      if (stored) {
        const user = JSON.parse(stored);
        setMe(user);
        setScreen("app");
      }
    } catch (e) {
      console.error("Session check error:", e);
    }
    setLoading(false);
  };

  if (loading) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.dim }}>Loading...</div>;

  const handleLogin = (user) => {
    localStorage.setItem("mafia_user", JSON.stringify(user));
    setMe(user);
    setScreen("boot");
  };

  const handleLogout = () => {
    localStorage.removeItem("mafia_user");
    setMe(null);
    setScreen("auth");
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.paper, fontFamily: mono }}>
      <style>{`
        @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes fadeup { from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:none} }
        * { box-sizing: border-box; }
        input, textarea, button { font-family: inherit; }
        input:focus, textarea:focus, button:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 1px; }
        ::placeholder { color: ${C.dim}; opacity: .6; }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      `}</style>
      {screen === "auth" && <AuthScreen onLogin={handleLogin} />}
      {screen === "boot" && me && <BootScreen me={me} onDone={() => setScreen("app")} />}
      {screen === "app" && me && <MainApp me={me} setMe={setMe} onLogout={handleLogout} />}
    </div>
  );
}

// ===== AUTH SCREEN =====
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [code, setCode] = useState("");
  const [avatar, setAvatar] = useState("🎩");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    const n = name.trim();
    if (!n || !pass) { setErr("Vyplň jméno i heslo."); return; }
    if (n.length > 20) { setErr("Jméno max. 20 znaků."); return; }
    setBusy(true);

    try {
      if (mode === "register") {
        const c = code.trim().toUpperCase();
        const { data: adminCodes } = await supabase.from("admin_codes").select("code");
        const adminCodesList = adminCodes?.map(ac => ac.code) || [];
        const isAdmin = adminCodesList.includes(c) || c === DEFAULT_ADMIN_CODE;
        const teamId = isAdmin ? "hq" : Object.keys(TEAMS).find(t => TEAMS[t].code === c);

        if (!teamId && !isAdmin) { setErr("Neplatný kód."); setBusy(false); return; }

        const { data: existing } = await supabase.from("users").select("id").eq("username", n).single();
        if (existing) { setErr("Jméno je už zabráno."); setBusy(false); return; }

        const { error } = await supabase.from("users").insert([
          { username: n, password: pass, avatar, team: isAdmin ? "hq" : teamId, is_admin: isAdmin, best_score: 0 }
        ]);

        if (error) { setErr("Chyba při registraci."); setBusy(false); return; }

        const user = { username: n, avatar, team: isAdmin ? "hq" : teamId, is_admin: isAdmin, best_score: 0 };
        onLogin(user);
      } else {
        const { data: user, error } = await supabase.from("users").select("*").eq("username", n).single();
        if (error || !user || user.password !== pass) { setErr("Špatné jméno nebo heslo."); setBusy(false); return; }
        onLogin(user);
      }
    } catch (e) {
      console.error("Auth error:", e);
      setErr("Chyba: " + e.message);
    }
    setBusy(false);
  };

  const inputStyle = {
    width: "100%", background: C.panel2, border: `1px solid ${C.line}`, color: C.paper,
    padding: "12px 14px", fontSize: 15, borderRadius: 4, marginBottom: 10,
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "40px 20px", animation: "fadeup .4s ease" }}>
      <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 28 }}>
        {Object.values(TEAMS).map((t, i) => <div key={i} style={{ flex: 1, background: t.color }} />)}
      </div>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ fontSize: 12, letterSpacing: 4, color: C.dim }}>PŘÍSNĚ TAJNÉ // SLOŽKA 8</div>
        <h1 style={{ fontFamily: serif, fontSize: 40, margin: "8px 0 4px", color: C.gold, letterSpacing: 2 }}>
          MAFIA&nbsp;HQ
        </h1>
        <div style={{ color: C.green, fontSize: 13 }}>
          &gt; terminál rodiny_<span style={{ animation: "blink 1s infinite" }}>▌</span>
        </div>
      </div>

      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6, padding: 22 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {["login", "register"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 4, cursor: "pointer", fontSize: 13, letterSpacing: 1,
                background: mode === m ? C.gold : "transparent",
                color: mode === m ? C.bg : C.dim,
                border: `1px solid ${mode === m ? C.gold : C.line}`, fontWeight: 700,
              }}>
              {m === "login" ? "PŘIHLÁSIT" : "NOVÝ AGENT"}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 11, color: C.dim, letterSpacing: 1 }}>KRYCÍ JMÉNO</label>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)}
               placeholder="např. Tichý Tony" maxLength={20} />

        <label style={{ fontSize: 11, color: C.dim, letterSpacing: 1 }}>HESLO</label>
        <input style={inputStyle} type="password" value={pass} onChange={(e) => setPass(e.target.value)}
               placeholder="tajné heslo" onKeyDown={(e) => e.key === "Enter" && submit()} />

        {mode === "register" && (
          <>
            <label style={{ fontSize: 11, color: C.dim, letterSpacing: 1 }}>KÓD MAFIE</label>
            <input style={{ ...inputStyle, textTransform: "uppercase", letterSpacing: 2 }}
                   value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXX-XXXXX" />
            <label style={{ fontSize: 11, color: C.dim, letterSpacing: 1 }}>ZNAK AGENTA</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 6, margin: "8px 0 14px" }}>
              {AVATARS.map((a) => (
                <button key={a} onClick={() => setAvatar(a)}
                  style={{
                    fontSize: 20, padding: "6px 0", borderRadius: 4, cursor: "pointer",
                    background: avatar === a ? C.goldDim : C.panel2,
                    border: `1px solid ${avatar === a ? C.gold : C.line}`,
                  }}>{a}</button>
              ))}
            </div>
          </>
        )}

        {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>! {err}</div>}

        <button onClick={submit} disabled={busy}
          style={{
            width: "100%", padding: 13, background: C.gold, color: C.bg, border: "none",
            borderRadius: 4, fontSize: 15, fontWeight: 700, letterSpacing: 2, cursor: "pointer",
            opacity: busy ? 0.6 : 1,
          }}>
          {busy ? "OVĚŘUJI..." : mode === "login" ? "VSTOUPIT DO SÍTĚ" : "PŘIDAT SE K RODINĚ"}
        </button>
      </div>

      <p style={{ fontSize: 11, color: C.dim, textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
        Táborová hra – nepoužívej svoje skutečné heslo.<br />Kód mafie dostaneš od svého vedoucího.
      </p>
    </div>
  );
}

// ===== BOOT SCREEN =====
function BootScreen({ me, onDone }) {
  const [lines, setLines] = useState([]);
  const team = TEAMS[me.team] || { name: "ŠTÁB VEDENÍ", flag: "🕴️", color: C.gold };
  
  useEffect(() => {
    const seq = [
      "> navazuji šifrované spojení...",
      "> ověřuji otisk agenta: " + me.username,
      "> dešifruji složku: " + team.name.toUpperCase(),
      "> PŘÍSTUP POVOLEN ✔",
    ];
    let i = 0;
    const t = setInterval(() => {
      setLines((l) => [...l, seq[i]]);
      i++;
      if (i >= seq.length) { clearInterval(t); setTimeout(onDone, 700); }
    }, 420);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "120px 24px", color: C.green, fontSize: 14 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ marginBottom: 10, animation: "fadeup .3s ease" }}>
          {l && l.includes("POVOLEN") ? <span style={{ color: C.gold, fontWeight: 700 }}>{l}</span> : l}
        </div>
      ))}
      <span style={{ animation: "blink 1s infinite" }}>▌</span>
    </div>
  );
}

// ===== MAIN APP =====
function MainApp({ me, setMe, onLogout }) {
  const [tab, setTab] = useState("feed");
  const team = TEAMS[me.team] || { name: "ŠTÁB VEDENÍ", flag: "🕴️", color: C.gold };

  const tabs = [
    { id: "feed", label: "Rozkazy", icon: "📜" },
    { id: "chat", label: "Kanál", icon: "💬" },
    { id: "game", label: "Hack", icon: "💻" },
    { id: "board", label: "Ranky", icon: "🏆" },
    { id: "profile", label: "Profil", icon: me.avatar },
  ];
  if (me.is_admin) tabs.splice(4, 0, { id: "admin", label: "Štáb", icon: "🗂️" });

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
        borderBottom: `1px solid ${C.line}`, background: C.panel, position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontSize: 22 }}>{team.flag}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: serif, color: C.gold, fontSize: 17, letterSpacing: 1 }}>MAFIA HQ</div>
          <div style={{ fontSize: 11, color: team.color }}>{team.name} · {me.avatar} {me.username}{me.is_admin ? " · DON" : ""}</div>
        </div>
        <div style={{ width: 34, height: 4, borderRadius: 2, background: team.color }} />
      </header>

      <main style={{ flex: 1, padding: 16, paddingBottom: 90 }}>
        {tab === "feed" && <Feed me={me} />}
        {tab === "chat" && <TeamChat me={me} team={team} />}
        {tab === "game" && <HackGame me={me} setMe={setMe} />}
        {tab === "board" && <Leaderboard me={me} />}
        {tab === "admin" && me.is_admin && <AdminPanel />}
        {tab === "profile" && <Profile me={me} team={team} onLogout={onLogout} />}
      </main>

      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "center",
        background: C.panel, borderTop: `1px solid ${C.line}`, zIndex: 10,
      }}>
        <div style={{ display: "flex", width: "100%", maxWidth: 560 }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "10px 0 12px", background: "transparent", border: "none", cursor: "pointer",
                color: tab === t.id ? C.gold : C.dim, borderTop: `2px solid ${tab === t.id ? C.gold : "transparent"}`,
              }}>
              <div style={{ fontSize: 19 }}>{t.icon}</div>
              <div style={{ fontSize: 10, letterSpacing: 1, marginTop: 2 }}>{t.label}</div>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// ===== FEED =====
function Feed({ me }) {
  const [posts, setPosts] = useState(null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [isMission, setIsMission] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("feed_posts").select("*").order("created_at", { ascending: false }).limit(60);
    setPosts(data || []);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, [load]);

  const publish = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("feed_posts").insert([
        { title: title.trim(), text: text.trim(), is_mission: isMission, author: me.username }
      ]);
      if (error) { setErr("Chyba při ukládání"); }
      else {
        setText("");
        setTitle("");
        setIsMission(false);
        load();
      }
    } catch (e) {
      setErr("Chyba: " + e.message);
    }
    setBusy(false);
  };

  const remove = async (id) => {
    await supabase.from("feed_posts").delete().eq("id", id);
    load();
  };

  return (
    <div style={{ animation: "fadeup .3s ease" }}>
      <SectionTitle title="ROZKAZY OD DONA" sub="oficiální zprávy hlavního vedoucího" />

      {me.is_admin && (
        <div style={{ background: C.panel, border: `1px solid ${C.goldDim}`, borderRadius: 6, padding: 14, marginBottom: 18 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titulek (nepovinný)"
            style={{ width: "100%", background: C.panel2, border: `1px solid ${C.line}`, color: C.paper, padding: 10, borderRadius: 4, marginBottom: 8, fontSize: 14 }} />
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Napiš rozkaz..." rows={3}
            style={{ width: "100%", background: C.panel2, border: `1px solid ${C.line}`, color: C.paper, padding: 10, borderRadius: 4, fontSize: 14, resize: "vertical" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <label style={{ fontSize: 12, color: C.dim, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={isMission} onChange={(e) => setIsMission(e.target.checked)} />
              Označit jako MISI 🎯
            </label>
            {err && <span style={{ color: C.red, fontSize: 11 }}>! {err}</span>}
            <button onClick={publish} disabled={busy}
              style={{ marginLeft: "auto", background: C.gold, color: C.bg, border: "none", padding: "8px 18px", borderRadius: 4, fontWeight: 700, cursor: "pointer", letterSpacing: 1, opacity: busy ? 0.6 : 1 }}>
              {busy ? "UKLÁDÁM..." : "VYDAT ROZKAZ"}
            </button>
          </div>
        </div>
      )}

      {posts === null && <Dim>načítám zprávy...</Dim>}
      {posts && posts.length === 0 && <Dim>Zatím žádné rozkazy.</Dim>}
      {posts && posts.map((p) => (
        <article key={p.id} style={{
          background: C.panel, border: `1px solid ${p.is_mission ? C.gold : C.line}`, borderRadius: 6,
          padding: 14, marginBottom: 12,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            {p.is_mission && <span style={{ fontSize: 10, background: C.gold, color: C.bg, padding: "2px 8px", borderRadius: 3, fontWeight: 700, letterSpacing: 1 }}>MISE</span>}
            {p.title && <strong style={{ fontFamily: serif, color: C.gold, fontSize: 16 }}>{p.title}</strong>}
            <span style={{ marginLeft: "auto", fontSize: 11, color: C.dim }}>{new Date(p.created_at).toLocaleString("cs-CZ")}</span>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{p.text}</div>
          <div style={{ display: "flex", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: C.dim }}>— {p.author}, vedoucí</span>
            {me.is_admin && (
              <button onClick={() => remove(p.id)} style={{ marginLeft: "auto", background: "none", border: "none", color: C.red, fontSize: 11, cursor: "pointer" }}>smazat</button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

// ===== TEAM CHAT =====
function TeamChat({ me, team }) {
  const [adminMode, setAdminMode] = useState(true);
  const [channel, setChannel] = useState(me.is_admin ? Object.keys(TEAMS)[0] : me.team);
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("messages").select("*").eq("team", channel).order("created_at", { ascending: true }).limit(120);
    setMsgs(data || []);
  }, [channel]);

  useEffect(() => {
    setMsgs(null);
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [msgs?.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    await supabase.from("messages").insert([
      { team: channel, author: me.username, avatar: me.avatar, text: body.slice(0, 400), is_admin: me.is_admin }
    ]);
    load();
  };

  const chTeam = TEAMS[channel] || team;

  return (
    <div style={{ animation: "fadeup .3s ease", display: "flex", flexDirection: "column", height: "calc(100vh - 190px)" }}>
      <SectionTitle title={`ŠIFROVANÝ KANÁL ${chTeam.flag}`} sub={me.is_admin ? adminMode ? "všechny rodiny" : `jen moje: ${chTeam.name}` : `jen pro: ${chTeam.name}`} />

      {me.is_admin && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: C.dim, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" checked={adminMode} onChange={() => setAdminMode(true)} />
              Všechny rodiny
            </label>
            <label style={{ fontSize: 11, color: C.dim, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" checked={!adminMode} onChange={() => setAdminMode(false)} />
              Jen moje
            </label>
          </div>
          {adminMode && (
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 6 }}>
              {Object.entries(TEAMS).map(([id, t]) => (
                <button key={id} onClick={() => setChannel(id)}
                  style={{
                    flexShrink: 0, padding: "5px 10px", borderRadius: 12, fontSize: 12, cursor: "pointer",
                    background: channel === id ? t.color : C.panel2, color: channel === id ? "#fff" : C.dim,
                    border: `1px solid ${channel === id ? t.color : C.line}`,
                  }}>{t.flag} {t.name.split(" ")[0]}</button>
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ flex: 1, overflowY: "auto", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6, padding: 12 }}>
        {msgs === null && <Dim>dešifruji zprávy...</Dim>}
        {msgs && msgs.length === 0 && <Dim>Ticho v éteru.</Dim>}
        {msgs && msgs.map((m, i) => {
          const mine = m.author === me.username;
          return (
            <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div style={{
                maxWidth: "82%", background: mine ? C.goldDim : C.panel2,
                border: `1px solid ${m.is_admin ? C.gold : C.line}`, borderRadius: 8, padding: "7px 11px",
              }}>
                <div style={{ fontSize: 11, color: m.is_admin ? C.gold : chTeam.color, marginBottom: 2 }}>
                  {m.avatar} {m.author}{m.is_admin ? " · DON" : ""} · {new Date(m.created_at).toLocaleTimeString("cs-CZ")}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Napiš zprávu..." maxLength={400}
          style={{ flex: 1, background: C.panel2, border: `1px solid ${C.line}`, color: C.paper, padding: "11px 13px", borderRadius: 4, fontSize: 14 }} />
        <button onClick={send}
          style={{ background: C.gold, color: C.bg, border: "none", padding: "0 18px", borderRadius: 4, fontWeight: 700, cursor: "pointer" }}>
          ▶
        </button>
      </div>
    </div>
  );
}

// ===== HACK GAME =====
function HackGame({ me, setMe }) {
  const [phase, setPhase] = useState("idle");
  const [round, setRound] = useState(1);
  const [code, setCode] = useState("");
  const [entered, setEntered] = useState("");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(me.best_score || 0);
  const [flash, setFlash] = useState(null);

  const startRound = (r, sc) => {
    const len = 3 + r;
    let c = "";
    for (let i = 0; i < len; i++) c += Math.floor(Math.random() * 10);
    setCode(c);
    setEntered("");
    setRound(r);
    setScore(sc);
    setPhase("show");
    setTimeout(() => setPhase("input"), 900 + len * 380);
  };

  const start = () => { setFlash(null); startRound(1, 0); };

  const press = (d) => {
    if (phase !== "input") return;
    const next = entered + d;
    if (code.startsWith(next)) {
      setEntered(next);
      if (next === code) {
        const gained = round * 15;
        const newScore = score + gained;
        setFlash("ok");
        setTimeout(() => { setFlash(null); startRound(round + 1, newScore); }, 550);
        setScore(newScore);
      }
    } else {
      endGame(score);
    }
  };

  const endGame = async (finalScore) => {
    setFlash("fail");
    setPhase("over");
    if (finalScore > best) {
      setBest(finalScore);
      const { error } = await supabase.from("users").update({ best_score: finalScore }).eq("username", me.username);
      if (!error) {
        const updated = { ...me, best_score: finalScore };
        localStorage.setItem("mafia_user", JSON.stringify(updated));
        setMe(updated);
      }
    }
  };

  return (
    <div style={{ animation: "fadeup .3s ease" }}>
      <SectionTitle title="PROLOMENÍ FIREWALLU" sub="zapamatuj si kód a prolom zabezpečení" />

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <Stat label="SKÓRE" value={score} color={C.green} />
        <Stat label="ÚROVEŇ" value={round} color={C.gold} />
        <Stat label="REKORD" value={best} color={C.paper} />
      </div>

      <div style={{
        background: "#0A0F0A", border: `1px solid ${flash === "fail" ? C.red : flash === "ok" ? C.green : C.line}`,
        borderRadius: 6, padding: "26px 16px", textAlign: "center", minHeight: 130, marginBottom: 14,
        color: C.green, position: "relative", overflow: "hidden",
      }}>
        {phase === "idle" && (
          <>
            <div style={{ fontSize: 13, marginBottom: 14, color: C.dim }}>
              &gt; cíl: server nepřátelské rodiny<br />&gt; zobrazí se kód – zapamatuj si ho<br />&gt; každá úroveň = delší kód a víc bodů
            </div>
            <button onClick={start} style={{ background: C.green, color: "#08110A", border: "none", padding: "12px 26px", borderRadius: 4, fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: 2 }}>
              SPUSTIT HACK ▶
            </button>
          </>
        )}
        {phase === "show" && (
          <>
            <div style={{ fontSize: 12, color: C.dim, marginBottom: 10 }}>&gt; zachycen přístupový kód:</div>
            <div style={{ fontSize: 34, letterSpacing: 10, fontWeight: 700 }}>{code}</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 10 }}>zapamatuj si ho...</div>
          </>
        )}
        {phase === "input" && (
          <>
            <div style={{ fontSize: 12, color: C.dim, marginBottom: 10 }}>&gt; zadej kód zpaměti:</div>
            <div style={{ fontSize: 34, letterSpacing: 10, fontWeight: 700, minHeight: 42 }}>
              {entered}<span style={{ animation: "blink .8s infinite" }}>▌</span>
            </div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>{code.length - entered.length} znaků zbývá</div>
          </>
        )}
        {phase === "over" && (
          <>
            <div style={{ color: C.red, fontSize: 17, fontWeight: 700, marginBottom: 6 }}>⛔ SPOJENÍ PŘERUŠENO</div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>Skóre: <b style={{ color: C.gold }}>{score}</b></div>
            {score >= best && score > 0 && <div style={{ color: C.gold, fontSize: 12, marginBottom: 8 }}>★ NOVÝ REKORD!</div>}
            <button onClick={start} style={{ background: C.green, color: "#08110A", border: "none", padding: "10px 22px", borderRadius: 4, fontWeight: 700, cursor: "pointer", marginTop: 6 }}>
              ZKUSIT ZNOVU
            </button>
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, maxWidth: 280, margin: "0 auto" }}>
        {[1,2,3,4,5,6,7,8,9,null,0,null].map((d, i) => d === null ? <div key={i} /> : (
          <button key={i} onClick={() => press(String(d))}
            disabled={phase !== "input"}
            style={{
              padding: "16px 0", fontSize: 20, fontWeight: 700, borderRadius: 6, cursor: "pointer",
              background: phase === "input" ? C.panel2 : C.panel, color: phase === "input" ? C.paper : C.dim,
              border: `1px solid ${C.line}`,
            }}>{d}</button>
        ))}
      </div>
    </div>
  );
}

// ===== LEADERBOARD =====
function Leaderboard({ me }) {
  const [scores, setScores] = useState(null);
  const [addingTo, setAddingTo] = useState(null);
  const [addValue, setAddValue] = useState("");

  const load = useCallback(async () => {
    const { data: users } = await supabase.from("users").select("*").eq("is_admin", false);
    const { data: bonuses } = await supabase.from("team_bonuses").select("*");

    const teamScores = Object.keys(TEAMS).map((id) => {
      const members = users?.filter(u => u.team === id) || [];
      const gamePoints = members.reduce((s, u) => s + (u.best_score || 0), 0);
      const bonusPoints = (bonuses?.find(b => b.team === id)?.bonus_points) || 0;
      const total = gamePoints + bonusPoints;
      return { id, ...TEAMS[id], gamePoints, bonusPoints, total, count: members.length };
    }).sort((a, b) => b.total - a.total);

    setScores(teamScores);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addBonus = async (teamId) => {
    const val = parseInt(addValue, 10);
    if (!val || val < 1) return;
    const { data } = await supabase.from("team_bonuses").select("*").eq("team", teamId).single();
    if (data) {
      await supabase.from("team_bonuses").update({ bonus_points: (data.bonus_points || 0) + val }).eq("team", teamId);
    } else {
      await supabase.from("team_bonuses").insert([{ team: teamId, bonus_points: val }]);
    }
    setAddingTo(null);
    setAddValue("");
    load();
  };

  const medalColors = {
    0: { bg: "#1a3a1a", medal: "🥇", color: "#7EE081" },
    1: { bg: "#3a2a1a", medal: "🥈", color: "#E8A745" },
    2: { bg: "#3a1a1a", medal: "🥉", color: "#C05050" },
  };

  if (!scores) return <Dim>počítám body...</Dim>;

  const max = Math.max(1, scores[0]?.total || 1);

  return (
    <div style={{ animation: "fadeup .3s ease" }}>
      <SectionTitle title="VÁLKA RODIN" sub="součet her + bonus za soutěže" />

      {scores.map((t, i) => {
        const medal = i < 3 ? medalColors[i] : null;
        return (
          <div key={t.id} style={{
            background: medal ? medal.bg : C.panel,
            border: `2px solid ${medal ? medal.color : t.id === me.team ? t.color : C.line}`,
            borderRadius: 6, padding: "12px 14px", marginBottom: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {medal && <span style={{ fontSize: 20 }}>{medal.medal}</span>}
              <span style={{ fontFamily: serif, color: medal ? medal.color : C.dim, width: 24 }}>{i + 1}.</span>
              <span style={{ fontSize: 16 }}>{t.flag}</span>
              <span style={{ fontSize: 15, color: medal ? medal.color : C.paper, fontWeight: 700 }}>{t.name}</span>
              <span style={{ marginLeft: "auto", fontWeight: 700, color: medal ? medal.color : C.gold, fontSize: 16 }}>{t.total}</span>
            </div>
            <div style={{ height: 6, background: C.panel2, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ width: `${(t.total / max) * 100}%`, height: "100%", background: medal ? medal.color : t.color, transition: "width .5s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>
              {t.count} agentů • her: <b>{t.gamePoints}</b> • bonus: <b>{t.bonusPoints}</b>
            </div>

            {me.is_admin && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {addingTo === t.id ? (
                  <>
                    <input type="number" value={addValue} onChange={(e) => setAddValue(e.target.value)}
                      placeholder="body" min="1" max="999"
                      style={{ width: 60, background: C.panel, border: `1px solid ${C.line}`, color: C.paper, padding: "5px 8px", borderRadius: 3, fontSize: 12 }} />
                    <button onClick={() => addBonus(t.id)}
                      style={{ background: C.green, color: C.bg, border: "none", padding: "5px 12px", borderRadius: 3, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      Přidat
                    </button>
                    <button onClick={() => { setAddingTo(null); setAddValue(""); }}
                      style={{ background: "none", border: `1px solid ${C.line}`, color: C.dim, padding: "5px 12px", borderRadius: 3, fontSize: 11, cursor: "pointer" }}>
                      Zrušit
                    </button>
                  </>
                ) : (
                  <button onClick={() => setAddingTo(t.id)}
                    style={{ background: "none", border: `1px solid ${C.line}`, color: C.dim, padding: "5px 12px", borderRadius: 3, fontSize: 11, cursor: "pointer" }}>
                    + přidat body
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== ADMIN PANEL =====
function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [adminCodes, setAdminCodes] = useState([]);
  const [copying, setCopying] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: u } = await supabase.from("users").select("*");
      setUsers(u || []);
      const { data: a } = await supabase.from("admin_codes").select("*");
      setAdminCodes(a || []);
    };
    load();
  }, []);

  const generateAdminCode = async () => {
    let code = "ADMIN-";
    for (let i = 0; i < 5; i++) code += "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 34)];
    await supabase.from("admin_codes").insert([{ code }]);
    setAdminCodes([...adminCodes, { code }]);
  };

  const deleteUser = async (username) => {
    await supabase.from("users").delete().eq("username", username);
    setUsers(users.filter(u => u.username !== username));
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopying(code);
    setTimeout(() => setCopying(null), 1500);
  };

  return (
    <div style={{ animation: "fadeup .3s ease" }}>
      <SectionTitle title="ŠTÁB VEDENÍ" sub="správa celé hry" />

      <Card title="🔑 Kódy mafií">
        {Object.values(TEAMS).map((t) => (
          <div key={t.code} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
            <span>{t.flag}</span>
            <span style={{ flex: 1 }}>{t.name}</span>
            <code style={{ color: C.green, letterSpacing: 1, cursor: "pointer", padding: "2px 6px", borderRadius: 3, background: C.panel2 }} onClick={() => copyCode(t.code)}>
              {t.code}
            </code>
          </div>
        ))}
      </Card>

      <Card title="🕴️ Admin kódy">
        <div style={{ marginBottom: 12 }}>
          <button onClick={generateAdminCode} style={{ background: C.gold, color: C.bg, border: "none", padding: "8px 16px", borderRadius: 4, fontWeight: 700, cursor: "pointer", fontSize: 13, letterSpacing: 1 }}>
            + NOVÝ ADMIN KÓD
          </button>
        </div>
        {adminCodes.length === 0 && <Dim>Žádné admin kódy.</Dim>}
        {adminCodes.map((item) => (
          <div key={item.code} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
            {item.code === DEFAULT_ADMIN_CODE && <span style={{ fontSize: 11, background: C.goldDim, color: C.bg, padding: "2px 6px", borderRadius: 2 }}>VÝCHOZÍ</span>}
            <code style={{ flex: 1, color: C.gold, letterSpacing: 1, cursor: "pointer", padding: "2px 6px", borderRadius: 3, background: C.panel2 }} onClick={() => copyCode(item.code)}>
              {item.code}
            </code>
            {copying === item.code && <span style={{ color: C.green, fontSize: 11 }}>✓</span>}
          </div>
        ))}
      </Card>

      <Card title={`👥 Uživatelé (${users.length})`}>
        {users.filter(u => !u.is_admin).length === 0 && <Dim>Zatím nikdo.</Dim>}
        {users.filter(u => !u.is_admin).sort((a, b) => (b.best_score || 0) - (a.best_score || 0)).map((u) => (
          <div key={u.username} style={{ display: "flex", gap: 8, fontSize: 12, padding: "6px 0", borderBottom: `1px solid ${C.line}`, alignItems: "center" }}>
            <span>{u.avatar}</span>
            <span style={{ flex: 1 }}>{u.username}</span>
            <span style={{ color: TEAMS[u.team]?.color || C.dim, fontSize: 11 }}>{TEAMS[u.team]?.flag}</span>
            {u.best_score > 0 && <span style={{ color: C.green, fontWeight: 700 }}>{u.best_score}</span>}
            <button onClick={() => deleteUser(u.username)} style={{ background: "none", border: "none", color: C.red, fontSize: 11, cursor: "pointer" }}>
              smazat
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ===== PROFILE =====
function Profile({ me, team, onLogout }) {
  return (
    <div style={{ animation: "fadeup .3s ease", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginTop: 20 }}>{me.avatar}</div>
      <h2 style={{ fontFamily: serif, color: C.gold, margin: "10px 0 2px", letterSpacing: 1 }}>{me.username}</h2>
      <div style={{ color: team.color, fontSize: 13, marginBottom: 24 }}>{team.flag} {team.name}{me.is_admin ? " · HLAVNÍ VEDOUCÍ" : ""}</div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 30 }}>
        <Stat label="REKORD" value={me.best_score || 0} color={C.green} />
        <Stat label="TÝM" value={team.name.split(" ")[0]} color={C.paper} />
      </div>

      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6, padding: 16, fontSize: 12, color: C.dim, textAlign: "left", lineHeight: 1.6, maxWidth: 380, margin: "0 auto 24px" }}>
        <b style={{ color: C.gold }}>OMERTÀ – kodex rodiny:</b><br />
        1. Chraň svou rodinu a hraj fér.<br />
        2. Co se řekne v kanálu, zůstává v kanálu.<br />
        3. Body získáváš pro rodinu, ne pro sebe.<br />
        4. Don má vždy poslední slovo. 🎩
      </div>

      <button onClick={onLogout}
        style={{ background: "transparent", border: `1px solid ${C.red}`, color: C.red, padding: "10px 24px", borderRadius: 4, cursor: "pointer", letterSpacing: 1 }}>
        ODPOJIT SE ZE SÍTĚ
      </button>
    </div>
  );
}

// ===== KOMPONENTY =====
function SectionTitle({ title, sub, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <h2 style={{ fontFamily: serif, color: C.gold, fontSize: 19, margin: 0, letterSpacing: 1 }}>{title}</h2>
      {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: C.gold, marginBottom: 10, letterSpacing: 1 }}>{title}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6, padding: "10px 6px", textAlign: "center", minWidth: 80 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Dim({ children }) {
  return <div style={{ color: C.dim, fontSize: 13, padding: "14px 4px" }}>{children}</div>;
}
