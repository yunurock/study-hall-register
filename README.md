# Study Hall Register — Node.js + MySQL

## What changed
- `public/index.html` and `public/admin.html` are your original two pages, unchanged
  except that data is now saved/loaded through the API (`fetch('/api/state')`)
  instead of the browser's local storage.
- `server.js` is a small Express server that exposes that API and talks to MySQL.
- `schema.sql` creates the three tables it needs: `settings`, `students`, `payments`.

## 1. Create the database
Run `schema.sql` once against your MySQL database (Railway's MySQL plugin gives you
a connection string and a way to run SQL — either through their dashboard's query
tab, or with any MySQL client using the credentials Railway gives you).

## 2. Configure environment variables
Copy `.env.example` to `.env` and fill in the values Railway gives you for its
MySQL plugin (host, user, password, database name, port). On Railway itself you'll
set these as project environment variables rather than a local `.env` file — same
names, same values.

## 3. Install and run locally (optional, to test first)
```
npm install
npm start
```
Then open `http://localhost:3000` — that serves `index.html`, and
`http://localhost:3000/admin.html` serves the admin page.

## 4. Deploy to Railway
1. Push this folder to a GitHub repo (or use Railway's CLI to deploy directly).
2. In Railway: New Project → Deploy from GitHub repo, pick this repo.
3. Add a MySQL plugin/database to the same project.
4. Copy the MySQL plugin's connection details into your app's environment
   variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`).
5. Railway auto-detects `npm start` from `package.json` — no extra config needed.
6. Once deployed, Railway gives you a public URL. That URL serves both pages —
   e.g. `https://yourapp.up.railway.app/` (registration) and
   `https://yourapp.up.railway.app/admin.html` (admin).

## Notes
- Both pages now depend on the server being reachable — they won't work if you
  open the HTML files directly from disk anymore (no `file://`). That's expected:
  MySQL only exists on your server, not in the browser.
- The "Back to Register" and "⚙ Admin" links inside the pages keep working as-is
  since both pages are served from the same app.
- UPI payment proof screenshots are stored as base64 text in the `payments` table.
  Fine for a study hall's volume of data; if this ever needs to scale to thousands
  of students with photos, moving those to file storage (e.g. S3) instead of the
  database would be the next step — not needed for now.
