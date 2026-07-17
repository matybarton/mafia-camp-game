# 🎭 MAFIA CAMP - Hackerská hra na táboře

Kompletní online hra pro táborové soutěže s profily, týmovým chatem, minihrou a žebříčkem.

## 📋 Shrnutí

- ✅ Registrace a přihlašování s účty
- ✅ Osm týmů (mafií) se symboly a kódy
- ✅ Týmové chaty (vidí jen členi a admini)
- ✅ Admin feed s rozkazmi pro všechny
- ✅ Minihra: Hack firewallu (zapamatování kódů)
- ✅ Žebříček s automatickým sčítáním bodů
- ✅ Admin panel pro správu účtů a bonus bodů
- ✅ Data se synchronizují v reálném čase

---

## 🚀 Setup (5 minut)

### 1️⃣ Vytvoř si Supabase projekt (zdarma)

1. Jdi na https://supabase.com
2. Klikni "Sign Up" → zaregistruj se (e-mail stačí)
3. Vytvoř nový projekt:
   - **Project Name**: `mafia-camp-game`
   - **Database Password**: vymysli si libovolné heslo
   - **Region**: Europe (nejblíž)
   - Čekej ~2 minuty, než se projekt vytvoří
4. Až se načte, jdi do **Settings → API**
5. Zkopíruj:
   - **Project URL** (něco jako `https://xxxxx.supabase.co`)
   - **anon public** → zkopíruj klíč

### 2️⃣ Vyplň si Supabase údaje

Otevři soubor `src/config.js` a vlož:
```javascript
export const supabaseUrl = "VLOŽÍŠ_SVŮJ_PROJECT_URL";
export const supabaseKey = "VLOŽÍŠ_SVŮJ_ANON_PUBLIC_KEY";
```

### 3️⃣ Vytvoř tabulky v Supabase

V Supabase přejdi do **SQL Editor** a spusť tento skript:

```sql
-- Users (profily hráčů)
CREATE TABLE users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  avatar TEXT,
  team TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  best_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Zprávy v chatech
CREATE TABLE messages (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  team TEXT NOT NULL,
  author TEXT NOT NULL,
  avatar TEXT,
  text TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Feed (rozkazy od dona)
CREATE TABLE feed_posts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT,
  text TEXT NOT NULL,
  is_mission BOOLEAN DEFAULT FALSE,
  author TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bonus body za soutěže
CREATE TABLE team_bonuses (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  team TEXT UNIQUE NOT NULL,
  bonus_points INT DEFAULT 0
);

-- Admin kódy pro přidávání dalších adminů
CREATE TABLE admin_codes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4️⃣ Stáhni si projekt a instaluj

```bash
# Stáhni soubory (máš je tady)
# V terminálu jdi do složky mafia-camp-game

cd mafia-camp-game
npm install
npm run build
```

### 5️⃣ Nahraj na Netlify (ZDARMA)

1. Jdi na https://netlify.com
2. Zaregistruj se (GitHub, Google, email)
3. Klikni **"New site from Git"** 
   - Nebo **"Drag and drop"** → vezmi složku `dist`
4. Vyber Deploy settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Klikni Deploy
6. Čekej ~2 minuty
7. **Dostaneš odkaz typu**: `https://mafia-camp-game.netlify.app` ✅

**Chceš vlastní doménu?** (např. `moje-mafia.cz`)
- Kup si doménu na GoDaddy/Namecheap
- V Netlify: Domain → Custom domain
- Přidej DNS záznamy (návod Ti Netlify dá)

---

## 🔐 Bezpečnost & Data

**Data se ukládají v Supabase** (tvoje databáze):
- Hesla nejsou šifrovaná (pro táborovku OK, ale nepoužívej reálné heslo!)
- Všichni vidí vzájemně profily a body
- Admin vidí všechny chaty a uživatele
- Kde se data ukládají? V Supabase, který je v EU (GDPR OK)

**Jak dlouho data zůstanou?**
- Pokud si Supabase nemagneťuješ → zůstanou navždy
- Pokud si smazeš Supabase projekt → všechno pryč
- Doporučuji: Zálohuj si je na konci tábora

---

## 📲 Jak to funguje v praxi

### Admin (ty):
1. Registruješ se s kódem: `DON-2026`
2. V admin panelu vidíš:
   - Všechny účty
   - Všechny chaty
   - Generátor admin kódů (dáš kamarádům)
   - Přidávání bonus bodů k týmům

### Hráč:
1. Registruje se s kódem své mafie (např. `CZE-KMOTR`)
2. Vidí jen svůj týmový chat
3. Může hrát minihru (hack firewallu) → body se samy počítají
4. Vidí žebříček všech týmů
5. Přihlásí se z mobilu → funguje všechno

---

## 🎮 Kódy týmů

```
🇲🇽 Mexická mafie      → MEX-SICARIO
🇨🇿 Česká mafie        → CZE-KMOTR
🇮🇹 Italská mafie      → ITA-OMERTA
🇺🇸 Americká mafie     → USA-CAPONE
🇯🇵 Japonská mafie     → JPN-YAKUZA
🇷🇺 Ruská mafie        → RUS-BRATVA
🏴 Anglická mafie      → ENG-KRAYS
🎭 Tajná mafie         → X-FANTOM
```

**Admin kód:** `DON-2026`

Více adminů si vygeneruj v admin panelu (+ NOVÝ ADMIN KÓD).

---

## 🛠️ Troubleshooting

**Chyba: "config.js not found"**
- Zajisti, že si vyplnil `src/config.js` se svým Supabase URL a klíčem

**Chyba: "Cannot connect to Supabase"**
- Zkontroluj, jestli jsou údaje v `config.js` správně zkopírované
- Zkontroluj, že Supabase projekt běží (přejdi na supabase.com → projects)

**Heslo nefunguje po přihlášení**
- Hesla se ukládají jako text (pro táborovku OK)
- Zkontroluj, že sis zadal správně jméno i heslo

**Netlify deployment selhává**
- Zkontroluj `npm run build` lokálně – musí fungovat
- V Netlify settings zkontroluj, že `dist` je správný output dir

---

## 📞 Další pomoc

Pokud ti něco nefunguje, sehni si:
- Supabase dokumentaci: https://supabase.com/docs
- Netlify Deploy: https://docs.netlify.com/

Nebo napiš! 🎩

---

## 📝 Tipy na rozšíření

Všechno můžeme později přidat:
- Více minigames
- Tajné mise pro konkrétní tým
- Odpočet doby hry
- Export dat jako CSV
- Real-time notifikace
- Darkmode / jiný design
- ... cokoliv!

**Teď si jen vychutni hru!** 🎯
