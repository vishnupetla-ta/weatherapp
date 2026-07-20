# 🌌 AetherWeather · Weather Intelligence Platform

A high-fidelity weather intelligence application featuring real-time meteorological conditions, 7-day dynamic forecasts, smart environmental exposure indices, and a tailored AI Weather Planner. Wrapped in a beautiful custom **Frosted Glass** (glassmorphism) theme with smooth responsive transitions.

---

## 🛠️ GitHub & Cloudflare Integration Guide

This guide details how to synchronize your **Google AI Studio** project with **GitHub**, and subsequently deploy it globally with high performance using **Cloudflare Pages**.

---

### 1. Connecting Google AI Studio to GitHub

Google AI Studio allows seamless integration with GitHub for version control, backup, and downstream CI/CD deployment pipelines.

#### How to Export / Sync to GitHub:
1. **Open Settings**: Click on the **Settings/Gear Icon** in the top-right corner of your AI Studio Build workspace.
2. **Export to GitHub**: Select the **Export to GitHub** option.
3. **Authorize GitHub**: If you haven't already, sign in and authorize the Google AI Studio application with your GitHub account.
4. **Create or Link Repository**:
   - Choose **Create a new repository** (make it Public or Private as needed).
   - Alternatively, link it to an existing repository in your GitHub account.
5. **Commit & Push**: Once linked, your file tree (`package.json`, `src/`, `vite.config.ts`, etc.) will be committed and pushed directly to the designated branch (usually `main` or `master`).

---

### 2. Connecting Cloudflare Pages to your GitHub Repository

Cloudflare Pages is a modern JAMstack platform that serves high-performance, edge-rendered static sites. Since this application is a client-side React + Vite SPA, it deploys on Cloudflare in minutes.

#### Step-by-Step Deployment Guide:

#### Step 2.1: Initiate Cloudflare Pages Project
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation sidebar, click on **Workers & Pages**.
3. Click the **Create** button and select the **Pages** tab.
4. Click **Connect to Git** to hook Cloudflare into your Git provider.

#### Step 2.2: Select Repository
1. Select **GitHub** as your Git provider.
2. Select your authorized GitHub account and find the repository you exported from AI Studio in **Step 1**.
3. Click **Install & Authorize** if requested, and select **Begin setup**.

#### Step 2.3: Configure Build & Deployment Settings
Configure the build system so Cloudflare compiles your Vite React code correctly:
* **Project Name**: Choose a name (this will become your default `https://<project-name>.pages.dev` subdomain).
* **Production Branch**: Set this to `main` (or whichever branch Google AI Studio commits to).
* **Framework Preset**: Select **Vite** from the dropdown. This automatically fills the standard settings:
  - **Build command**: `npm run build`
  - **Build output directory**: `dist`
  - **Root directory**: `/` (Leave empty or default)

#### Step 2.4: Configure Node.js Version (Recommended)
Vite works best on modern Node.js versions. To prevent compilation errors on Cloudflare:
1. Scroll to **Environment Variables** in the build configuration window.
2. Add a new variable:
   - **Variable name**: `NODE_VERSION`
   - **Value**: `18` or `20` (or higher)

#### Step 2.5: Save and Deploy!
1. Click **Save and Deploy**.
2. Cloudflare will provision a build container, install your dependencies (`package.json`), run `npm run build` to output the optimized static build into `dist/`, and upload it to Cloudflare's ultra-fast Edge Network.
3. Once completed, you will receive a public production URL (e.g., `https://aetherweather.pages.dev`).

---

### 🔄 Automatic CD (Continuous Deployment)
Once connected, **every commit made inside Google AI Studio** that gets synced or pushed to your GitHub repository will **automatically trigger a new build on Cloudflare**. Cloudflare compiles the changes in the background and rolls them out without any manual intervention.

---

## 📈 Local Development & Standard Setup

To run this project locally outside of Google AI Studio or Cloudflare:

1. **Clone the repo**:
   ```bash
   git clone <your-github-repo-url>
   cd aetherweather
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local development server**:
   ```bash
   npm run dev
   ```
   *The server will boot on `http://localhost:3000` (or the configured port).*

4. **Verify / Lint the code**:
   ```bash
   npm run lint
   ```
