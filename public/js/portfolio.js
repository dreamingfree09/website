/**
 * public/js/portfolio.js
 *
 * Portfolio page controller.
 *
 * Supports two modes:
 * - `/portfolio` (signed-in): portfolio editor for the current user
 * - `/portfolio/:username`: invite-only portfolio view via `?token=...` (or owner session)
 *
 * Also renders the Site Portfolio feed (staff curated, visible to everyone).
 *
 * Security:
 * - User-provided text is escaped before being injected into the DOM.
 */
(() => {
  const qs = (sel) => document.querySelector(sel);

  const escapeHtml = (unsafe) => {
    return String(unsafe ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const parseSkills = (text) => {
    return String(text || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);
  };

  const getUsernameFromPath = () => {
    const match = window.location.pathname.match(/^\/portfolio\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  const getTokenFromQuery = () => {
    const v = new URLSearchParams(window.location.search).get('token');
    return v ? String(v).trim() : '';
  };

  const renderPublic = ({ user, portfolio }) => {
    const app = qs('#portfolioApp');
    if (!app) return;

    const headline = portfolio?.headline ? escapeHtml(portfolio.headline) : `${escapeHtml(user.username)}'s Portfolio`;
    const bio = portfolio?.bio ? escapeHtml(portfolio.bio) : '';
    const skills = Array.isArray(portfolio?.skills) ? portfolio.skills : [];
    const projects = Array.isArray(portfolio?.projects) ? portfolio.projects : [];

    app.innerHTML = `
      <section class="portfolio-hero">
        <h2>${headline}</h2>
        <p>${bio || 'Projects, skills, and work samples.'}</p>
      </section>

      ${skills.length ? `
      <section class="skills-section">
        <h3>Skills</h3>
        <div class="project-tags">
          ${skills.map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join('')}
        </div>
      </section>
      ` : ''}

      <section class="projects-section">
        <h3>Projects</h3>
        ${projects.length ? `
          <div class="projects-grid">
            ${projects.map((p) => {
              const tags = Array.isArray(p.tags) ? p.tags : [];
              const links = [
                p.demoUrl ? `<a href="${escapeHtml(p.demoUrl)}" target="_blank" rel="noopener noreferrer">Demo</a>` : '',
                p.repoUrl ? `<a href="${escapeHtml(p.repoUrl)}" target="_blank" rel="noopener noreferrer">Repo</a>` : ''
              ].filter(Boolean).join(' · ');

              return `
                <div class="project-card">
                  <h4>${escapeHtml(p.title || 'Untitled project')}</h4>
                  <p>${escapeHtml(p.description || '')}</p>
                  ${links ? `<p class="profile-social">${links}</p>` : ''}
                  ${tags.length ? `<div class="project-tags">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        ` : `<p class="empty-message">No projects shared yet.</p>`}
      </section>
    `;

    const staticShell = qs('#portfolioStatic');
    if (staticShell) staticShell.style.display = 'none';
  };

  const renderSitePortfolio = (items) => {
    const safeItems = Array.isArray(items) ? items : [];

    return `
      <section class="projects-section">
        <h3>Portfolio</h3>
        ${safeItems.length ? `
          <div class="projects-grid">
            ${safeItems.map((item) => {
              const title = escapeHtml(item?.title || 'Untitled');
              const summary = escapeHtml(item?.summary || '');
              const linkUrl = String(item?.linkUrl || '').trim();
              const tags = Array.isArray(item?.tags) ? item.tags : [];

              const link = linkUrl
                ? `<p class="profile-social"><a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer">Open</a></p>`
                : '';

              return `
                <div class="project-card">
                  <h4>${title}</h4>
                  ${summary ? `<p>${summary}</p>` : ''}
                  ${tags.length ? `<div class="project-tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
                  ${link}
                </div>
              `;
            }).join('')}
          </div>
        ` : `<p class="empty-message">No portfolio items yet.</p>`}
      </section>
    `;
  };

  const fetchSitePortfolio = async () => {
    try {
      const res = await fetch('/api/site-portfolio?limit=50');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.items) ? data.items : [];
    } catch {
      return [];
    }
  };

  const renderMe = ({ portfolio, meUser }) => {
    const app = qs('#portfolioApp');
    if (!app) return;

    const headline = portfolio?.headline || '';
    const bio = portfolio?.bio || '';
    const skillsCsv = Array.isArray(portfolio?.skills) ? portfolio.skills.join(', ') : '';
    const projects = Array.isArray(portfolio?.projects) ? portfolio.projects : [];

    const profileBase = `${window.location.origin}/portfolio/${encodeURIComponent(meUser.username)}`;

    app.innerHTML = `
      <section class="portfolio-hero">
        <h2>My Portfolio</h2>
        <p>Your personal portfolio is invite-only.</p>
      </section>

      <section class="skills-section">
        <h3>Invite Links</h3>
        <p class="empty-message">Generate a link to share your portfolio. Links can be revoked.</p>

        <div class="profile-edit-card">
          <button type="button" class="btn-primary" id="createPortfolioInviteBtn">Generate Invite Link</button>
          <p id="inviteCreateStatus" class="empty-message" style="display:none"></p>
          <div id="inviteLinkMount" style="display:none"></div>
          <div id="inviteListMount" style="margin-top:12px"></div>
        </div>
      </section>

      <section class="skills-section">
        <h3>Portfolio Settings</h3>

        <form id="portfolioForm" class="profile-edit-card">
          <div class="form-group">
            <label>Headline</label>
            <input type="text" name="headline" maxlength="120" value="${escapeHtml(headline)}" placeholder="e.g., Junior Full-Stack Developer" />
          </div>

          <div class="form-group">
            <label>Bio</label>
            <textarea name="bio" maxlength="2000" placeholder="A short intro...">${escapeHtml(bio)}</textarea>
          </div>

          <div class="form-group">
            <label>Skills (comma-separated)</label>
            <input type="text" name="skills" maxlength="1000" value="${escapeHtml(skillsCsv)}" placeholder="HTML, CSS, JavaScript, Node.js" />
          </div>

          <div class="form-group">
            <label>Projects</label>
            <div id="portfolioEmptyPrompt" class="empty-message" style="display:none">
              <h3>Start your portfolio</h3>
              <p>Add your first project (title + demo/repo link) and then share an invite link.</p>
              <button type="button" class="btn-primary" id="addFirstProjectBtn">Add your first project</button>
            </div>
            <div id="projectsEditor"></div>
            <button type="button" class="btn-primary" id="addProjectBtn">Add Project</button>
          </div>

          <button type="submit" class="btn-primary">Save Portfolio</button>
          <p id="portfolioSaveStatus" class="empty-message" style="display:none"></p>
        </form>
      </section>
    `;

    const staticShell = qs('#portfolioStatic');
    if (staticShell) staticShell.style.display = 'none';

    const projectsEditor = qs('#projectsEditor');

    const inviteStatusEl = qs('#inviteCreateStatus');
    const inviteLinkMount = qs('#inviteLinkMount');
    const inviteListMount = qs('#inviteListMount');

    const setInviteStatus = (msg) => {
      if (!inviteStatusEl) return;
      inviteStatusEl.style.display = 'block';
      inviteStatusEl.textContent = msg;
      setTimeout(() => {
        if (inviteStatusEl) inviteStatusEl.style.display = 'none';
      }, 2500);
    };

    const renderInviteList = (items) => {
      const safe = Array.isArray(items) ? items : [];
      if (!inviteListMount) return;

      if (!safe.length) {
        inviteListMount.innerHTML = `<p class="empty-message">No invite links yet.</p>`;
        return;
      }

      inviteListMount.innerHTML = `
        <div class="projects-grid">
          ${safe.map((inv) => {
            const tokenLast4 = escapeHtml(inv?.tokenLast4 || '');
            const expiresAt = inv?.expiresAt ? new Date(inv.expiresAt).toLocaleString() : '—';
            const revokedAt = inv?.revokedAt ? new Date(inv.revokedAt).toLocaleString() : '';
            const id = escapeHtml(inv?.id || '');

            return `
              <div class="project-card">
                <h4>Invite • …${tokenLast4 || '????'}</h4>
                <p>${revokedAt ? `Revoked: ${escapeHtml(revokedAt)}` : `Expires: ${escapeHtml(expiresAt)}`}</p>
                ${revokedAt ? '' : `<p class="profile-social"><button type="button" class="btn-primary" data-invite-revoke="${id}">Revoke</button></p>`}
              </div>
            `;
          }).join('')}
        </div>
      `;

      inviteListMount.querySelectorAll('[data-invite-revoke]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget?.getAttribute('data-invite-revoke') || '';
          if (!id) return;

          try {
            const res = await fetch(`/api/portfolio/invites/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to revoke');
            await refreshInvites();
          } catch (err) {
            console.error(err);
            setInviteStatus('Revoke failed');
          }
        });
      });
    };

    const refreshInvites = async () => {
      try {
        const res = await fetch('/api/portfolio/invites');
        if (!res.ok) throw new Error('Failed to load invites');
        const data = await res.json();
        renderInviteList(data?.items);
      } catch (err) {
        console.error(err);
        if (inviteListMount) inviteListMount.innerHTML = `<p class="empty-message">Failed to load invite links.</p>`;
      }
    };

    const createInviteBtn = qs('#createPortfolioInviteBtn');
    if (createInviteBtn) {
      createInviteBtn.addEventListener('click', async () => {
        try {
          const res = await fetch('/api/portfolio/invites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error || 'Failed to create');
          }

          const data = await res.json();
          const token = String(data?.invite?.token || '').trim();
          const inviteUrl = token ? `${profileBase}?token=${encodeURIComponent(token)}` : '';

          if (inviteLinkMount) {
            inviteLinkMount.style.display = inviteUrl ? 'block' : 'none';
            inviteLinkMount.innerHTML = inviteUrl
              ? `<p class="profile-social"><a href="${escapeHtml(inviteUrl)}">${escapeHtml(inviteUrl)}</a></p>`
              : '';
          }

          setInviteStatus('Invite link created');
          await refreshInvites();
        } catch (err) {
          console.error(err);
          setInviteStatus('Create failed');
        }
      });
    }

    const renderProjectRow = (project, index) => {
      const title = project?.title || '';
      const description = project?.description || '';
      const demoUrl = project?.demoUrl || '';
      const repoUrl = project?.repoUrl || '';
      const tagsCsv = Array.isArray(project?.tags) ? project.tags.join(', ') : '';

      return `
        <div class="project-card" data-index="${index}">
          <div class="form-group">
            <label>Title</label>
            <input type="text" name="projectTitle" maxlength="120" value="${escapeHtml(title)}" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea name="projectDescription" maxlength="2000">${escapeHtml(description)}</textarea>
          </div>
          <div class="form-group">
            <label>Demo URL (https://...)</label>
            <input type="url" name="projectDemoUrl" maxlength="500" value="${escapeHtml(demoUrl)}" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label>Repo URL (https://...)</label>
            <input type="url" name="projectRepoUrl" maxlength="500" value="${escapeHtml(repoUrl)}" placeholder="https://github.com/..." />
          </div>
          <div class="form-group">
            <label>Tags (comma-separated)</label>
            <input type="text" name="projectTags" maxlength="300" value="${escapeHtml(tagsCsv)}" placeholder="Node.js, MongoDB" />
          </div>
          <button type="button" class="btn-icon delete" data-action="remove">🗑️</button>
        </div>
      `;
    };

    const refreshProjectsEditor = () => {
      if (!projectsEditor) return;
      const safeProjects = Array.isArray(projects) ? projects : [];
      projectsEditor.innerHTML = safeProjects.map((p, idx) => renderProjectRow(p, idx)).join('');

      const emptyPrompt = qs('#portfolioEmptyPrompt');
      if (emptyPrompt) {
        emptyPrompt.style.display = safeProjects.length ? 'none' : 'block';
      }

      projectsEditor.querySelectorAll('[data-action="remove"]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const card = e.target.closest('[data-index]');
          const idx = Number(card?.getAttribute('data-index'));
          if (Number.isFinite(idx)) {
            projects.splice(idx, 1);
            refreshProjectsEditor();
          }
        });
      });
    };

    const collectProjects = () => {
      const result = [];
      if (!projectsEditor) return result;

      const rows = Array.from(projectsEditor.querySelectorAll('[data-index]'));
      for (const row of rows) {
        const title = row.querySelector('input[name="projectTitle"]')?.value || '';
        const description = row.querySelector('textarea[name="projectDescription"]')?.value || '';
        const demoUrl = row.querySelector('input[name="projectDemoUrl"]')?.value || '';
        const repoUrl = row.querySelector('input[name="projectRepoUrl"]')?.value || '';
        const tagsText = row.querySelector('input[name="projectTags"]')?.value || '';

        result.push({
          title: String(title).trim(),
          description: String(description).trim(),
          demoUrl: String(demoUrl).trim(),
          repoUrl: String(repoUrl).trim(),
          tags: parseSkills(tagsText),
        });
      }

      return result;
    };

    refreshProjectsEditor();

    const addProjectBtn = qs('#addProjectBtn');
    if (addProjectBtn) {
      addProjectBtn.addEventListener('click', () => {
        projects.push({ title: '', description: '', demoUrl: '', repoUrl: '', tags: [] });
        refreshProjectsEditor();
      });
    }

    const addFirstProjectBtn = qs('#addFirstProjectBtn');
    if (addFirstProjectBtn) {
      addFirstProjectBtn.addEventListener('click', () => {
        projects.push({ title: '', description: '', demoUrl: '', repoUrl: '', tags: [] });
        refreshProjectsEditor();
      });
    }

    const form = qs('#portfolioForm');
    const statusEl = qs('#portfolioSaveStatus');

    const setStatus = (msg) => {
      if (!statusEl) return;
      statusEl.style.display = 'block';
      statusEl.textContent = msg;
      setTimeout(() => {
        if (statusEl) statusEl.style.display = 'none';
      }, 2500);
    };

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
          headline: form.elements.headline?.value || '',
          bio: form.elements.bio?.value || '',
          skills: parseSkills(form.elements.skills?.value || ''),
          // Personal portfolios are invite-only; avoid public discoverability.
          isPublic: false,
          projects: collectProjects(),
        };

        try {
          const res = await fetch('/api/portfolio/me', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error || 'Failed to save');
          }

          setStatus('Saved!');
        } catch (err) {
          console.error(err);
          setStatus('Save failed');
        }
      });
    }

    // Load current invite list after rendering the editor.
    refreshInvites();
  };

  const renderSignInRequired = () => {
    const app = qs('#portfolioApp');
    if (!app) return;

    app.innerHTML = `
      <section class="portfolio-hero">
        <h2>Portfolio</h2>
        <p>Browse the site portfolio. Sign in to manage your personal portfolio.</p>
      </section>

      <div class="empty-message">
        <button type="button" class="btn-primary" id="openSignInFromPortfolio">Sign In</button>
      </div>

      <div id="sitePortfolioMount"></div>
    `;

    const staticShell = qs('#portfolioStatic');
    if (staticShell) staticShell.style.display = 'none';

    const btn = qs('#openSignInFromPortfolio');
    if (btn) {
      btn.addEventListener('click', () => {
        const modal = qs('#signInModal');
        if (modal) modal.style.display = 'block';
      });
    }
  };

  const init = async () => {
    const username = getUsernameFromPath();

    if (username) {
      try {
        const token = getTokenFromQuery();
        const url = token
          ? `/api/portfolio/${encodeURIComponent(username)}?token=${encodeURIComponent(token)}`
          : `/api/portfolio/${encodeURIComponent(username)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Portfolio not found');
        const data = await res.json();
        renderPublic(data);
      } catch (err) {
        console.error(err);
        const app = qs('#portfolioApp');
        if (app) {
          app.innerHTML = `
            <section class="portfolio-hero">
              <h2>Portfolio not found</h2>
              <p>This portfolio is invite-only. Use a valid invite link.</p>
            </section>
          `;
          const staticShell = qs('#portfolioStatic');
          if (staticShell) staticShell.style.display = 'none';
        }
      }

      return;
    }

    // /portfolio -> show current user's editor
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        renderSignInRequired();

        const items = await fetchSitePortfolio();
        const mount = qs('#sitePortfolioMount');
        if (mount) mount.innerHTML = renderSitePortfolio(items);
        return;
      }
      const me = await meRes.json();

      const portfolioRes = await fetch('/api/portfolio/me');
      if (!portfolioRes.ok) throw new Error('Failed to load portfolio');
      const { portfolio } = await portfolioRes.json();

      renderMe({ portfolio, meUser: me.user });

      const items = await fetchSitePortfolio();
      const app = qs('#portfolioApp');
      if (app) {
        app.insertAdjacentHTML('beforeend', renderSitePortfolio(items));
      }
    } catch (err) {
      console.error(err);
      renderSignInRequired();

      const items = await fetchSitePortfolio();
      const mount = qs('#sitePortfolioMount');
      if (mount) mount.innerHTML = renderSitePortfolio(items);
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
