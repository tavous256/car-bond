CAR BOND — SETUP GUIDE (phone only, free)
==========================================

You will do 4 things:
  1. Create the free database (Supabase)
  2. Put your database keys into config.js
  3. Put the app online for free (GitHub Pages)
  4. Install it on your phone

Use Chrome on your phone. If a website looks cramped or a button is missing,
open Chrome's ⋮ menu and tick "Desktop site".
Menu names on these websites can change a little over time; look for the closest match.


STEP 1 — DATABASE (about 10 minutes)
-------------------------------------
1. Go to supabase.com and sign up (you can use your Google account).
2. Tap "New project". Name: Car Bond. Make up a database password and save it.
   Choose the region closest to Uganda that is offered, then create the project.
   Wait 1–2 minutes while it starts.
3. Open "SQL Editor" from the left menu, then "New query".
4. Open the file supabase-setup.sql from this folder, copy ALL of it,
   paste it into the SQL Editor and tap "Run". You should see "Success".
5. Open "Authentication", then "Sign In / Providers" (or "Providers").
   Turn ON "Allow anonymous sign-ins" and save.
   (This lets sellers post without making an account. Their listings are linked to their phone.)
6. Open "Project Settings", then "API" (or "Data API" / "API Keys").
   Copy two things:
     - Project URL        (looks like https://abcdxyz.supabase.co)
     - anon public key    (a long text starting with eyJ...  or  sb_publishable_...)
   These two are safe to put in the app. NEVER use the "service_role" or "secret" key.


STEP 2 — ADD YOUR KEYS
-----------------------
Easiest: send the Project URL and anon public key to Claude in the chat and ask
for an updated config.js, then use that file.

Or do it yourself later on GitHub (Step 3, point 6).


STEP 3 — PUT IT ONLINE (about 10 minutes)
------------------------------------------
1. Go to github.com and sign up. Your username becomes part of your app link.
2. Tap "+" then "New repository". Name it: car-bond
   Choose "Public" and tick "Add a README file". Tap "Create repository".
3. In the new repository tap "Add file" then "Upload files".
4. Select ALL these files from the unzipped folder:
     index.html  app.js  config.js  sw.js  manifest.webmanifest
     icon-192.png  icon-512.png  maskable-512.png  apple-touch-icon.png
   (You don't need to upload README.txt or supabase-setup.sql.)
   Tap "Commit changes".
5. Tap "Settings" then "Pages". Under "Build and deployment", Source: "Deploy from a branch",
   Branch: "main" and "/ (root)". Tap "Save".
   After 1–3 minutes your app is live at:
       https://YOUR-USERNAME.github.io/car-bond/
6. If you still need to add your keys: open config.js in the repository,
   tap the pencil (Edit), replace the two PASTE_... texts with your Project URL and
   anon public key (keep the quotes), then "Commit changes". Wait a minute.


STEP 4 — INSTALL ON YOUR PHONE
-------------------------------
Open your app link in Chrome.
 - Tap the yellow "Install app" button at the top, or
 - Chrome ⋮ menu  →  "Install app" / "Add to Home screen".
On iPhone: open the link in Safari  →  Share  →  "Add to Home Screen".

Car Bond now has its own icon and opens full screen like any other app.
Share the same link with friends and customers so they can install it too.


GOOD TO KNOW
------------
- Updating the app: upload the changed file to GitHub again (it replaces the old one).
  People get the update the next time they open the app with internet.
- Free Supabase projects can be paused after about a week with no activity.
  If the app shows "Can't reach Car Bond", log in to supabase.com and tap "Restore project".
- Sellers edit their cars only from the phone they posted on. If they clear Chrome's data,
  they can't edit those listings any more (you can delete them in Supabase > Table Editor > cars).
- Want it in the Google Play Store later? The free website pwabuilder.com can turn this same
  app into a Play Store package. A Google Play developer account costs a one-time $25.
