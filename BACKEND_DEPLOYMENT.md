# Backend Deployment Guide for OmniLedger

Since OmniLedger uses an Express API with a SQLite database, deploying the backend requires a hosting environment that supports **persistent storage** (so your databases do not get wiped out when the server restarts or goes to sleep).

Here are the detailed steps for deploying to **Render** or **Railway**.

---

## Method A: Deploying on Render (Recommended & Free Tier Friendly)

Render provides Web Services and supports attaching a persistent disk/volume.

### Step 1: Create a Render Web Service
1. Sign in to [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Set the following configuration:
   * **Name**: `omniledger-backend`
   * **Runtime**: `Node`
   * **Build Command**: `cd server && npm install`
   * **Start Command**: `cd server && npm start`
   * **Instance Type**: `Free` (or any tier you prefer)

### Step 2: Attach a Persistent Disk (Crucial for SQLite)
Since the Free tier restarts and spins down containers, you must store your SQLite database files on a persistent disk:
1. Go to your Web Service dashboard in Render.
2. In the left-hand menu, click **Disk** (or **Volumes**).
3. Click **Add Disk** and configure:
   * **Name**: `database-volume`
   * **Mount Path**: `/var/data`
   * **Size**: `1 GiB` (more than enough for SQLite)

### Step 3: Configure Environment Variables
Go to **Environment** in your Render dashboard and add the following:
* `PORT` = `3001` (Render will map this to the internet automatically via HTTPS)
* `DATABASE_PATH` = `/var/data/database.sqlite` (points database to the persistent disk)
* `ARCHIVE_DATABASE_PATH` = `/var/data/archive.sqlite` (points archive database to the persistent disk)

*Note: If you are using real Firebase Auth instead of Guest mode, also copy-paste the contents of your `serviceAccountKey.json` into a file or variable if needed, or simply let the backend run in development/guest fallback mode.*

---

## Method B: Deploying on Railway (High Performance & Fast Setup)

Railway is excellent for quick deployments and supports persistent volume mounts.

### Step 1: Create a Railway Project
1. Log in to [Railway](https://railway.app/).
2. Click **New Project** > **Deploy from GitHub repo**.
3. Choose your repository.
4. Under **Settings**:
   * **Root Directory**: `server`
   * **Start Command**: `npm start`

### Step 2: Add a Persistent Volume
1. Go to your service details on Railway.
2. Under the **Volume** tab, click **Add Volume**.
3. Set the mount path to `/var/data`.

### Step 3: Add Variables
Under the **Variables** tab, add:
* `DATABASE_PATH` = `/var/data/database.sqlite`
* `ARCHIVE_DATABASE_PATH` = `/var/data/archive.sqlite`
* `PORT` = `3001`

---

## Connecting the Vercel Frontend to Deployed Backend

Once your backend is deployed (e.g., hosted at `https://omniledger-backend.onrender.com` or similar):

1. Go to your **Vercel Dashboard**.
2. Open your project page and go to **Settings > Environment Variables**.
3. Add a new variable:
   * **Key**: `VITE_API_URL`
   * **Value**: `https://your-deployed-backend-url.onrender.com` (no trailing slash)
4. Trigger a new deployment on Vercel (or push a commit) so the frontend builds with the new backend URL.
