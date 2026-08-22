# ექიმთან დიალოგი — Setup

Medical journal for the **Georgian Association of Reproductive and Sexual Health (GARSH)** —
საქართველოს რეპროდუქციული და სქესობრივი ჯანმრთელობის ასოციაცია.

Plain HTML / CSS / JS. No build step, no framework, no npm install.

---

## Running locally

```bash
cd ~/projects/journal
python3 -m http.server 8899
```

Then open <http://localhost:8899>.

Opening `index.html` directly via `file://` works too, but use the server —
`file://` blocks `fetch`, which the Supabase layer will need later.

---

## Files

```
index.html        homepage (all content, in Georgian)
css/style.css     design tokens + all styles, numbered sections
js/main.js        mobile menu, sticky header, scroll reveal
js/db.js          Supabase data layer — NOT yet wired into index.html
assets/img/       photos go here (see below)
```

`css/style.css` is organised in numbered sections (1. tokens … 11. print).
All colors, fonts, radii and spacing live as CSS variables in `:root` at the top —
change the brand there and the whole site follows.

---

## Fonts

Georgian is served by **Noto Serif Georgian** (headings) and **Noto Sans Georgian** (body),
loaded from Google Fonts in `index.html`.

Worth knowing: Google Fonts has only **three** fonts with Georgian glyph coverage, and
only these two are usable. The decorative rounded face in the original mockup is not
available as a webfont. Noto Serif Georgian is the closest match with real Georgian
letterform design rather than a fallback.

The sibling `geoarsh` project loads Poppins/Manrope, neither of which contains Georgian
glyphs — its Georgian text silently falls back to system fonts. This project does not
have that problem.

---

## Replacing the placeholder images

The **logo is already in place** — `assets/img/logo.jpg` (1800×1800 original), served
as `logo-160.jpg` (1×) and `logo-320.jpg` (2× retina) via `srcset`, and also used as
the favicon.

That JPEG has a hard white background, which showed as a white square against the cream
header. `.brand__mark` uses `mix-blend-mode: multiply` to dissolve the white into the
page background. If you ever get a transparent PNG or SVG version of the logo, drop the
`mix-blend-mode` line — it is only there to compensate for the flat JPEG background.

The **hero photo is also in place** — `assets/img/hero.jpg` (1535×1024) with an 800px
variant for small screens, wired through `srcset`/`sizes`. Because the source is 3:2
landscape and the hero frame is taller, `object-position: 42% center` keeps the doctor
in frame when `object-fit: cover` crops the sides. Adjust that percentage if you swap
the photo.

The remaining placeholders are the six category cards — `<div class="ph">` blocks.
Swap each for a real `<img>`.

**Category cards** — replace the `<div class="ph">…</div>` inside each `.card__media`
with an `<img>`. Also remove the inline `style="background:…"` from that element once a
real image is in place.

Suggested sizes:

| File | Size | Used for |
|---|---|---|
| `logo.jpg` | 1800×1800 | ✅ already added |
| `hero.jpg` | 1535×1024 | ✅ already added |
| `cat-womens.jpg` … | 600×600 (square) | the six category cards |

Optimise before committing: `cwebp -q 82 hero.jpg -o hero.webp`.

---

## Connecting Supabase (for the messaging system)

`js/db.js` is written and ready but **deliberately not loaded yet** — the homepage
needs no database. Wire it up when you build the "კითხვა ექიმს" feature.

### 1. Create the project

Sign up at <https://supabase.com>, create a project, and copy the **Project URL** and
the **anon public** key from Project Settings → API.

The `anon` key is safe to ship in browser code — it is designed to be public, and
access is controlled by Row Level Security. **Never** put the `service_role` key in
front-end code; it bypasses all RLS.

### 2. Create the tables

Run this in the Supabase SQL editor:

```sql
create table questions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  category    text,
  body        text not null,
  status      text not null default 'new',
  created_at  timestamptz not null default now()
);

create table messages (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references questions(id) on delete cascade,
  body         text not null,
  sender_role  text not null check (sender_role in ('patient','doctor')),
  created_at   timestamptz not null default now()
);

create index on messages (question_id, created_at);

create table articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  excerpt       text,
  body          text,
  cover_url     text,
  category      text,
  published     boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);
```

### 3. Turn on Row Level Security

Without this, anyone with the anon key can read every patient's medical question.
This is health data — do not skip it.

```sql
alter table questions enable row level security;
alter table messages  enable row level security;
alter table articles  enable row level security;

-- anyone may submit a question
create policy "anyone can ask"
  on questions for insert to anon with check (true);

-- published articles are public
create policy "published articles are public"
  on articles for select to anon using (published = true);
```

Reading questions and messages is intentionally left with **no anon policy**, so
patient conversations are not publicly readable. Add policies scoped to
`auth.uid()` once you add authentication — that is the right time to design who
can see a thread (the patient who opened it, and doctors).

### 4. Enable realtime

In the dashboard: Database → Replication → enable replication for `messages`.
That is what makes `DB.subscribeToMessages()` fire.

### 5. Load it in the page

Add before `js/main.js` in `index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/db.js"></script>
```

Then fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY` at the top of `js/db.js`.

### Using it

```js
// submit a question
const { data, error } = await DB.submitQuestion({
  name: 'ნინო', email: 'nino@example.com',
  category: 'ორსულობა', body: 'კითხვის ტექსტი...'
});

// live-update a conversation
const sub = DB.subscribeToMessages(questionId, (msg) => {
  console.log('ახალი შეტყობინება:', msg.body);
});
sub.unsubscribe();   // when leaving the page
```

---

## Why Supabase

InstantDB shut down. Supabase was chosen because it is Postgres with realtime
WebSocket subscriptions, it loads from a CDN `<script>` tag with no build step
(which keeps this project plain HTML/JS), it has built-in auth and row-level
security — necessary for medical data — and it can be self-hosted later without
rewriting the client code.

The alternatives considered: **Firebase Firestore** (simplest realtime, but NoSQL
modelling and vendor lock-in) and **PocketBase** (single Go binary, self-hosted,
good if you want to own the server the way `geoarsh` is owned on Fly.io).

Everything database-related is isolated in `js/db.js` on purpose. If the backend
ever changes, that one file changes and the UI code does not.

---

## Accessibility notes

Already in place, worth preserving when editing:

- `<html lang="ka">` so screen readers use Georgian pronunciation
- skip link to main content
- `aria-current="page"` on the active nav item
- `aria-expanded` on the burger and language buttons, kept in sync in JS
- visible focus rings (`:focus-visible`)
- decorative SVGs marked `aria-hidden="true"`; meaningful buttons have `aria-label`
- `prefers-reduced-motion` disables the float and reveal animations

## Still to build

- inner pages (ჩვენ შესახებ, სტატიები, ინტერვიუ, კითხვა ექიმს, კონტაქტი)
- the doctors' section (`.docs`) links to `#` — point the four items and the
  "მესტუმრე ექიმებისთვის" button at the professional pages once they exist
- the search button and the KA/EN language switcher are styled but inert
- article listing and detail pages, reading from `DB.fetchArticles()`
- the "კითხვა ექიმს" form and the doctor-facing messaging inbox
