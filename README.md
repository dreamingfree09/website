# Piqniq - Tech Community Platform

**Gather, Share, Grow** — a modern community platform for tech enthusiasts to connect, learn, and collaborate.

## 🌟 Overview

Piqniq is a full-stack web application designed to bring together technology enthusiasts, developers, and learners.
It includes authentication, profiles, a discussion forum (with curated tags), curated learning resources, staff-maintained career pathways, a staff-curated site portfolio, invite-only personal portfolios, and a private Study Room.

## ✨ Key Features

### 🔐 User Management
- Secure authentication with session management
- User profiles with customizable avatars and bios
- Social links integration (GitHub, LinkedIn, Twitter, Website)
- Personal dashboard for managing content

### 💬 Forum & Discussions
- Create and manage discussion posts
- Categorized topics (General, Frontend, Backend, Learning, Showcase, Career)
- Advanced filtering and sorting options
- Pagination for better performance
- Real-time search functionality
- Reply system for threaded discussions
- Curated tag picker (tags are managed by staff)

### 📚 Curated Resources Library
- Public resources browsing page
- Staff-managed curated resources (links + optional uploaded PDFs)
- Admin-curated tag taxonomy used across the forum/resources

### 📰 Tech News (Home page)
- Home page includes a small **Tech news** feed.
- Headlines are aggregated server-side from an allowlist of reputable RSS/Atom sources.
- The UI links out to the original article (no scraping/republishing).

### 🧭 Career Pathways (Staff-maintained)
- Public pathways page (accessible to everyone)
- Content/Admin users can update pathways content via the admin panel
- Includes a built-in Role Explorer with a large, categorized list of roles and roadmaps

### 🧩 Portfolios (Site + Personal)
- **Site Portfolio (public):** a curated portfolio feed for the whole site (managed by Content/Admin staff)
- **Personal Portfolios (invite-only):** each user can edit their own portfolio at `/portfolio`
- **Sharing:** viewing `/portfolio/:username` requires either an owner session or an invite token (`?token=...`)
- Legacy note: `/api/portfolio/showcase` is kept for backward compatibility but returns an empty list

### 📓 Study Room (Private)
- Study Room page at `/study` / `/study.html` (sign-in required)
- Multiple personal workspaces (up to 200) with folders, items, and todos
- Learning “mode” per workspace (`build` / `revise` / `interview`)
- Daily Focus (“Next 3”), review queue (spaced repetition), and mastery tracking
- Gamification stats: XP, level, streak

### 👍 Social Engagement
- Like/upvote system for posts
- Notification system for interactions
- User reputation tracking
- Badge system for achievements
- Author profiles with post history

### 🎨 Modern UI/UX
- Beautiful gradient design with glassmorphism effects
- Dark mode support
- Fully responsive mobile design
- Animated transitions and hover effects
- Skeleton loading states
- Custom typography with Google Fonts

### 📱 Mobile First
- Responsive hamburger menu
- Touch-friendly interface
- Optimized layouts for all screen sizes
- Mobile-specific interactions

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** 4.18.2 - Web framework
- **MongoDB** 8.0.4 - NoSQL database
- **Mongoose** 7.4.1 - ODM for MongoDB
- **bcryptjs** 2.4.3 - Password hashing
- **express-session** - Session management
- **connect-mongo** - MongoDB session store

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with custom properties
- **Vanilla JavaScript ES6+** - No framework dependencies
- **Google Fonts** - Playfair Display, Inter, JetBrains Mono

### Development
- **Git** - Version control
- **VS Code** - Code editor
- **MongoDB Compass** - Database management

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Git

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd website-main
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/piqniq
   SESSION_SECRET=your-super-secret-key-here
   PORT=3000
   ```

   Optional performance toggles:
   ```env
   # Set to 'false' to disable on-the-fly WebP image optimization
   # (useful for constrained hosts or read-only filesystems)
   IMAGE_OPTIMIZATION=true
   ```

4. **Start MongoDB:**
   ```bash
   # On Windows
   net start MongoDB
   
   # On Mac/Linux
   sudo systemctl start mongod
   ```

5. **Run the application:**
   ```bash
   # Recommended on Windows (kills stale port listeners first)
   npm run start:clean

   # Or start directly
   node app.js
   ```

6. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`

---

## 🐳 Docker (Compose) Deployment

This repo includes a `Dockerfile` and `docker-compose.yml` that you can use for a production-like deployment (recommended for Proxmox VMs and servers).

1. Create a `.env` file:

   ```env
   NODE_ENV=production
   SESSION_SECRET=<generate-a-long-random-secret>

   # Used by docker-compose.yml to initialize MongoDB and to build the default MONGODB_URI
   MONGO_USERNAME=admin
   MONGO_PASSWORD=<replace-me>

   # Strongly recommended when behind HTTPS
   BASE_URL=https://community.example.com
   ALLOWED_ORIGINS=https://community.example.com

   # Optional: explicitly force secure cookies
   # COOKIE_SECURE=true

   # Optional: privacy-minded hashing salt for pseudonymized telemetry
   # PII_HASH_SALT=<another-random-secret>
   ```

2. Build + start:

   ```bash
   docker compose up -d --build
   ```

3. Verify health:

   ```bash
   curl -fsS http://localhost:3000/api/system/health
   ```

Notes:
- The Docker setup persists logs and uploads via bind mounts (`logs/`, `public/uploads/`, `uploads/`, and `public/Images/`).
- MongoDB is not exposed on host port 27017 by default. Use `docker compose exec mongodb mongosh ...` for admin access.

### Common URLs

- **Home**: `http://localhost:3000/`
- **Forum**: `http://localhost:3000/forum`
- **Resources**: `http://localhost:3000/resources`
- **Pathways**: `http://localhost:3000/pathways`
- **Portfolio (editor)**: `http://localhost:3000/portfolio`
- **Portfolio (invite-only view)**: `http://localhost:3000/portfolio/<username>?token=<token>`
- **Study Room (sign-in required)**: `http://localhost:3000/study`
- **Admin panel**: `http://localhost:3000/admin`

## 👑 Superadmin (Owner) Account

Piqniq supports a dedicated **owner/superadmin** account that you can keep separate from your personal/regular account.

### Why two accounts?

- **Superadmin**: used to manage the platform (grant roles/permissions, staff actions, etc.).
- **Regular user**: used as your normal community identity so badges/reputation remain comparable to everyone else.

### Important security behavior

Automatic “first user becomes superadmin” bootstrapping is **disabled by default**.
To create a superadmin, use the bootstrap script below.

### Create (or promote) a superadmin user

Run:

```bash
npm run admin:bootstrap
```

Then follow the interactive prompt to enter the password (input is hidden).
You can also provide values via environment variables:

```env
ADMIN_EMAIL=owner@example.com
ADMIN_USERNAME=superuser
ADMIN_PASSWORD=YourPasswordHere
```

Notes:

- The script is idempotent: if the user already exists by email, it will promote/update it to superadmin.
- The script seeds system roles and assigns the Admin role.
- Safety: if `NODE_ENV=production`, the script refuses to run unless `CONFIRM_PRODUCTION_BOOTSTRAP=true`.

## 💬 Live Chat Rooms (Curated Names)

Note: the Live Chat page (`/livechat` / `/livechat.html`) is **sign-in required**. Guests are redirected to Home and prompted to sign in.

If you previously created a bunch of public rooms with auto-generated names (for example `public_abc123...`), you can rename them into a cleaner, purpose-based set.

Run:

```bash
npm run chat:rooms:curate
```

What it does:

- Ensures a default set of public rooms exists:
   - `lobby`, `help`, `announcements`, `introductions`, `general`, `projects`, `study`, `resources`, `career`, `feedback`
   - `voice-1` through `voice-5`
- Renames existing auto-generated public rooms (matching `public_*`) into the list above first.
- Renames any remaining `public_*` rooms to `extra-1`, `extra-2`, etc.
- Does not delete rooms or messages.

## 📰 Tech News Feed (RSS Aggregation)

The Home page Tech News section is powered by the `GET /api/news` endpoint.

- The server aggregates a handful of allowlisted RSS/Atom feeds and returns a merged list.
- The list is cached briefly server-side to avoid hitting upstream sites on every page load.

Optional environment variables:

```env
# Cache TTL for aggregated news (milliseconds)
NEWS_CACHE_TTL_MS=600000

# Per-feed fetch timeout (milliseconds)
NEWS_FETCH_TIMEOUT_MS=7000

# Max upstream feed size (bytes)
NEWS_MAX_BYTES=750000
```

## 🖼️ Image Optimization Cache

When `IMAGE_OPTIMIZATION` is enabled (default), the server may generate WebP versions of PNG/JPG images on demand and store them on disk under `.cache/images-webp/`.

- This folder is safe to delete at any time (it will be regenerated as needed).
- In production, ensure the app has write access to `.cache/` (or mount it as a persistent volume if you want the cache to survive restarts).
- To disable this behavior entirely, set `IMAGE_OPTIMIZATION=false`.

## 📁 Project Structure

```
website-main/
├── app.js                 # Main application entry point
├── package.json           # Dependencies and scripts
├── FEATURES.md           # Detailed feature documentation
├── QUICKSTART.md         # Step-by-step setup + URLs
│
├── models/               # MongoDB schemas
│   ├── User.js
│   ├── Post.js
│   ├── Tag.js
│   ├── Resource.js
│   ├── SiteContent.js
│   └── Portfolio.js
│
├── routes/              # API routes
│   ├── auth.js         # Authentication routes
│   ├── posts.js        # Post CRUD and interactions
│   ├── profile.js      # User profile management
│   ├── tags.js         # Curated tags (staff-managed)
│   ├── resources.js    # Curated resources library
│   ├── news.js         # Tech news RSS aggregation
│   ├── siteContent.js  # Staff-maintained site content (Pathways)
│   ├── portfolio.js    # User portfolios + showcase
│   └── admin.js        # Admin panel API
│
├── middleware/         # Custom middleware
│   └── auth.js        # Authentication middleware
│
└── public/            # Frontend files
    ├── index.html     # Landing page
    ├── forum.html     # Forum discussions
    ├── portfolio.html # Portfolio showcase
    ├── pathways.html  # IT career pathways
    ├── profile.html   # User profile view
    ├── dashboard.html # User dashboard
    │
    ├── css/
    │   └── styles.css # Main stylesheet (2000+ lines)
    │
    ├── js/
    │   ├── auth.js              # Authentication logic
    │   ├── forum.js             # Forum core functionality
    │   ├── forum-enhancements.js # Filtering, sorting, pagination
    │   ├── profile.js           # Profile management
    │   ├── theme.js             # Dark mode & UI features
    │   ├── search.js            # Search functionality
    │   ├── mobile-menu.js       # Responsive navigation
    │   ├── modals.js            # Modal management
    │   └── slider.js            # Image slider
    │
    └── Images/        # Static assets
```

For configuration and “non-commentable” files (e.g., JSON configs and lockfiles), see `FILE_MANIFEST.md`.

## 🚀 From-Scratch Setup + Usage (End-to-End)

This section is written for someone starting with a fresh clone and an empty database.

### 1) Start the app locally

1. Install dependencies: `npm install`
2. Copy env file: `cp .env.example .env` (or create `.env` manually)
3. Ensure MongoDB is running (local service or Docker)
4. Start the server:
   - Recommended: `npm run start:clean`
   - Alternative: `node app.js`
5. Confirm health check: `http://localhost:3000/api/system/health`

### 2) Create your first admin account

By default, **no account is auto-promoted** to superadmin (in any environment).

Recommended (safe, explicit):

1. Register a normal account via `http://localhost:3000`
2. Promote/create the owner account using:

   ```bash
   npm run admin:bootstrap
   ```

Optional (one-time convenience for dev only):
- You may set `ALLOW_SUPERADMIN_BOOTSTRAP=true` to promote the first-ever registered account when there are zero superadmins.

### 3) Curated tags + resources

There are two ways to get curated Tags/Resources into the database:

**Option A: Seed curated starter content (recommended for fresh clones / empty DB)**

1. Ensure MongoDB is running.
2. Run the curated seed script (idempotent; safe to re-run):
   - `npm run seed:curated`
3. Visit the public resources page: `http://localhost:3000/resources`

**Option B: Manage content in the admin panel**

1. In the admin panel, create/edit **Tags** (tags are curated; users pick from the list)
2. Create/edit **Resources** (links and/or uploaded PDFs)
    - Optional metadata (useful for “free lessons” + YouTube discovery):
       - `platformName` + `platformUrl` (e.g., free learning platforms)
       - `creatorName` + `creatorUrl` (e.g., YouTube creators/channels)
3. Visit the public resources page: `http://localhost:3000/resources`

Troubleshooting: if the Resources page shows no results, confirm the API returns items:
- `http://localhost:3000/api/resources?page=1&limit=10`
- If it returns `items: []`, run `npm run seed:curated` (or add resources via the admin panel).

Optional (dev only): if your MongoDB gets reset/cleared frequently, you can enable automatic recovery:
- Set `AUTO_SEED_CURATED=true` and restart the server.
- When enabled, `GET /api/resources` will auto-run the curated seeder once if it detects an empty Resources collection.

### 4) Career Pathways (editable by Content/Admin)

1. In the admin panel, edit the Pathways content
2. Visit the public pathways page: `http://localhost:3000/pathways`

### 5) Forum

1. Visit the forum: `http://localhost:3000/forum`
2. Create a post and select tags from the curated tag picker
3. Engage by replying and liking/upvoting

### 6) Portfolios (Site + Personal)

**Personal portfolio (invite-only):**

1. Open your portfolio editor: `http://localhost:3000/portfolio`
2. Add skills and projects
3. Generate an invite link from the Portfolio page
4. Share the invite link; it will look like:
   `/portfolio/<your-username>?token=<token>`

**Site portfolio (public):**

- Everyone can view the site portfolio feed (shown on the Portfolio page and via `GET /api/site-portfolio`).
- Content/Admin staff can manage site portfolio items.

## 🔐 Roles & Permissions (High Level)

- **Admin**: full admin access (roles/users/tags/resources/system)
- **Content**: can manage pathways and create/update resources (no user/role management)
- **Moderator**: moderation-focused access (pin/remove content, chat moderation)

Role assignment is done from the admin panel.

### For Users

1. **Register/Login:**
   - Click "Register" to create an account
   - Use "Sign In" to access your account

2. **Create Posts:**
   - Navigate to the Forum page
   - Click "Create New Post"
   - Choose a category and write your content
   - Submit to share with the community

3. **Engage with Content:**
   - Like posts you find helpful
   - Reply to discussions
   - Edit or delete your own posts

4. **Customize Profile:**
   - Go to Dashboard
   - Update your bio and avatar
   - Add social links
   - View your notifications

5. **Browse & Filter:**
   - Use category filters to find relevant posts
   - Sort by newest, popular, or most replies
   - Search for specific topics

### For Developers

#### API Endpoints

**Authentication:**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

**Posts:**
- `GET /api/posts` - Get all posts (supports ?page, ?category, ?sort, ?search)
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Edit post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/replies` - Add reply

**Profile:**
- `GET /api/profile/:username` - View profile
- `PUT /api/profile/update` - Update profile
- `GET /api/profile/dashboard/me` - Get dashboard data
- `PUT /api/profile/notifications/read` - Mark notifications read

**Portfolio:**
- `GET /api/site-portfolio` - Public list of staff-curated site portfolio items
- `POST/PATCH/DELETE /api/site-portfolio` - Staff-managed (requires `sitePortfolio:manage`)
- `GET /api/portfolio/me` - Get/create current user's portfolio (authenticated)
- `PUT /api/portfolio/me` - Update current user's portfolio (authenticated)
- `POST/GET/DELETE /api/portfolio/invites` - Manage invite links (authenticated)
- `GET /api/portfolio/:username?token=...` - Invite-only portfolio view (token required unless owner)

**Study Room (private):**
- `GET/POST/PATCH /api/study/workspaces` - Manage workspaces (authenticated)
- `GET /api/study/templates` + `POST /api/study/workspaces/from-template` - Templates
- `POST /api/study/items/:id/review` - Review action (spaced repetition)

## 🎨 Customization

### Changing Colors
Edit CSS custom properties in `/public/css/styles.css`:
```css
:root {
  --primary-color: #667eea;  /* Change primary color */
  --accent-color: #764ba2;   /* Change accent color */
  /* ... more variables */
}
```

### Adding Categories
Update category options in:
- `/public/forum.html` - Category filter dropdown
- `/public/js/forum-enhancements.js` - getCategoryName() function
- Add new category cards to `/public/forum.html`

### Custom Badges
Define badge criteria in User model or create badge-earning logic in `/routes/profile.js`

## 🔒 Security Features

- Password hashing with bcryptjs (10 salt rounds)
- Session-based authentication
- Protected API routes with authentication middleware
- Input sanitization and validation
- Owner-only edit/delete permissions
- HTML escaping to prevent XSS

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📈 Performance

- Pagination for large datasets
- Indexed database queries
- Optimized CSS with custom properties
- Lazy loading for images (ready to implement)
- Session caching with MongoDB
- Efficient aggregation pipelines

## 🧪 Testing

This project includes automated tests via Jest + Supertest.

```bash
npm test
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Known Issues

- Punycode deprecation warning (cosmetic, not functional)
- Some markdown linting warnings in FEATURES.md (non-critical)

## 📄 License

Package metadata declares `MIT` (see `package.json`).

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Google Fonts for typography
- MongoDB for database solution
- Express.js community for excellent documentation
- VS Code for the development environment

## 📞 Support

For support, questions, or feature requests:
- Open an issue on GitHub
- Contact through the forum
- Email: [your-email@example.com]

## 🗺️ Roadmap

See [FEATURES.md](FEATURES.md) for detailed feature status and future enhancements, including:

- [ ] Markdown editor with preview
- [ ] Email verification and password reset
- [ ] Badge earning automation
- [ ] Content moderation tools
- [ ] SEO optimization
- [ ] Real-time features with WebSockets
- [ ] Advanced search with filters
- [ ] File uploads and attachments
- [ ] User following system
- [ ] Private messaging

---

*Last Updated: January 2026*
