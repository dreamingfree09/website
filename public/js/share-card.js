/**
 * public/js/share-card.js
 *
 * Renders the combined share card (bio + portfolio) for a tokenized share URL.
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

  const formatBytes = (bytes) => {
    const b = Number(bytes || 0);
    if (!Number.isFinite(b) || b <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let idx = 0;
    let v = b;
    while (v >= 1024 && idx < units.length - 1) {
      v /= 1024;
      idx += 1;
    }
    return `${v.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
  };

  const getTokenFromPath = () => {
    const match = window.location.pathname.match(/^\/share\/card\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  const renderList = (items) => {
    const arr = Array.isArray(items) ? items : [];
    if (!arr.length) return '';
    return `<ul>${arr.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
  };

  const renderTags = (items) => {
    const arr = Array.isArray(items) ? items : [];
    if (!arr.length) return '';
    return `<div class="project-tags">${arr.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`;
  };

  const buildSection = (title, innerHtml) => {
    if (!innerHtml) return '';
    return `
      <section class="skills-section">
        <h3>${escapeHtml(title)}</h3>
        ${innerHtml}
      </section>
    `;
  };

  const render = (data) => {
    const root = qs('#shareCardRoot');
    if (!root) return;

    const user = data?.user;
    const details = data?.profileDetails || {};
    const identity = details?.identity || {};
    const about = details?.about || {};
    const career = details?.careerIntent || {};
    const skills = details?.skills || {};
    const exp = details?.experience || {};
    const learning = details?.learning || {};
    const links = details?.links || {};

    const portfolio = data?.portfolio || null;
    const documents = Array.isArray(data?.documents) ? data.documents : [];

    const displayName = identity?.displayName || user?.username || '';
    const headline = identity?.headline || '';
    const locationBits = [identity?.location, identity?.timezone].filter(Boolean).map(String);

    const headerHtml = `
      <div class="profile-header">
        <div class="profile-avatar">
          <img src="${escapeHtml(user?.avatar || '/images/default-avatar.png')}" alt="${escapeHtml(displayName)}" />
        </div>
        <div class="profile-info">
          <h1>${escapeHtml(displayName)}</h1>
          ${headline ? `<p class="profile-bio">${escapeHtml(headline)}</p>` : ''}
          ${locationBits.length ? `<p class="empty-message">${escapeHtml(locationBits.join(' · '))}</p>` : ''}
        </div>
      </div>
    `;

    const aboutHtml = [
      about?.summaryShort ? `<p>${escapeHtml(about.summaryShort)}</p>` : '',
      about?.summaryLong ? `<p>${escapeHtml(about.summaryLong)}</p>` : '',
      about?.personalMission ? `<p><strong>Mission:</strong> ${escapeHtml(about.personalMission)}</p>` : '',
      Array.isArray(about?.values) && about.values.length ? `<p><strong>Values</strong></p>${renderTags(about.values)}` : '',
      Array.isArray(about?.strengths) && about.strengths.length ? `<p><strong>Strengths</strong></p>${renderTags(about.strengths)}` : '',
      Array.isArray(about?.growthAreas) && about.growthAreas.length ? `<p><strong>Growth Areas</strong></p>${renderTags(about.growthAreas)}` : '',
      (about?.workingStyle?.collaborationStyle || about?.workingStyle?.communicationStyle || about?.workingStyle?.feedbackStyle)
        ? `
          <div class="profile-edit-card">
            ${about?.workingStyle?.collaborationStyle ? `<p><strong>Collaboration:</strong> ${escapeHtml(about.workingStyle.collaborationStyle)}</p>` : ''}
            ${about?.workingStyle?.communicationStyle ? `<p><strong>Communication:</strong> ${escapeHtml(about.workingStyle.communicationStyle)}</p>` : ''}
            ${about?.workingStyle?.feedbackStyle ? `<p><strong>Feedback:</strong> ${escapeHtml(about.workingStyle.feedbackStyle)}</p>` : ''}
          </div>
        `
        : '',
      Array.isArray(about?.funFacts) && about.funFacts.length ? `<p><strong>Fun Facts</strong></p>${renderList(about.funFacts)}` : '',
    ].filter(Boolean).join('');

    const careerHtml = [
      Array.isArray(career?.targetRoles) && career.targetRoles.length ? `<p><strong>Target Roles</strong></p>${renderTags(career.targetRoles)}` : '',
      career?.targetRoleLevel ? `<p><strong>Level:</strong> ${escapeHtml(career.targetRoleLevel)}</p>` : '',
      Array.isArray(career?.industriesOfInterest) && career.industriesOfInterest.length ? `<p><strong>Industries</strong></p>${renderTags(career.industriesOfInterest)}` : '',
      career?.workPreferences ? `
        <div class="profile-edit-card">
          ${career.workPreferences.workType ? `<p><strong>Work Type:</strong> ${escapeHtml(career.workPreferences.workType)}</p>` : ''}
          ${career.workPreferences.remotePreference ? `<p><strong>Remote:</strong> ${escapeHtml(career.workPreferences.remotePreference)}</p>` : ''}
          ${career.workPreferences.relocation ? `<p><strong>Relocation:</strong> ${escapeHtml(career.workPreferences.relocation)}</p>` : ''}
          ${career.workPreferences.travelWillingness ? `<p><strong>Travel:</strong> ${escapeHtml(career.workPreferences.travelWillingness)}</p>` : ''}
        </div>
      ` : '',
      career?.availability ? `
        <div class="profile-edit-card">
          ${career.availability.status ? `<p><strong>Availability:</strong> ${escapeHtml(career.availability.status)}</p>` : ''}
          ${career.availability.startDate ? `<p><strong>Start:</strong> ${escapeHtml(career.availability.startDate)}</p>` : ''}
        </div>
      ` : '',
    ].filter(Boolean).join('');

    const skillsHtml = [
      Array.isArray(skills?.topSkills) && skills.topSkills.length ? `<p><strong>Top Skills</strong></p>${renderTags(skills.topSkills)}` : '',
      Array.isArray(skills?.secondarySkills) && skills.secondarySkills.length ? `<p><strong>Secondary Skills</strong></p>${renderTags(skills.secondarySkills)}` : '',
      Array.isArray(skills?.softSkills) && skills.softSkills.length ? `<p><strong>Soft Skills</strong></p>${renderTags(skills.softSkills)}` : '',
      skills?.toolsAndTech ? [
        Array.isArray(skills.toolsAndTech.languages) && skills.toolsAndTech.languages.length ? `<p><strong>Languages</strong></p>${renderTags(skills.toolsAndTech.languages)}` : '',
        Array.isArray(skills.toolsAndTech.frameworks) && skills.toolsAndTech.frameworks.length ? `<p><strong>Frameworks</strong></p>${renderTags(skills.toolsAndTech.frameworks)}` : '',
        Array.isArray(skills.toolsAndTech.databases) && skills.toolsAndTech.databases.length ? `<p><strong>Databases</strong></p>${renderTags(skills.toolsAndTech.databases)}` : '',
        Array.isArray(skills.toolsAndTech.cloudPlatforms) && skills.toolsAndTech.cloudPlatforms.length ? `<p><strong>Cloud</strong></p>${renderTags(skills.toolsAndTech.cloudPlatforms)}` : '',
        Array.isArray(skills.toolsAndTech.devopsTools) && skills.toolsAndTech.devopsTools.length ? `<p><strong>DevOps</strong></p>${renderTags(skills.toolsAndTech.devopsTools)}` : '',
        Array.isArray(skills.toolsAndTech.securityTools) && skills.toolsAndTech.securityTools.length ? `<p><strong>Security Tools</strong></p>${renderTags(skills.toolsAndTech.securityTools)}` : '',
      ].filter(Boolean).join('') : '',
    ].filter(Boolean).join('');

    const renderExperienceGroup = (arr) => {
      const items = Array.isArray(arr) ? arr : [];
      if (!items.length) return '';
      return items.map((x) => {
        const header = [x?.title, x?.company].filter(Boolean).join(' — ');
        const dates = [x?.startDate, x?.endDate].filter(Boolean).join(' → ');
        const blocks = [
          dates ? `<p class="empty-message">${escapeHtml(dates)}</p>` : '',
          x?.location ? `<p class="empty-message">${escapeHtml(x.location)}</p>` : '',
          Array.isArray(x?.impactHighlights) && x.impactHighlights.length ? `<p><strong>Impact</strong></p>${renderList(x.impactHighlights)}` : '',
          Array.isArray(x?.responsibilities) && x.responsibilities.length ? `<p><strong>Responsibilities</strong></p>${renderList(x.responsibilities)}` : '',
          Array.isArray(x?.techUsed) && x.techUsed.length ? `<p><strong>Tech</strong></p>${renderTags(x.techUsed)}` : '',
        ].filter(Boolean).join('');

        return `
          <div class="project-card">
            <h4>${escapeHtml(header || 'Experience')}</h4>
            ${blocks}
          </div>
        `;
      }).join('');
    };

    const experienceHtml = [
      renderExperienceGroup(exp?.work),
      renderExperienceGroup(exp?.internships),
      renderExperienceGroup(exp?.freelance),
      renderExperienceGroup(exp?.volunteering),
    ].filter(Boolean).join('');

    const renderDatedItems = (items) => {
      const arr = Array.isArray(items) ? items : [];
      if (!arr.length) return '';
      return arr.map((x) => {
        const title = x?.title || '';
        const org = x?.org || '';
        const year = x?.year ? String(x.year) : '';
        const url = x?.url ? String(x.url) : '';
        const line = [title, org, year].filter(Boolean).join(' — ');
        return `<li>${escapeHtml(line)}${url ? ` — <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Link</a>` : ''}</li>`;
      }).join('');
    };

    const learningHtml = [
      Array.isArray(learning?.education) && learning.education.length ? `<p><strong>Education</strong></p><ul>${renderDatedItems(learning.education)}</ul>` : '',
      Array.isArray(learning?.certifications) && learning.certifications.length ? `<p><strong>Certifications</strong></p><ul>${renderDatedItems(learning.certifications)}</ul>` : '',
      Array.isArray(learning?.courses) && learning.courses.length ? `<p><strong>Courses</strong></p><ul>${renderDatedItems(learning.courses)}</ul>` : '',
      learning?.learningGoals ? `<p><strong>Learning Goals:</strong> ${escapeHtml(learning.learningGoals)}</p>` : '',
    ].filter(Boolean).join('');

    const linksItems = [];
    if (links?.github) linksItems.push(`<a href="${escapeHtml(links.github)}" target="_blank" rel="noopener noreferrer">GitHub</a>`);
    if (links?.linkedin) linksItems.push(`<a href="${escapeHtml(links.linkedin)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>`);
    if (links?.twitter) linksItems.push(`<a href="${escapeHtml(links.twitter)}" target="_blank" rel="noopener noreferrer">Twitter/X</a>`);
    if (links?.website) linksItems.push(`<a href="${escapeHtml(links.website)}" target="_blank" rel="noopener noreferrer">Website</a>`);
    if (links?.youtube) linksItems.push(`<a href="${escapeHtml(links.youtube)}" target="_blank" rel="noopener noreferrer">YouTube</a>`);
    if (links?.blog) linksItems.push(`<a href="${escapeHtml(links.blog)}" target="_blank" rel="noopener noreferrer">Blog</a>`);
    const otherLinks = Array.isArray(links?.other) ? links.other : [];
    otherLinks.forEach((l) => {
      if (l?.url) linksItems.push(`<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label || 'Link')}</a>`);
    });

    const linksHtml = linksItems.length ? `<p class="profile-social">${linksItems.join(' · ')}</p>` : '';

    const portfolioHtml = portfolio ? (() => {
      const headline2 = portfolio?.headline ? escapeHtml(portfolio.headline) : 'Portfolio';
      const bio2 = portfolio?.bio ? escapeHtml(portfolio.bio) : '';
      const skills2 = Array.isArray(portfolio?.skills) ? portfolio.skills : [];
      const projects = Array.isArray(portfolio?.projects) ? portfolio.projects : [];

      const projectsHtml = projects.length
        ? `<div class="projects-grid">${projects.map((p) => {
            const links = [
              p.demoUrl ? `<a href="${escapeHtml(p.demoUrl)}" target="_blank" rel="noopener noreferrer">Demo</a>` : '',
              p.repoUrl ? `<a href="${escapeHtml(p.repoUrl)}" target="_blank" rel="noopener noreferrer">Repo</a>` : ''
            ].filter(Boolean).join(' · ');
            const tags = Array.isArray(p.tags) ? p.tags : [];
            return `
              <div class="project-card">
                <h4>${escapeHtml(p.title || 'Untitled project')}</h4>
                <p>${escapeHtml(p.description || '')}</p>
                ${links ? `<p class="profile-social">${links}</p>` : ''}
                ${tags.length ? `<div class="project-tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
              </div>
            `;
          }).join('')}</div>`
        : `<p class="empty-message">No projects shared.</p>`;

      return `
        <section class="projects-section">
          <h3>${headline2}</h3>
          ${bio2 ? `<p>${bio2}</p>` : ''}
          ${skills2.length ? renderTags(skills2) : ''}
          ${projectsHtml}
        </section>
      `;
    })() : '';

    const documentsHtml = documents.length ? `
      <div class="projects-grid">
        ${documents.map((d) => {
          const label = d.label || d.originalName || 'Document';
          const meta = [d.type, formatBytes(d.sizeBytes)].filter(Boolean).join(' · ');
          return `
            <div class="project-card">
              <h4>${escapeHtml(label)}</h4>
              ${meta ? `<p class="empty-message">${escapeHtml(meta)}</p>` : ''}
              <p class="profile-social"><a href="${escapeHtml(d.downloadUrl)}">Download</a></p>
            </div>
          `;
        }).join('')}
      </div>
    ` : '';

    root.innerHTML = [
      headerHtml,
      buildSection('About', aboutHtml),
      buildSection('Career Intent', careerHtml),
      buildSection('Skills', skillsHtml),
      buildSection('Experience', experienceHtml),
      buildSection('Education & Learning', learningHtml),
      linksHtml ? buildSection('Links', linksHtml) : '',
      portfolioHtml,
      documentsHtml ? buildSection('Documents', documentsHtml) : '',
    ].filter(Boolean).join('');
  };

  const showStatus = (title, message) => {
    const status = qs('#shareCardStatus');
    if (!status) return;
    status.innerHTML = `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p>`;
  };

  const init = async () => {
    const token = getTokenFromPath();
    if (!token) {
      showStatus('Invalid link', 'No token provided.');
      return;
    }

    try {
      const res = await fetch(`/share/card/${encodeURIComponent(token)}/data`);
      if (res.status === 410) {
        showStatus('Link expired', 'Ask the owner to generate a new share link.');
        return;
      }
      if (!res.ok) {
        showStatus('Link invalid', 'This share link is invalid or has expired.');
        return;
      }

      const data = await res.json();
      render(data);
    } catch (e) {
      showStatus('Error', 'Failed to load share card.');
    }
  };

  init();
})();
