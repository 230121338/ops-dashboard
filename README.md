# Ops Dashboard (Vercel + Postgres edition)

Same dashboard, restructured to deploy on Vercel:

- **Frontend:** static `index.html` / `css/` / `js/` (served directly by Vercel, no build step)
- **Backend:** each file in `api/` is its own serverless function — Vercel maps `api/summary.js` to the route `/api/summary` automatically
- **Database:** Vercel Postgres (works from anywhere Vercel's functions run, unlike a local SQLite file which doesn't persist on serverless)

Everything below can be done from a phone browser — no terminal required.

## 1. Get the code onto GitHub

If you don't already have the project in a GitHub repo, the simplest phone-friendly path:

1. Go to **github.com**, sign in, create a new empty repository (no README/gitignore needed — you're uploading your own).
2. Open the repo, tap **Add file → Upload files**.
3. Upload every file from this project, keeping the folder structure (`api/`, `css/`, `js/`, `index.html`, `package.json`, etc.). Mobile browsers can be finicky about uploading whole folders at once — if the file picker only lets you select individual files, upload one directory's worth at a time (it'll ask for a commit message each time, which is fine).
4. Commit each batch directly to the `main` branch.

(If you get stuck on the folder upload step, an alternative is importing the zip into Replit first, then using Replit's built-in "Git" pane — it has a one-tap "Create Repo / Push" button that handles this for you without typing git commands.)

## 2. Create the Postgres database

1. Go to **vercel.com**, sign in (or sign up — GitHub login works).
2. Tap **Add New → Project**, and import the GitHub repo you just created.
3. Before or after the first deploy, go to the project's **Storage** tab → **Create Database** → choose **Postgres**.
4. Connect it to your project. Vercel automatically adds `POSTGRES_URL` (and a few related env vars) to your project — you don't type these in yourself.

## 3. Set your seed secret

1. In the Vercel project, go to **Settings → Environment Variables**.
2. Add `SEED_SECRET` with any long random value you make up (this just stops strangers from hitting your seed endpoint).
3. Redeploy if prompted (Vercel usually does this automatically after an env var change).

## 4. Deploy

If you connected the GitHub repo in step 2, Vercel already deployed it. Every push to `main` redeploys automatically. You can also tap **Deploy** manually from the project dashboard.

## 5. Seed the database

Once deployed, open this URL in your phone browser (swap in your real domain and secret):

```
https://your-app.vercel.app/api/seed?secret=YOUR_SEED_SECRET
```

You should get a JSON response like `{"ok":true,"customers":60,"products":10,"orders":250}`. That's it — the tables are created automatically the first time any API route runs, so there's no separate migration step.

## 6. Open the dashboard

```
https://your-app.vercel.app
```

## Notes

- Re-visiting the `/api/seed` URL clears and regenerates sample data — handy for resetting, but don't leave `SEED_SECRET` easy to guess if this ever holds real data.
- To point this at real data instead of the sample generator, ignore `api/seed.js` and just insert directly into the `customers` / `products` / `orders` tables (schema is defined in `api/_lib/db.js`) using whatever import process fits your source data.
- No authentication is set up on the dashboard itself — anyone with the URL can view it. Add auth (e.g. Vercel's password protection on the project, or a proper login) before putting anything sensitive in here.
