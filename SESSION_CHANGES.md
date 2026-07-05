# e-kazi — Change Log for Commit Splitting

A running story of everything done in this working session, grouped the way you'd want to commit it: one logical change per group, with the files touched. Written so you can read a section, `git add` just those paths, and write your own commit message from the description.

Delete this file (or add it to `.gitignore`) once you're done splitting commits — it's a working reference, not meant to be part of the repo history itself.

---

## 1. fix(mobile): rating/recommendation status went stale after rating a provider

**Story:** After a hirer submitted a rating, the "Recommendation" step in the job pipeline kept showing as incomplete even though the rating had gone through — because the local `ratingDone`/`recoDone` state was only set once at mount (`useState(hasRating)`), and never re-synced if the underlying job data changed later (tab switch, realtime refresh). Added two effects that keep that local state following the real prop values whenever they become true.

**Files:**
- `mobile/src/views/Jobs/Workspace/workspace/WorkspaceProgress.js`

---

## 2. feat(mobile): animated, non-scrolling job pipeline

**Story:** Replaced the old static Posted→Assigned→Started→Submitted→Completed row with a themed, animated pipeline component (glow/pulse on the active step, staggered entrance, haptic tap on step change, animated line-fill) built to fit the screen width instead of horizontally scrolling — a direct fix for the earlier complaint that the pipeline scrolled instead of just showing where you are right now. Also extended the shared status-label map so `start_requested` / `revision_requested` / `submitted` render correctly wherever job status chips are shown.

**Files:**
- `mobile/src/views/Jobs/Workspace/workspace/AnimatedJobPipeline.js` (new)
- `mobile/src/views/Jobs/Workspace/workspace/WorkspaceProgress.js` (swapped in the new component, removed the old static pipeline JSX/styles)
- `mobile/src/views/Jobs/jobsUI.js` (`STATUS_MAP` additions)

---

## 3. feat(admin): admin web panel foundation — separate auth, obscured API, no router

**Story:** Stood up the admin side from scratch: its own `admins` table and JWT secret (completely separate from the user/provider auth path, not reused), a CLI script so you create your own admin account rather than me touching it, and a Vite/React app that authenticates against a deliberately non-obvious API path (`ADMIN_API_PREFIX`, env-configurable) instead of the guessable `/api/admin`. The web app itself has no react-router — navigation between Dashboard/Support/Disputes is plain React state, so there's no URL to type/bookmark/guess into a section without logging in first.

**Files:**
- `node/src/migrations/024_create_admins.js` (new `admins` table)
- `node/src/admin/admin.tokens.js` (new — admin JWT generate/verify)
- `node/src/admin/admin.middleware.js` (new — `requireAdminAuth`, `toClientAdmin`)
- `node/src/admin/admin.controller.js` (new — login, `getAdminMe`)
- `node/src/admin/admin.routes.js` (new — `/auth/login`, `/me`)
- `node/src/scripts/createAdmin.js` (new CLI script)
- `node/package.json` (added `create-admin` script)
- `node/src/server.js` (mounts admin routes under the obscured prefix)
- `node/.env`, `node/.env.example` (`ADMIN_TOKEN_SECRET`, `ADMIN_API_PREFIX`)
- `web/src/api/adminApi.js` (new)
- `web/src/auth/adminAuthContext.js` (new — context/hook only)
- `web/src/auth/AdminAuthContext.jsx` (new — provider)
- `web/src/App.jsx`, `web/src/main.jsx` (new — no `BrowserRouter`)
- `web/src/pages/LoginPage.jsx` (new)
- `web/src/components/AdminLayout.jsx` (new)
- `web/src/routes/ProtectedRoute.jsx` (neutralized — unused now that there's no router; couldn't be deleted from this sandbox, safe for you to delete by hand)
- `web/package.json` (removed `react-router-dom`)
- `web/src/index.css` (new base styles)
- `web/.env`, `web/.env.example` (`VITE_ADMIN_API_PREFIX`)

*Note: the blank-page bug on first load (case-insensitive `AdminAuthContext` import resolving to the wrong file on Windows) was found and fixed by your collaborator directly in `web/src/App.jsx` — already in your working tree, just flagging it so it doesn't get lost when you split commits.*

---

## 4. feat(mobile): Browse jobs screen — flat list redesign

**Story:** Rebuilt the Jobs → Browse tab from card-based to the flat, divider-only list style already established in My Jobs / My Requests (your explicit call after the two conflicting specs). Added quick filter chips (All/Recommended/Newest/Closing soon), a Recommended badge, category/budget chips, friendly relative "Closing in N days" text, a press-scale animation per row, and pulsing skeleton rows while loading instead of a spinner. Backend untouched — same `/hiring/requests` endpoint, only the UI changed.

**Files:**
- `mobile/src/views/Jobs/Browse.js` (full rewrite)

---

## 5. fix(mobile): Android keyboard covering the chat input / bottom nav overlap

**Story:** Two related Android-only bugs in the job workspace chat: (1) the send button and text input sat under the phone's gesture/nav bar at rest, because the input bar's bottom padding was hard-coded to `8` instead of respecting the safe-area inset; (2) once you actually opened the keyboard, it still covered the input, because the manual keyboard-height calculation subtracted the safe-area inset on the assumption that Android's "resize" window mode already accounted for it — an assumption that doesn't hold with `edgeToEdgeEnabled: true`. Fixed both: resting padding now always uses `insets.bottom`, and the keyboard lift now uses the full reported keyboard height.

**Files:**
- `mobile/src/views/Jobs/Workspace/workspace/WorkspaceChat.js`

---

## 6. fix(mobile): keyboard covering inputs inside modals (Login, Comments)

**Story:** Same root cause, different screens: `Modal` components on Android don't automatically inherit the app's "resize with keyboard" window setting, so their `KeyboardAvoidingView` needs an explicit `behavior="height"` on Android too — not just iOS. Two modals still had `behavior={ios ? "padding" : undefined}` (i.e. nothing at all on Android): the login sheet and the post-comments sheet. Brought both in line with the pattern already working in `CreateJobModal.js`.

**Files:**
- `mobile/src/views/Auth/LoginModal.js`
- `mobile/src/views/postCard/CommentsSheet.js`

---

## 7. fix: profile "Jobs Posted" tab showed a count but no jobs

**Story:** The profile screen's "Jobs Posted" tab always fell back to an empty-state icon with just "N jobs posted" as text, even when jobs existed — because the backend only ever returned `posted_jobs_count` (a number), never the actual job rows, so the frontend's list was always empty. Added the missing query on the backend and reworked the frontend row rendering to show a real, per-job status badge (Open/Closed/Cancelled) instead of a hardcoded "Open" label that would've been wrong for closed jobs.

**Files:**
- `node/src/profiles/profiles.controller.js` (added the `posted_jobs` query + field)
- `mobile/src/views/Profile/UserProfile.js` (per-item status badge, removed now-dead `postedJobsCount` fallback text)

---

## 8. fix(notifications): no "you received a rating" push notification

**Story:** Auditing the four example push-notification types you described (new application, work submitted, new message, rating received), three were already fully wired end-to-end. The rating one wasn't: `rateJobProvider` and `recommendJobProvider` saved the rating/recommendation to the database but never notified the provider at all — no in-app notification, no push. Added both.

**Files:**
- `node/src/recommendations/recommendations.controller.js`

*(Separately: real push notifications also need an EAS development build + `eas init` — Expo Go dropped remote push support and no EAS project was ever linked. That part needs your own Expo login, so it's on you, not a code change.)*

---

## 9. fix(mobile): support action sheet stayed open after sending

**Story:** After successfully sending feedback or a problem report, the sheet stayed open behind the "Sent successfully" popup instead of closing — you had to dismiss both separately. Now it closes itself (and resets its internal state) right after a successful send; the success popup is a separate `Modal` so it still shows on top.

**Files:**
- `mobile/src/views/Settings/SupportActionSheet.js`

---

## 10. feat(admin): Support Inbox — view and act on Contact Us / feedback / problem reports

**Story:** This is the actual point of the admin panel per your original ask. Added backend endpoints to list/filter/search support requests, view one in full, and update its status or attach an internal note (with `resolved_at`/`resolved_by` tracking). Built a real two-pane inbox UI (filterable list + detail panel) to replace the "coming soon" placeholder, and wired the dashboard's per-type tiles to deep-link straight into the inbox pre-filtered.

**Files:**
- `node/src/migrations/026_support_requests_admin_fields.js` (new — `admin_note`, `resolved_at`, `resolved_by`)
- `node/src/admin/adminSupport.controller.js` (new — list/get/update requests, dashboard summary)
- `node/src/admin/admin.routes.js` (added `/dashboard-summary`, `/support`, `/support/:id`)
- `web/src/api/adminApi.js` (added the corresponding client calls)
- `web/src/pages/SupportInboxPage.jsx` (new)
- `web/src/App.jsx` (swapped `ComingSoonPage` for the real inbox on the "support" view, added the type-filter hand-off)

---

## 11. style(admin): SVG icon system, dashboard redesign, responsive layout, quieter header

**Story:** Replaced every emoji in the admin panel (sidebar nav, header, dashboard stat cards) with a small inline SVG icon set. Rebuilt the dashboard to show real counts (open support requests, split by type) instead of placeholder dashes, with each tile clickable into the inbox. Made the whole shell responsive: below ~860px the sidebar becomes a slide-in drawer with a backdrop (toggled by a menu button that appears in the header), and the header itself was trimmed down to just a menu toggle + current section name + account/sign-out — no more static "Admin panel" label sitting there doing nothing.

**Files:**
- `web/src/components/Icon.jsx` (new)
- `web/src/components/AdminLayout.jsx` (rewrite)
- `web/src/pages/DashboardPage.jsx` (rewrite)
- `web/src/index.css` (large addition: filter bar, chips, inbox list/detail, status pills, responsive `@media` rules)

---

## 12. feat(admin): no persistent login — every visit requires signing in

**Story:** The admin token used to live in `localStorage` and get silently restored (and re-verified) on every page load. Per your requirement that there be no "remembered" session, the token now lives in memory only for the lifetime of the tab — a reload, a new tab, or closing the browser all land back on the login screen, with no restore-from-storage step at all.

**Files:**
- `web/src/api/adminApi.js` (token storage switched from `localStorage` to an in-memory variable)
- `web/src/auth/AdminAuthContext.jsx` (removed the boot-time token-restore bootstrap)

---

## 13. fix(config): admin panel unreachable from a phone on the same Wi-Fi

**Story:** Login worked from the desktop browser (same machine as the Node backend, where `localhost` correctly points back to itself) but failed from a phone with "Can't reach the server" — because the built frontend still pointed at `http://localhost:5000/api`, which on the phone resolves to the phone itself, not your PC. Pointed it at the machine's LAN IP instead (the same one `mobile/.env` already uses), matching a fix already applied on the mobile side earlier.

**Files:**
- `web/.env`
- `web/.env.example`

*Requires restarting the vite dev server (`npm run dev -- --host`) to pick up the new env value, and confirming Windows Firewall allows inbound on port 5000 as well as 5173.*

---

## 14. feat(mobile): poster's Job Details screen — full redesign

**Story:** Rebuilt the poster-facing Job Details screen from scratch per your point-by-point spec. The hero now shows the job only — no provider info mixed in — with a code/status/title/location/posted-date header on a gradient card. The old "1 application" text band became a real 2x2 summary grid (Applications-or-"Direct Hire", Budget, Duration, Category), with honest fallback labels like "Set by bids" for open jobs where those values aren't fixed yet. "About this job" split into distinct Description / Requirements / Attachments sub-sections instead of one wall of text. The applicant list rows were redesigned around what you actually asked for — avatar, username, full name, budget, delivery time, availability, message preview — deliberately with no ratings, stars, or verified badges. Added an activity timeline (Posted → Applications → Assigned → Workspace, or the shorter Posted → Accepted → Workspace path for direct hires). Spacing tightened throughout to match the Notion/GitHub/Linear-style density already used elsewhere. Actions were kept honest: only "Share" and "Open Workspace" are wired up, since Edit/Close/Delete/Archive have no backend endpoints in this repo to actually call.

**Files:**
- `mobile/src/views/Jobs/MyRequests/JobDetails.js` (full rewrite)

---

## 15. feat(mobile): Provider Request screen (applicant review) — compact redesign

**Story:** Reworked the screen a hirer sees when reviewing one applicant. Bumped the avatar to 64px with a tightened profile row, renamed "How I'll do this" to "Proposal Note" and shrank it to a single compact block, and turned the four stacked Offer Summary rows (Budget/Est. Time/Available/Experience) into a 2x2 grid. Job Info collapsed into one compact block — a code pill next to the title, then a single meta row (location • posted date) — instead of a divider-per-line list. Removed the now-unused per-row `InfoRow` component import, cut dividers down to section boundaries only, and trimmed the sticky bottom button to a 56–60px target.

**Files:**
- `mobile/src/views/Jobs/MyRequests/JobApplicantDetails.js`

---

## 16. fix(mobile): chat media rendered as blank rectangles

**Story:** The actual bug behind "images/videos show up as empty boxes" — `UploadManager.js` built the post-upload media object without `width`, `height`, or `duration`, even though the pre-upload (optimistic) version had them. The moment a message was confirmed, its media permanently lost the dimensions needed to size the bubble, so any aspect-ratio-aware rendering was impossible for real (non-optimistic) messages. This matches exactly what you diagnosed yourself. Fixed by carrying those three fields through into the uploaded object.

**Files:**
- `mobile/src/utils/UploadManager.js`

---

## 17. fix(mobile): chat scrolling wasn't smooth / sometimes wouldn't scroll

**Story:** The chat forced `scrollToEnd()` on every `onContentSizeChange`, which fires on any layout change — including an image finishing loading and resizing — yanking you back to the bottom even mid-read of older messages. Replaced it with a "stick to bottom" pattern: the list tracks whether you were already near the bottom before a new message arrived (or whether the new message is your own) and only auto-scrolls in those cases, otherwise it leaves your scroll position alone.

**Files:**
- `mobile/src/views/Jobs/Workspace/workspace/WorkspaceChat.js`

---

## 18. feat(mobile): full-screen photo/video viewer with pinch-to-zoom

**Story:** Added a proper lightbox for tapping into chat media — swipe between items, pinch/double-tap to zoom photos, native controls for video, always on a black backdrop regardless of app theme (standard lightbox convention). This is the first real use of `react-native-gesture-handler`/`react-native-reanimated` in the codebase — both were installed and wired at the app root already but had zero prior usage anywhere in `src/`, worth knowing since it's less battle-tested than the rest of the app.

**Files:**
- `mobile/src/views/Jobs/Workspace/workspace/MediaViewer.js` (new)
- `mobile/src/views/Jobs/Workspace/workspace/WorkspaceChat.js` (wired taps on media to open it)

---

## 19. feat(mobile): attachment sheet + WhatsApp-style preview screen, replacing the messy inline strip

**Story:** The old flow dumped picked media straight into a messy inline strip inside the chat before sending. Replaced it with the flow you asked for: tapping attach opens a bottom sheet (Gallery / Camera / Record Video), and anything picked or captured goes into a full-screen review screen first — big preview on top, a thumbnail strip to switch between multiple items or remove one, a caption field, and a send button — nothing lands in the chat until you actually hit send. Sending shows the local bubble immediately, then swaps in the uploaded version once the upload finishes. Also added retry: if a send fails, the message is marked failed with a tap-to-retry action instead of silently disappearing.

**Files:**
- `mobile/src/views/Jobs/Workspace/workspace/AttachmentSheet.js` (new)
- `mobile/src/views/Jobs/Workspace/workspace/MediaComposer.js` (new)
- `mobile/src/views/Jobs/Workspace/workspace/WorkspaceChat.js` (removed the old inline preview strip and its styles, wired the sheet + composer in)
- `mobile/src/views/Jobs/Workspace/JobWorkspace.js` (added `retryMessage` for failed sends)

---

## 20. feat(mobile): in-app camera — photo and video capture without leaving e-kazi

**Story:** Per your explicit requirement, capturing a photo or recording a video no longer hands off to the phone's default camera app. Built a real in-app camera screen: live preview, photo/video mode toggle, front/back flip, a shutter that turns into a recording indicator, all inside e-kazi's own UI. Wires into the same attach flow as gallery picks, so captured media lands in the same review-before-send screen from #19.

**Files:**
- `mobile/src/views/Jobs/Workspace/workspace/CustomCamera.js` (new)
- `mobile/src/views/Jobs/Workspace/workspace/WorkspaceChat.js` (camera/video buttons now open `CustomCamera` instead of `ImagePicker.launchCameraAsync`)
- `mobile/package.json` (added `expo-camera` — plus `expo-constants`/`expo-device`, which `expo install`'s dependency check added as required peers)

*This is a native module — after pulling this change, run `npm install` (or `npx expo install` again if you want it to re-validate versions) and do a full rebuild, not just a JS/Fast Refresh reload. If you're on Expo Go rather than a custom dev client, Expo Go already bundles `expo-camera`, so it may work without a rebuild — a dev client build won't.*

---

## 21. fix(mobile): green border around media bubbles, non-adaptive grid, oversized single media

**Story:** The last visual pass on chat media: removed the border around media bubbles entirely so photos/videos blend into the conversation instead of looking like bordered cards. Multi-media messages now arrange into a responsive grid sized off the actual screen width instead of a fixed 112px tile, so it looks right on both small and large phones. Single media keeps its real aspect ratio (capped at 72% screen width / 320px height) instead of stretching to fill a big empty box.

**Files:**
- `mobile/src/views/Jobs/Workspace/workspace/WorkspaceChat.js`

---

## 22. fix(mobile): keyboard covering text inputs on the media composer and the Progress tab

**Story:** Two more spots the keyboard was covering an input, found while auditing "check everywhere else this could be a problem" like you asked. `MediaComposer`'s caption field on Android used a bare `undefined` keyboard behavior (effectively nothing), unlike the proven pattern already working in the chat screen — brought it in line. Separately, `WorkspaceProgress.js` (the Progress tab) had five different text inputs — start note, completion note, rating comment, recommendation reason, dispute reason — with zero keyboard-avoidance handling at all, a gap that had nothing to do with the chat work but was sitting there unaddressed. Wrapped its scroll view in the same `KeyboardAvoidingView` pattern.

**Files:**
- `mobile/src/views/Jobs/Workspace/workspace/MediaComposer.js`
- `mobile/src/views/Jobs/Workspace/workspace/WorkspaceProgress.js`

---

## 23. housekeeping: corrupted `package.json` recovered, git cache corruption found

**Story:** An earlier `npx expo install expo-camera` run (used to add the dependency for #20) got killed mid-write by a sandbox timeout and left `mobile/package.json` truncated — invalid JSON, cut off partway through `devDependencies`. Rewrote the file back to complete, valid JSON with the same dependency additions intact (nothing lost). Separately — unrelated to that, and not something I caused — this machine's `.git/objects/pack/multi-pack-index` is corrupted ("bad index file sha1 signature"), which makes `git diff`/`git log`/`git fsck` throw an `improper chunk offset` error before their output. It doesn't affect your actual files, only git's own performance cache, but you should clear it before you start committing so `git diff` shows you truth: delete `.git\objects\pack\multi-pack-index` and the `.git\objects\info\commit-graphs` folder (I couldn't remove them myself — permission denied from this sandbox), then run `git status` once to confirm the error is gone.

**Files:**
- `mobile/package.json` (recovered)
