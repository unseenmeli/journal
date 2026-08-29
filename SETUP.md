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
ask.html          კითხვა ექიმს — question form (connected to Supabase)
about.html        ჩვენ შესახებ — president's address
category-children.html   ბავშვთა და მოზარდთა ჯანმრთელობა — article listing
article-pcos.html        PCOS interview with Prof. Elene Asanidze
questionarySECR.html   private questions panel (unlisted URL, no auth yet)
css/style.css     design tokens + all styles, numbered sections
js/main.js        mobile menu, sticky header, scroll reveal
js/ask.js         form validation + Supabase insert for ask.html
js/panel.js       questions panel: tabs, search, read-tracking
js/gate.js        admin login screen for questionarySECR.html
js/share.js       Facebook share + copy link for articles
js/config.js      Supabase URL + publishable key
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

---

## კითხვა ექიმს — `ask.html`

The question form page. UI, validation, and states are complete; **storage is not
wired up yet**.

Fields: `firstName`, `lastName`, `phone` (required), `category` (optional),
`question` (required), `consent` (required).

Behaviour already built:

- Georgian inline validation, shown on blur and cleared as you type
- phone auto-formats to `5XX XX XX XX` and validates as a 9-digit Georgian mobile
  starting with `5`; submitted normalised to E.164 (`+995599123456`)
- 1500-char counter that turns coral near the limit
- submit button locks during send to prevent double submission
- success card replaces the form, with a "კიდევ ერთი კითხვა" reset
- `role="status"` live region announces errors and success to screen readers
- 112 emergency notice, so the form is not mistaken for urgent care

### ✅ Supabase — already connected

Project: `cxthvlxjsgbgeqmsdbtf.supabase.co`. Credentials live in **`js/config.js`**
(the publishable key — formerly called the anon key — is public by design and safe
in browser code).

Verified working end-to-end: form submit → row in `questions` → appears in
`questionarySECR.html` → read checkmark writes `is_read` back.

To clear test data, run in the SQL Editor:

```sql
delete from questions;
alter sequence questions_id_seq restart with 1;
```

### Admin login on `questionarySECR.html`

The panel is hidden behind a login screen. Admin accounts live in an `admins` table;
passwords are stored as SHA-256 hashes, never in plaintext.

Run once in the SQL Editor:

```sql
create table admins (
  id           bigint generated always as identity primary key,
  username     text not null unique,
  pass_hash    text not null,
  display_name text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table admins enable row level security;

create policy "anon can read admins" on admins
  for select to anon using (true);
```

Then add users (these two are examples — change the passwords):

```sql
insert into admins (username, pass_hash, display_name) values
  ('elene', 'ba56133c69bda763c31b7b2cd1ea3df272dae66b202facc6c061b24713073c1c', 'ელენე ასანიძე'),
  ('davit', '6051fc84a7a0d74c225fb18a496b09952da5642e60723ecae543298edd7d82d6', 'დავით ასანიძე');
```

`elene` → `garsh2026`, `davit` → `admin2026`.

**To add another admin or change a password**, generate the hash first:

```bash
printf '%s' 'YOUR_PASSWORD' | shasum -a 256
```

then `insert into admins ...` or
`update admins set pass_hash = '<hash>' where username = '<name>';`

To disable someone without deleting them:
`update admins set is_active = false where username = '<name>';`

Login lasts 8 hours (stored in `localStorage`), and the logout button in the panel
header clears it. The panel fetches no data until login succeeds.

### ⚠️ Security state — read before going live

**The login screen is not real authentication.** The check happens in the browser, so
anyone who opens devtools can read the publishable key and query `questions` directly,
bypassing the login entirely. The `admins` table is also readable, which exposes
usernames and password hashes to offline cracking — so use passwords that are not
reused anywhere else.

What it does do: stop a casual visitor who lands on the URL from seeing patient data.
That is real, but limited, value.

For genuine protection, replace this with **Supabase Auth**: create the users under
Authentication → Users, swap `gate.js` for `client.auth.signInWithPassword()`, and
change the `questions` policies from `to anon` to `to authenticated`. The database
then enforces access itself, and no amount of devtools poking gets around it. That is
the change to make before this holds real patient data on a public domain.

There is **no authentication**, by choice. That means, for anyone who has or guesses
the page URL and reads the key out of the page source:

- every patient question, name and phone number is readable
- anyone can insert questions (spam) and flip `is_read`

Deletes are currently blocked (no delete policy exists) — that part is right, and
worth keeping that way.

`questionarySECR.html` sends `noindex, nofollow` so search engines will not list it,
but that stops crawlers, not people.

### Old notes on wiring up storage

Open `js/ask.js` and find `sendToBackend(data)` — it currently just `console.log`s
the payload and resolves after 700ms. Replace the body with a real request; the
commented-out `fetch` in that function shows the shape.

`data` looks like:

```json
{
  "firstName": "ნინო",
  "lastName":  "ბერიძე",
  "phone":     "+995599123456",
  "category":  "ორსულობა",
  "question":  "...",
  "createdAt": "2026-08-25T21:31:35.098Z"
}
```

**Important:** a browser page cannot write to an Excel file (or a OneDrive
spreadsheet) directly — there is no endpoint to POST to and no safe way to hold a
credential in front-end JavaScript, since anything shipped to the browser is public.
Something server-side has to receive the POST and do the writing. Options, cheapest
first:

1. **Microsoft Power Automate** — an "When an HTTP request is received" trigger plus
   an "Add a row into a table" action against the OneDrive workbook. Gives you a URL
   to paste into `sendToBackend`, no server to run. Best fit if the sheet must stay
   on OneDrive.
2. **Google Sheets + Apps Script** — same idea if the sheet can live in Google Sheets;
   `doPost(e)` deployed as a web app.
3. **Supabase** (already scaffolded in `js/db.js`) — store questions in Postgres and
   export to Excel when needed. The right choice if the messaging system is still
   planned, since a spreadsheet cannot support doctor↔patient replies.

Note that with 1 and 2, the endpoint URL is visible in the page source, so anyone
could post to it. Add a shared secret and rate limiting if spam becomes an issue.

---

## Facebook share

Each article has a Facebook share button (`js/share.js`) and a tag list at the end.

**How Facebook decides what to show:** it fetches the page at `og:url` and reads the
`og:` meta tags — not anything the button sends. So two things must be true:

1. **The page must be publicly reachable.** Facebook's crawler cannot see `localhost`,
   so the image preview will not appear while testing locally. The button still opens
   the correct share dialog.
2. **`og:image` and `og:url` must be absolute URLs.** They are currently set to
   `https://meddialog.ge/...`.

**When the domain is confirmed**, update those two tags in each article's `<head>`.
If it is not `meddialog.ge`, search and replace:

```bash
grep -rl 'meddialog.ge' *.html | xargs sed -i '' 's|https://meddialog.ge|https://YOURDOMAIN|g'
```

**The share image** is `assets/img/art-pcos-share.jpg`, built at Facebook's preferred
1200×630. The source cover is nearly square, so a straight crop would have cut off the
MedDialog header and the Georgian caption. Instead the whole cover is fitted onto a
teal canvas — nothing important is lost. To make one for a new article:

```python
from PIL import Image
src = Image.open('cover.jpg').convert('RGB')
w, h = src.size
canvas = Image.new('RGB', (1200, 630), (23, 83, 79))   # --teal-dark
fitted = src.resize((int(w * 630 / h), 630), Image.LANCZOS)
canvas.paste(fitted, ((1200 - fitted.width) // 2, 0))
canvas.save('assets/img/art-NAME-share.jpg', quality=88, optimize=True)
```

After changing an image Facebook keeps the old one cached — clear it with the
[Sharing Debugger](https://developers.facebook.com/tools/debug/).

The **copy-link** button next to it uses the Clipboard API, which only works over
HTTPS or on localhost; there is an `execCommand` fallback for older browsers.

**Tags** are plain `<li>` items in `.tags__list`. They sit on one horizontally
scrolling row rather than wrapping, so a long tag list never pushes the article
layout around. They are not links yet — when tag archive pages exist, wrap each in
an `<a>`; the styling already accounts for it.

## Still to build

- inner pages (სტატიები, ინტერვიუ, კონტაქტი) — `ჩვენ შესახებ` is done
- category pages for the other five homepage cards — copy `category-children.html`,
  swap the title/crumb and the article list. Articles follow `article-pcos.html`:
  `.post__q` for each question, plain `<p>` for answers, `.post__note` for the
  closing summary.
- add Supabase Auth before going live (see security note above)
- the doctors' section (`.docs`) links to `#` — point the four items and the
  "მესტუმრე ექიმებისთვის" button at the professional pages once they exist
- the search button and the KA/EN language switcher are styled but inert
- article listing and detail pages, reading from `DB.fetchArticles()`
- the "კითხვა ექიმს" form and the doctor-facing messaging inbox
