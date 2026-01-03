# Piqniq Website User Manual (Current Features)

This manual explains how to use the Piqniq website as it exists today, including:
- End-user features (forum, resources, profiles, portfolios, study room, chat)
- Sharing models (invite-only personal portfolios, share cards)
- Staff/admin features (curation and permissions)

If you’re setting up the platform from scratch (servers/hosting), see `PROXMOX_DEPLOYMENT.md`.

---

## 1) Accounts, sign-in, and navigation

### Register and sign in

- Use the site header buttons (**Sign In** / **Register**) to authenticate.
- After sign-in, the navigation updates to show your user links (profile/dashboard) and a logout option.

### Profile and Dashboard

- Your profile page shows your public-facing info (username, avatar, bio, socials).
- The dashboard is where you manage personal settings and view notifications.

---

## 2) Forum (Posts & Discussions)

### What the forum is for

The forum is where users create posts and discuss topics. It supports:
- Categories
- Curated tags
- Search, sorting, and pagination
- Likes/upvotes and notifications
- Threaded replies (with a max depth to prevent extreme nesting)

### Reading posts

- Anyone can browse and read posts.
- You can filter by category, search by keywords, and sort results.

### Creating a post

Requires sign-in.

Typical flow:
1. Open the forum
2. Click **Create New Post**
3. Choose a category
4. Choose tags from the curated list
5. Submit

### Replying

Requires sign-in.

- Replies are stored as a thread.
- Excessive nesting is restricted to keep threads readable.

### Likes / voting

Requires sign-in.

- You can like or upvote posts.
- Some actions affect reputation/gamification metrics.

---

## 3) Curated tags

Tags are curated by staff.

- Users do not free-type arbitrary tags.
- This keeps the site taxonomy consistent and reduces spam/duplicates.

---

## 4) Resources library

The resources section is a staff-curated library of learning resources.

### Browsing resources

- Anyone can browse resources.
- The list supports filtering/search behavior through the UI.

### Types of resources

Resources may include:
- External links
- Optional uploaded PDFs (when configured)

### If the resources page is empty

If the database has no curated resources yet:
- Staff can add resources via the admin panel, or
- The operator can run `npm run seed:curated` (recommended for fresh installs)

---

## 5) Tech News feed (Home page)

The home page includes a small Tech News feed.

- Headlines are aggregated server-side from an allowlist of RSS/Atom sources.
- The UI links out to the original articles.

This avoids scraping/republishing content directly.

---

## 6) Career Pathways (staff maintained)

The pathways page is public.

- Anyone can view pathways.
- Content/Admin staff can update the pathways content through the admin tooling.

---

## 7) Portfolios

Piqniq supports **two portfolio concepts**:

1) **Site Portfolio (public, staff curated)**
2) **Personal Portfolios (invite-only)**

### 7.1 Site Portfolio (public)

- This is a curated feed intended to showcase selected work/content for the entire site.
- It’s visible to everyone.

Staff management:
- Content/Admin users can create/update/delete items.

### 7.2 Personal portfolio (invite-only)

Each user has a personal portfolio editor.

- Editor URL: `/portfolio`
- Personal portfolio views are not publicly browseable.

#### How sharing works

Viewing `/portfolio/<username>` requires:
- an authenticated session as the owner, OR
- a valid invite token: `/portfolio/<username>?token=<token>`

If the token is missing, invalid, expired, or revoked, the server returns a generic “not found” response to avoid leaking user existence.

#### Create and revoke invite links

In the portfolio editor:
1. Click **Generate Invite Link**
2. Copy the link (token is shown once)
3. Optionally revoke old links from the list

Notes:
- Tokens are treated like credentials; do not post them publicly.
- Tokens can expire.

---

## 8) Study Room (private)

The Study Room is a sign-in-only personal area.

- URL: `/study` (or `/study.html`)
- It is private to your account.

### Concepts

- **Workspaces**: your top-level study areas (e.g., “Node.js”, “DSA Prep”)
- **Folders**: organization inside a workspace
- **Items**: notes/links/flashcards-like study items
- **Todos**: tasks and practice plans

### Workspaces and limits

- You can create multiple workspaces (up to 200).

### Modes

Each workspace has a learning mode:
- `build` (learning/building new knowledge)
- `revise` (review and reinforcement)
- `interview` (prep and drill)

### Daily Focus (“Next 3”)

- You can pin up to 3 focus entries for today.
- Focus entries must reference your own items/todos (validated server-side).

### Review queue (spaced repetition)

- Items can be reviewed.
- Reviewing advances the review stage and schedules the next review.

### Mastery and progression

The system tracks per-workspace:
- XP
- Level
- Streak (based on daily activity)

---

## 9) Live Chat (sign-in required)

Live chat rooms are only accessible to signed-in users.

- Guests are redirected to Home and prompted to sign in.

Rooms can be curated/renamed by operators using the provided helper script.

---

## 10) Documents + Share Cards

Piqniq supports:
- Uploading documents (owner-scoped)
- Creating share cards (token-gated downloads)

This is useful for sharing a small set of documents without exposing a full account.

High-level flow:
1. Upload a document
2. Create a share card
3. Share the generated link/token

---

## 11) Admin / Staff features

### Roles and permissions

The platform uses role/permission checks.

High-level roles:
- **Admin**: full administrative access
- **Content**: manage curated content (resources/pathways/site portfolio)
- **Moderator**: moderation-focused tools

Superadmins typically bypass permission checks and are intended for platform ownership/operations.

### Typical staff responsibilities

- Manage curated tags
- Add/update curated resources
- Update pathways content
- Maintain the public site portfolio feed

---

## 12) Power-user / operator notes

### Superadmin creation

Auto “first user becomes superadmin” is disabled by default.

Use:

```bash
npm run admin:bootstrap
```

### Curated content seeding

For an empty DB:

```bash
npm run seed:curated
```

### Health check

- `GET /api/system/health`

---

## 13) Feature map (quick reference)

Pages:
- `/` home
- `/forum` discussions
- `/resources` curated resources
- `/pathways` pathways
- `/portfolio` personal portfolio editor
- `/portfolio/<username>?token=<token>` invite-only portfolio view
- `/study` private study room
- `/livechat` live chat
- `/admin` admin panel

Key APIs:
- Auth: `/api/auth/*`
- Posts: `/api/posts/*`
- Profile: `/api/profile/*`
- Resources: `/api/resources/*`
- Site portfolio: `/api/site-portfolio/*`
- Personal portfolios: `/api/portfolio/*`
- Study Room: `/api/study/*`
- System: `/api/system/*`
