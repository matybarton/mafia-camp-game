import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from './config.js';

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_ADMIN_CODE = "DON-2026";
const TEAMS = {
  mexicka:  { name: "Mexická mafie",  flag: "🇲🇽", code: "MEX-SICARIO", color: "#3a9d5d" },
  ceska:    { name: "Česká mafie",    flag: "🇨🇿", code: "CZE-KMOTR",   color: "#2d8659" },
  italska:  { name: "Italská mafie",  flag: "🇮🇹", code: "ITA-OMERTA",  color: "#4db876" },
  americka: { name: "Americká mafie", flag: "🇺🇸", code: "USA-CAPONE",  color: "#C97F3D" },
  japonska: { name: "Japonská mafie", flag: "🇯🇵", code: "JPN-YAKUZA",  color: "#D8557B" },
  ruska:    { name: "Ruská mafie",    flag: "🇷🇺", code: "RUS-BRATVA",  color: "#7B68B5" },
  anglicka: { name: "Anglická mafie", flag: "🏴", code: "ENG-KRAYS",   color: "#C97F3D" },
  tajna:    { name: "??? (tajná)",    flag: "🎭", code: "X-FANTOM",    color: "#5a7a5f" },
};

const AVATARS = ["🎩","🕶️","🐺","💀","🃏","👑","🐉","🥷","🦂","🍝","🍕","💼","⚡","🦅","🐍","🔥"];

const GREEN = "#3a9d5d";
const DARK_BG = "#0d1b0f";
const DARK_PANEL = "#1a2e1f";
const DARK_PANEL2 = "#233429";

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

  if (loading) return <LoadingScreen />;

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
    <div style={{ minHeight: "100vh", background: DARK_BG, color: GREEN, fontFamily: '"Courier New", monospace', overflow: "hidden", position: "relative" }}>
      <style>{`
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 8px ${GREEN}, 0 0 15px ${GREEN}44; }
          50% { text-shadow: 0 0 15px ${GREEN}, 0 0 25px ${GREEN}66; }
        }
        h1, h2 { animation: glow 2s ease-in-out infinite; }
      `}</style>

      {screen === "auth" && <AuthScreen onLogin={handleLogin} />}
      {screen === "boot" && me && <BootScreen me={me} onDone={() => setScreen("app")} />}
      {screen === "app" && me && <MainApp me={me} setMe={setMe} onLogout={handleLogout} />}
    </div>
  );
}

// ===== LOADING SCREEN =====
function LoadingScreen() {
  const [chars, setChars] = useState("");

  useEffect(() => {
    const chars_list = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZčřžýáíé▓▒░█▀▄├┤┬┴│─╔╗╚╝═║";
    const interval = setInterval(() => {
      let str = "";
      for (let i = 0; i < 15; i++) {
        str += chars_list[Math.floor(Math.random() * chars_list.length)];
      }
      setChars(str);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: DARK_BG,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: GREEN,
      fontFamily: '"Courier New", monospace',
      textAlign: "center",
    }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🎭</div>
        <div style={{ fontSize: 28, letterSpacing: 4, marginBottom: 30 }}>MAFIA HQ</div>
        <div style={{ fontSize: 12, letterSpacing: 2, color: GREEN + "66", marginBottom: 20 }}>
          &gt; INICIALIZUJI TERMINÁL...
        </div>
        <div style={{ fontSize: 14, minHeight: 25, fontFamily: '"Courier New", monospace', letterSpacing: 2 }}>
          {chars}
        </div>
      </div>
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

        if (error) { setErr("Chyba při registraci: " + error.message); setBusy(false); return; }

        const user = { username: n, avatar, team: isAdmin ? "hq" : teamId, is_admin: isAdmin, best_score: 0 };
        onLogin(user);
      } else {
        const { data: user, error } = await supabase.from("users").select("*").eq("username", n).single();
        if (error || !user || user.password !== pass) { setErr("Špatné jméno nebo heslo."); setBusy(false); return; }
        onLogin(user);
      }
    } catch (e) {
      setErr("Chyba: " + e.message);
    }
    setBusy(false);
  };

  const inputStyle = {
    width: "100%",
    background: DARK_PANEL2,
    border: `1px solid ${GREEN}`,
    color: GREEN,
    padding: 12,
    marginBottom: 10,
    fontSize: 13,
    fontFamily: "inherit",
    letterSpacing: 1,
    boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 50 }}>
        <div style={{ fontSize: 56, marginBottom: 15 }}>🎭</div>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 3 }}>MAFIA HQ</h1>
        <p style={{ fontSize: 11, color: GREEN + "66", marginTop: 10, letterSpacing: 1 }}>
          &gt; VSTUP DO SÍTĚ RODINY
        </p>
      </div>

      <div style={{ background: DARK_PANEL, border: `2px solid ${GREEN}`, padding: 20, boxShadow: `0 0 15px ${GREEN}22` }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {["login", "register"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 4, cursor: "pointer", fontSize: 13, letterSpacing: 1,
                background: mode === m ? GREEN : "transparent",
                color: mode === m ? DARK_BG : GREEN,
                border: `1px solid ${mode === m ? GREEN : GREEN}44`, fontWeight: 700,
              }}>
              {m === "login" ? "PŘIHLÁSIT" : "NOVÝ AGENT"}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 11, color: GREEN + "66", letterSpacing: 1 }}>KRYCÍ JMÉNO</label>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="např. Tichý Tony" maxLength={20} />

        <label style={{ fontSize: 11, color: GREEN + "66", letterSpacing: 1 }}>HESLO</label>
        <input style={inputStyle} type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="tajné heslo" onKeyDown={(e) => e.key === "Enter" && submit()} />

        {mode === "register" && (
          <>
            <label style={{ fontSize: 11, color: GREEN + "66", letterSpacing: 1 }}>KÓD MAFIE</label>
            <input style={{ ...inputStyle, textTransform: "uppercase", letterSpacing: 2 }} value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXX-XXXXX" />
            <label style={{ fontSize: 11, color: GREEN + "66", letterSpacing: 1 }}>ZNAK AGENTA</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 6, margin: "8px 0 14px" }}>
              {AVATARS.map((a) => (
                <button key={a} onClick={() => setAvatar(a)}
                  style={{
                    fontSize: 20, padding: "6px 0", borderRadius: 4, cursor: "pointer",
                    background: avatar === a ? GREEN + "33" : DARK_PANEL2,
                    border: `1px solid ${avatar === a ? GREEN : GREEN + "44"}`,
                  }}>{a}</button>
              ))}
            </div>
          </>
        )}

        {err && <div style={{ color: "#FF6B6B", fontSize: 13, marginBottom: 10 }}>! {err}</div>}

        <button onClick={submit} disabled={busy}
          style={{
            width: "100%", padding: 13, background: GREEN, color: DARK_BG, border: "none",
            borderRadius: 4, fontSize: 15, fontWeight: 700, letterSpacing: 2, cursor: "pointer",
            opacity: busy ? 0.6 : 1,
          }}>
          {busy ? "OVĚŘUJI..." : mode === "login" ? "VSTOUPIT DO SÍTĚ" : "PŘIDAT SE K RODINĚ"}
        </button>
      </div>
    </div>
  );
}

// ===== BOOT SCREEN =====
function BootScreen({ me, onDone }) {
  const [lines, setLines] = useState([]);
  const team = TEAMS[me.team] || { name: "ŠTÁB VEDENÍ", flag: "🕴️", color: GREEN };

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
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "120px 24px", color: GREEN, fontSize: 14 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          {l && l.includes("POVOLEN") ? <span style={{ color: GREEN, fontWeight: 700 }}>{l}</span> : l}
        </div>
      ))}
    </div>
  );
}

// ===== MAIN APP =====
function MainApp({ me, setMe, onLogout }) {
  const [tab, setTab] = useState("feed");
  const team = TEAMS[me.team] || { name: "ŠTÁB VEDENÍ", flag: "🕴️", color: GREEN };

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
        borderBottom: `1px solid ${GREEN}`, background: DARK_PANEL, position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontSize: 22 }}>{team.flag}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: '"Georgia", serif', color: GREEN, fontSize: 17, letterSpacing: 1 }}>MAFIA HQ</div>
          <div style={{ fontSize: 11, color: team.color }}>{team.name} · {me.avatar} {me.username}{me.is_admin ? " · DON" : ""}</div>
        </div>
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
        background: DARK_PANEL, borderTop: `1px solid ${GREEN}`, zIndex: 10,
      }}>
        <div style={{ display: "flex", width: "100%", maxWidth: 560 }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "10px 0 12px", background: "transparent", border: "none", cursor: "pointer",
                color: tab === t.id ? GREEN : GREEN + "66", borderTop: `2px solid ${tab === t.id ? GREEN : "transparent"}`,
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
    <div>
      <h2 style={{ fontSize: 16, letterSpacing: 2, marginBottom: 20, color: GREEN }}>📜 ROZKAZY OD DONA</h2>

      {me.is_admin && (
        <div style={{ background: DARK_PANEL, border: `1px solid ${GREEN}`, borderRadius: 4, padding: 14, marginBottom: 18 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titulek (nepovinný)"
            style={{ width: "100%", background: DARK_PANEL2, border: `1px solid ${GREEN}44`, color: GREEN, padding: 10, borderRadius: 4, marginBottom: 8, fontSize: 14, boxSizing: "border-box" }} />
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Napiš rozkaz..." rows={3}
            style={{ width: "100%", background: DARK_PANEL2, border: `1px solid ${GREEN}44`, color: GREEN, padding: 10, borderRadius: 4, fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <label style={{ fontSize: 12, color: GREEN + "66", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={isMission} onChange={(e) => setIsMission(e.target.checked)} />
              Označit jako MISI 🎯
            </label>
            {err && <span style={{ color: "#FF6B6B", fontSize: 11 }}>! {err}</span>}
            <button onClick={publish} disabled={busy}
              style={{ marginLeft: "auto", background: GREEN, color: DARK_BG, border: "none", padding: "8px 18px", borderRadius: 4, fontWeight: 700, cursor: "pointer", letterSpacing: 1, opacity: busy ? 0.6 : 1 }}>
              {busy ? "UKLÁDÁM..." : "VYDAT ROZKAZ"}
            </button>
          </div>
        </div>
      )}

      {posts === null && <div style={{ color: GREEN + "66", fontSize: 13 }}>načítám zprávy...</div>}
      {posts && posts.length === 0 && <div style={{ color: GREEN + "66", fontSize: 13 }}>Zatím žádné rozkazy.</div>}
      {posts && posts.map((p) => (
        <article key={p.id} style={{
          background: DARK_PANEL2, border: `1px solid ${p.is_mission ? GREEN : GREEN + "44"}`, borderRadius: 4,
          padding: 14, marginBottom: 12,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            {p.is_mission && <span style={{ fontSize: 10, background: GREEN, color: DARK_BG, padding: "2px 8px", borderRadius: 3, fontWeight: 700, letterSpacing: 1 }}>MISE</span>}
            {p.title && <strong style={{ color: GREEN, fontSize: 14 }}>{p.title}</strong>}
            <span style={{ marginLeft: "auto", fontSize: 11, color: GREEN + "66" }}>{new Date(p.created_at).toLocaleString("cs-CZ")}</span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{p.text}</div>
          <div style={{ display: "flex", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: GREEN + "66" }}>— {p.author}</span>
            {me.is_admin && (
              <button onClick={() => remove(p.id)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#FF6B6B", fontSize: 11, cursor: "pointer" }}>smazat</button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

// ===== TEAM CHAT =====
function TeamChat({ me, team }) {
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("messages").select("*").eq("team", "global").order("created_at", { ascending: true }).limit(120);
    setMsgs(data || []);
  }, []);

  useEffect(() => {
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
      { team: "global", author: me.username, avatar: me.avatar, text: body.slice(0, 400), is_admin: me.is_admin }
    ]);
    load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 190px)" }}>
      <h2 style={{ fontSize: 16, letterSpacing: 2, marginBottom: 15, color: GREEN }}>💬 GLOBÁLNÍ KANÁL</h2></thinking>

✅ **HOTOVO! Tady je opravená verze!**
<function_calls>
<invoke name="present_files">
<parameter name="filepaths">["/mnt/user-data/outputs/App_GREEN_DESIGN.jsx"]

      <div style={{ flex: 1, overflowY: "auto", background: DARK_PANEL, border: `1px solid ${GREEN}44`, borderRadius: 4, padding: 12, marginBottom: 10 }}>
        {msgs === null && <div style={{ color: GREEN + "66" }}>dešifruji zprávy...</div>}
        {msgs && msgs.length === 0 && <div style={{ color: GREEN + "66" }}>Ticho v éteru.</div>}
        {msgs && msgs.map((m, i) => {
          const mine = m.author === me.username;
          return (
            <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div style={{
                maxWidth: "82%", background: mine ? GREEN + "22" : DARK_PANEL2,
                border: `1px solid ${m.is_admin ? GREEN : GREEN + "44"}`, borderRadius: 6, padding: "7px 11px",
              }}>
                <div style={{ fontSize: 11, color: GREEN, marginBottom: 2 }}>
                  {m.avatar} {m.author}{m.is_admin ? " DON" : ""} · {new Date(m.created_at).toLocaleTimeString("cs-CZ")}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Napiš zprávu..." maxLength={400}
          style={{ flex: 1, background: DARK_PANEL2, border: `1px solid ${GREEN}44`, color: GREEN, padding: "11px 13px", borderRadius: 4, fontSize: 13, boxSizing: "border-box" }} />
        <button onClick={send}
          style={{ background: GREEN, color: DARK_BG, border: "none", padding: "0 18px", borderRadius: 4, fontWeight: 700, cursor: "pointer" }}>
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

  const start = () => startRound(1, 0);

  const press = (d) => {
    if (phase !== "input") return;
    const next = entered + d;
    if (code.startsWith(next)) {
      setEntered(next);
      if (next === code) {
        const gained = round * 15;
        const newScore = score + gained;
        setTimeout(() => startRound(round + 1, newScore), 550);
        setScore(newScore);
      }
    } else {
      endGame(score);
    }
  };

  const endGame = async (finalScore) => {
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
    <div>
      <h2 style={{ fontSize: 16, letterSpacing: 2, marginBottom: 20, color: GREEN }}>💻 PROLOMENÍ FIREWALLU</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <Stat label="SKÓRE" value={score} />
        <Stat label="ÚROVEŇ" value={round} />
        <Stat label="REKORD" value={best} />
      </div>

      <div style={{
        background: "#0f1f12", border: `1px solid ${phase === "over" ? "#FF6B6B" : GREEN + "44"}`,
        borderRadius: 4, padding: "26px 16px", textAlign: "center", minHeight: 130, marginBottom: 14,
        color: GREEN, position: "relative", overflow: "hidden",
      }}>
        {phase === "idle" && (
          <>
            <div style={{ fontSize: 12, marginBottom: 14, color: GREEN + "66" }}>
              &gt; cíl: server nepřátelské rodiny<br />&gt; zobrazí se kód – zapamatuj si ho<br />&gt; každá úroveň = delší kód a víc bodů
            </div>
            <button onClick={start} style={{ background: GREEN, color: DARK_BG, border: "none", padding: "12px 26px", borderRadius: 4, fontWeight: 700, fontSize: 14, cursor: "pointer", letterSpacing: 2 }}>
              SPUSTIT HACK ▶
            </button>
          </>
        )}
        {phase === "show" && (
          <>
            <div style={{ fontSize: 11, color: GREEN + "66", marginBottom: 10 }}>&gt; zachycen přístupový kód:</div>
            <div style={{ fontSize: 32, letterSpacing: 8, fontWeight: 700 }}>{code}</div>
            <div style={{ fontSize: 11, color: GREEN + "66", marginTop: 10 }}>zapamatuj si ho...</div>
          </>
        )}
        {phase === "input" && (
          <>
            <div style={{ fontSize: 11, color: GREEN + "66", marginBottom: 10 }}>&gt; zadej kód zpaměti:</div>
            <div style={{ fontSize: 28, letterSpacing: 6, fontWeight: 700, minHeight: 40 }}>
              {entered}<span style={{ animation: "blink 0.8s infinite" }}>▌</span>
            </div>
            <div style={{ fontSize: 11, color: GREEN + "66", marginTop: 8 }}>{code.length - entered.length} znaků zbývá</div>
          </>
        )}
        {phase === "over" && (
          <>
            <div style={{ color: "#FF6B6B", fontSize: 17, fontWeight: 700, marginBottom: 6 }}>⛔ SPOJENÍ PŘERUŠENO</div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>Skóre: <b style={{ color: GREEN }}>{score}</b></div>
            {score >= best && score > 0 && <div style={{ color: GREEN, fontSize: 12, marginBottom: 8 }}>★ NOVÝ REKORD!</div>}
            <button onClick={start} style={{ background: GREEN, color: DARK_BG, border: "none", padding: "10px 22px", borderRadius: 4, fontWeight: 700, cursor: "pointer" }}>
              ZKUSIT ZNOVU
            </button>
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, maxWidth: 280, margin: "0 auto" }}>
        {[1,2,3,4,5,6,7,8,9,null,0,null].map((d, i) => d === null ? <div key={i} /> : (
          <button key={i} onClick={() => press(String(d))}
            disabled={phase !== "input"}
            style={{
              padding: "16px 0", fontSize: 18, fontWeight: 700, borderRadius: 4, cursor: "pointer",
              background: phase === "input" ? DARK_PANEL2 : DARK_PANEL, color: phase === "input" ? GREEN : GREEN + "66",
              border: `1px solid ${GREEN}44`,
            }}>{d}</button>
        ))}
      </div>

      <style>{`@keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }`}</style>
    </div>
  );
}

// ===== LEADERBOARD =====
function Leaderboard({ me }) {
  const [scores, setScores] = useState(null);

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

  if (!scores) return <div style={{ color: GREEN + "66" }}>počítám body...</div>;

  const max = Math.max(1, scores[0]?.total || 1);

  return (
    <div>
      <h2 style={{ fontSize: 16, letterSpacing: 2, marginBottom: 20, color: GREEN }}>🏆 VÁLKA RODIN</h2>

      {scores.map((t, i) => (
        <div key={t.id} style={{
          background: DARK_PANEL2,
          border: `1px solid ${GREEN}44`,
          borderRadius: 4, padding: "12px 14px", marginBottom: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "•"}</span>
            <span style={{ fontSize: 14 }}>{t.flag}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.color }}>{t.name}</span>
            <span style={{ marginLeft: "auto", fontWeight: 700, color: GREEN, fontSize: 15 }}>{t.total}</span>
          </div>
          <div style={{ height: 5, background: DARK_PANEL, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
            <div style={{ width: `${(t.total / max) * 100}%`, height: "100%", background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
          </div>
          <div style={{ fontSize: 10, color: GREEN + "66" }}>
            {t.count} agentů • her: <b>{t.gamePoints}</b> • bonus: <b>{t.bonusPoints}</b>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== ADMIN PANEL =====
function AdminPanel() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data: u } = await supabase.from("users").select("*");
      setUsers(u || []);
    };
    load();
  }, []);

  const deleteUser = async (username) => {
    await supabase.from("users").delete().eq("username", username);
    setUsers(users.filter(u => u.username !== username));
  };

  return (
    <div>
      <h2 style={{ fontSize: 16, letterSpacing: 2, marginBottom: 20, color: GREEN }}>🗂️ ŠTÁB VEDENÍ</h2>

      <div style={{ background: DARK_PANEL, border: `1px solid ${GREEN}44`, borderRadius: 4, padding: 14 }}>
        <h3 style={{ color: GREEN, marginTop: 0 }}>👥 Uživatelé ({users.filter(u => !u.is_admin).length})</h3>
        {users.filter(u => !u.is_admin).map((u) => (
          <div key={u.username} style={{ display: "flex", gap: 8, fontSize: 11, padding: "6px 0", borderBottom: `1px solid ${GREEN}44`, alignItems: "center" }}>
            <span>{u.avatar}</span>
            <span style={{ flex: 1 }}>{u.username}</span>
            <span style={{ color: TEAMS[u.team]?.color || GREEN + "66" }}>{TEAMS[u.team]?.flag}</span>
            {u.best_score > 0 && <span style={{ color: GREEN }}>{u.best_score}</span>}
            <button onClick={() => deleteUser(u.username)} style={{ background: "none", border: "none", color: "#FF6B6B", fontSize: 10, cursor: "pointer" }}>
              smazat
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== PROFILE =====
function Profile({ me, team, onLogout }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 48, marginTop: 30, marginBottom: 15 }}>{me.avatar}</div>
      <h2 style={{ color: GREEN, margin: "10px 0 2px", letterSpacing: 1, fontSize: 20 }}>{me.username}</h2>
      <div style={{ color: team.color, fontSize: 12, marginBottom: 30 }}>{team.flag} {team.name}{me.is_admin ? " · HLAVNÍ VEDOUCÍ" : ""}</div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 30 }}>
        <Stat label="REKORD" value={me.best_score || 0} />
      </div>

      <div style={{ background: DARK_PANEL, border: `1px solid ${GREEN}44`, borderRadius: 4, padding: 16, fontSize: 11, color: GREEN + "99", textAlign: "left", lineHeight: 1.6, maxWidth: 360, margin: "0 auto 24px" }}>
        <b style={{ color: GREEN }}>KODEX OMERTÀ:</b><br />
        1. Chraň svou rodinu a hraj fér.<br />
        2. Co se řekne v kanálu, zůstává v kanálu.<br />
        3. Body získáváš pro rodinu, ne pro sebe.<br />
        4. Don má vždy poslední slovo. 🎩
      </div>

      <button onClick={onLogout}
        style={{ background: "transparent", border: `1px solid #FF6B6B`, color: "#FF6B6B", padding: "10px 24px", borderRadius: 4, cursor: "pointer", letterSpacing: 1 }}>
        ODPOJIT SE ZE SÍTĚ
      </button>
    </div>
  );
}

// ===== KOMPONENTY =====
function Stat({ label, value }) {
  return (
    <div style={{ flex: 1, background: DARK_PANEL2, border: `1px solid ${GREEN}44`, borderRadius: 4, padding: "10px 6px", textAlign: "center", minWidth: 80 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>{value}</div>
      <div style={{ fontSize: 10, color: GREEN + "66", letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  );
}
