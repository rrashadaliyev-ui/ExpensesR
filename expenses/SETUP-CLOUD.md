# Put Expense Manager online (iPhone + PC, synced with your Google account)

About 20 minutes and free. You'll do two things:

- **Part A:** create a Firebase project. This is the database, and you sign in with your Google account.
- **Part B:** put the app on GitHub Pages. This gives it a web address that opens in Safari.

Use a **personal** Google account, not a work one.

---

## Part A: Firebase (database)

1. Go to https://console.firebase.google.com and sign in with your Google account.
2. Click **Create a project**. Name it, for example `my-expenses`. You can turn **off** Google Analytics. Click **Create project**.
3. **Turn on Google sign-in:**
   - In the left menu, go to **Build → Authentication → Get started**.
   - On the **Sign-in method** tab, click **Google**, turn on **Enable**, choose your support email, and click **Save**.
4. **Create the database:**
   - In the left menu, go to **Build → Firestore Database → Create database**.
   - Choose a location close to you (for example `eur3 (europe-west)`), then click **Next**.
   - Choose **Start in production mode**, then click **Create**.
5. **Set the security rules** (so only you can see your data):
   - Open the **Rules** tab, replace everything with the text below, and click **Publish**.

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

6. **Register the web app:**
   - Click the **⚙ (gear) → Project settings**, then scroll to **Your apps**.
   - Click the **`</>`** (Web) icon. Give it a nickname such as `expenses-web` and leave Hosting **unticked**. Click **Register app**.
   - You'll see a block like `const firebaseConfig = { apiKey: "...", authDomain: "...", ... };`. Copy the part from `{` to `}`.
7. **Paste it into the app:**
   - Open `js/firebase-config.js` in Notepad.
   - Replace `window.FIREBASE_CONFIG = null;` with `window.FIREBASE_CONFIG = { ...what you copied... };`
   - Save the file.

   These values only identify your project and aren't secret. Your data is protected by Google sign-in and the rules from step 5.

**Test on your PC:** right-click `serve.ps1` → **Run with PowerShell**, open http://localhost:8765, and click **Sign in with Google**. (Double-clicking `index.html` doesn't work for sign-in, because Google requires a web address.)

---

## Part B: GitHub Pages (web address for Safari)

1. Create a free account at https://github.com/signup.
2. Click **+ → New repository**:
   - Name: `expenses`
   - Visibility: **Public**. (Free GitHub Pages needs a public repository. Your *code* is public, but your *expenses* are not: they live in your Firebase database behind your Google sign-in.)
   - Click **Create repository**.
3. On the new repository page, click **uploading an existing file**.
   - Open your `expenses` folder in File Explorer, select **everything inside it** (index.html, the css and js folders, and the other files), and drag it into the browser.
   - Click **Commit changes**.
4. Go to **Settings → Pages**. Under *Build and deployment*, set Source to **Deploy from a branch** and Branch to **main**, folder **/ (root)**. Click **Save**.
5. Wait 1–2 minutes and refresh. The page shows **"Your site is live at `https://YOUR-NAME.github.io/expenses/`"**.
6. **Allow that address to sign in:** in the Firebase console, go to **Authentication → Settings → Authorized domains → Add domain** and enter `YOUR-NAME.github.io` (without `https://` or `/expenses`).

---

## Part C: Use it on your iPhone

1. Open `https://YOUR-NAME.github.io/expenses/` in **Safari** and sign in with Google.
2. Tap **Share → Add to Home Screen** so it opens like an app.
3. Anything you add on the phone appears on the PC and the other way round. The app refreshes when you switch back to it, or use **Settings → Sync now**.

If sign-in fails on iPhone, check **Settings → Safari** and make sure **Block Pop-ups** is off for this, or allow the popup when asked.

## Moving data you already have

On the old version, use **Settings → Download backup**. On the new, signed-in version, use **Settings → Restore from backup**.

## Updating the app later

Change the files in your `expenses` folder, then upload the changed files to the GitHub repository again (**Add file → Upload files**). The website updates within a minute or two.
