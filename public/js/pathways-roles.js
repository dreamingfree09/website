/*
  public/js/pathways-roles.js

  Role explorer for the IT Pathways page.

  Goal:
  - Provide a “job title list → detailed roadmap” experience.
  - Keep it lightweight and fully client-side.
  - Work even if the admin-managed Pathways HTML is injected at runtime.
*/

(function () {
  const listEl = document.getElementById('roleList');
  const detailEl = document.getElementById('roleDetail');
  if (!listEl || !detailEl) return;

  const LEVELS = /** @type {const} */ (['entry', 'intermediate', 'expert']);
  const levelLabel = {
    entry: 'Entry',
    intermediate: 'Intermediate',
    expert: 'Expert',
  };

  const CATEGORIES = /** @type {const} */ ([
    { key: 'start0', label: 'Start Here (No Experience)' },
    { key: 'start1', label: 'Start Here (Some Tech Background)' },
    { key: 'infra', label: 'IT & Infrastructure' },
    { key: 'networking', label: 'Networking & NOC' },
    { key: 'cloud', label: 'Cloud' },
    { key: 'platform', label: 'DevOps & Platform' },
    { key: 'security', label: 'Security' },
    { key: 'data', label: 'Data' },
    { key: 'software', label: 'Software Development' },
    { key: 'design', label: 'Design & UX' },
    { key: 'leadership', label: 'Leadership & Architecture' },
  ]);

  const START_NO_EXPERIENCE_IDS = new Set([
    'it-support',
    'desktop-support',
    'field-tech',
    'it-ops-coordinator',
    'security-awareness',
    'qa-automation',
    'data-analyst',
    'grc',
    'compliance-analyst',
  ]);

  const START_SOME_TECH_IDS = new Set([
    'network-tech',
    'noc-analyst',
    'cloud-support',
    'soc-analyst',
    'vuln-management',
    'frontend-dev',
    'backend-dev',
    'mobile-dev',
  ]);

  const inferCategoryKey = (role) => {
    if (!role) return 'infra';
    if (START_NO_EXPERIENCE_IDS.has(role.id)) return 'start0';
    if (START_SOME_TECH_IDS.has(role.id)) return 'start1';

    const id = String(role.id || '').toLowerCase();
    const title = String(role.title || '').toLowerCase();

    const has = (needle) => id.includes(needle) || title.includes(needle);

    if (
      has('security') ||
      has('soc') ||
      has('pentest') ||
      has('forensics') ||
      has('threat') ||
      has('incident') ||
      has('appsec') ||
      has('iam') ||
      has('siem') ||
      has('vuln') ||
      has('purple') ||
      has('malware') ||
      has('privacy')
    ) {
      return 'security';
    }

    if (has('data') || has('analytics') || has('ml') || has('machine learning')) return 'data';
    if (has('frontend') || has('backend') || has('full stack') || has('fullstack') || has('sdet') || has('qa') || has('product engineer') || has('mobile')) {
      return 'software';
    }

    if (has('ux') || has('design system')) return 'design';

    if (has('architect') || has('lead') || has('manager') || has('solutions') || has('program')) return 'leadership';

    if (has('devops') || has('sre') || has('platform') || has('kubernetes') || has('observability') || has('release') || has('build') || has('ci')) return 'platform';
    if (has('cloud')) return 'cloud';
    if (has('network') || has('noc')) return 'networking';
    if (
      has('linux') ||
      has('windows') ||
      has('systems') ||
      has('dba') ||
      has('database') ||
      has('it support') ||
      has('desktop') ||
      has('field') ||
      has('servicenow') ||
      has('storage') ||
      has('backup') ||
      has('virtualization') ||
      has('microsoft 365') ||
      has('m365')
    )
      return 'infra';

    return 'infra';
  };

  /**
   * NOTE: Certs and role expectations vary by company/region.
   * These roadmaps are intentionally pragmatic and beginner-friendly.
   */
  const roles = [
    {
      id: 'it-support',
      title: 'IT Support / Help Desk',
      icon: '🛠️',
      level: 'entry',
      overview:
        'Entry-level role focused on troubleshooting, user support, and keeping devices/accounts running. Great foundation for almost any IT path.',
      freePlatforms: [
        { name: 'Microsoft Learn', url: 'https://learn.microsoft.com/training/' },
        { name: 'Cisco Skills For All', url: 'https://skillsforall.com/' },
      ],
      youtubeCreators: [
        { name: 'Professor Messer', url: 'https://www.youtube.com/@professormesser' },
        { name: 'NetworkChuck', url: 'https://www.youtube.com/@NetworkChuck' },
      ],
      bestFor: [
        'You like solving problems and helping people',
        'You want a fast entry into IT while you learn',
        'You want strong fundamentals for networking, cloud, or security',
      ],
      steps: [
        'Learn PC hardware + Windows basics (files, users, permissions, networking basics)',
        'Practice troubleshooting workflows (reproduce → isolate → fix → verify → document)',
        'Learn ticketing, SLAs, and clear written communication',
        'Add basic networking (IP, DNS, DHCP, Wi‑Fi, VLAN concepts)',
      ],
      skills: ['Windows', 'Basic networking', 'Active Directory basics', 'Ticketing', 'Customer communication', 'Documentation'],
      certs: {
        beginner: ['CompTIA A+ (common starting point)', 'ITIL 4 Foundation (good for service management)'],
        next: ['CompTIA Network+ (if you like networking)', 'Microsoft MS-900 (Microsoft 365 fundamentals)'],
      },
      projects: [
        'Home lab: create 2–3 Windows user accounts + permissions model',
        'Document 10 common fixes (Wi‑Fi, printers, password reset, DNS cache, etc.)',
        'Set up a simple helpdesk workflow (even a spreadsheet) and write “ticket notes”',
      ],
      nextRoles: ['systems-admin', 'network-tech', 'cloud-support', 'soc-analyst'],
    },
    {
      id: 'systems-admin',
      title: 'Systems Administrator',
      icon: '🧰',
      level: 'intermediate',
      overview:
        'Maintains servers, identity, access, patching, backups, and reliability. Often the “core IT” role bridging support and infrastructure.',
      bestFor: ['You like owning systems end-to-end', 'You enjoy automation and reliability work', 'You want a bridge into cloud/DevOps'],
      steps: [
        'Learn Windows Server or Linux administration fundamentals',
        'Master identity + access basics (AD, groups, least privilege)',
        'Learn patching, backups, monitoring, and incident response basics',
        'Automate repetitive tasks (PowerShell or Bash)',
      ],
      skills: ['Windows Server or Linux', 'AD / IAM', 'Networking fundamentals', 'Backups', 'Monitoring', 'PowerShell/Bash'],
      certs: {
        beginner: ['CompTIA Network+ (helpful baseline)', 'Linux Essentials or Linux+ (if Linux track)'],
        next: ['Microsoft AZ-900 (cloud fundamentals)', 'RHCSA (Linux admin path)'],
      },
      projects: [
        'Home lab: set up a small domain (or simulate IAM groups + policies)',
        'Write scripts to create users, reset passwords, or collect system health stats',
        'Backups: implement a backup + restore test and document the runbook',
      ],
      nextRoles: ['devops', 'cloud-engineer', 'security-engineer'],
    },
    {
      id: 'network-tech',
      title: 'Network Technician / Network Admin',
      icon: '🌐',
      level: 'entry',
      overview:
        'Builds and maintains networks: switching, routing, Wi‑Fi, DNS/DHCP, and troubleshooting latency/connectivity issues.',
      freePlatforms: [
        { name: 'Cisco Skills For All', url: 'https://skillsforall.com/' },
      ],
      youtubeCreators: [
        { name: 'Jeremy’s IT Lab', url: 'https://www.youtube.com/@JeremysITLab' },
        { name: 'David Bombal', url: 'https://www.youtube.com/@davidbombal' },
      ],
      bestFor: ['You like understanding how systems connect', 'You enjoy hands-on troubleshooting', 'You want a path into cloud/security'],
      steps: [
        'Learn IP subnetting, routing, switching, and common protocols',
        'Practice troubleshooting with ping/traceroute/DNS tools',
        'Understand VLANs, NAT, firewalls (basics), and Wi‑Fi design concepts',
        'Get comfortable reading network diagrams and documenting changes',
      ],
      skills: ['TCP/IP', 'Subnetting', 'Routing/Switching basics', 'DNS/DHCP', 'Wi‑Fi basics', 'Network troubleshooting'],
      certs: {
        beginner: ['CompTIA Network+'],
        next: ['Cisco CCNA (very common networking milestone)'],
      },
      projects: [
        'Build a small network diagram of your home lab and keep it updated',
        'Run a DNS troubleshooting checklist and document root causes',
        'Simulate VLANs and routing concepts in a lab environment',
      ],
      nextRoles: ['cloud-engineer', 'soc-analyst', 'security-engineer'],
    },
    {
      id: 'cloud-support',
      title: 'Cloud Support (Associate)',
      icon: '☁️',
      level: 'entry',
      overview:
        'Helps customers/teams troubleshoot cloud services (compute, storage, networking, IAM). Strong entry point into cloud engineering.',
      bestFor: ['You like troubleshooting but want cloud exposure', 'You learn quickly from real incidents'],
      steps: [
        'Learn cloud fundamentals: IAM, networks, storage, compute, logging',
        'Practice reading errors and narrowing issues (permissions vs network vs config)',
        'Build small deployments and break/fix them intentionally',
      ],
      skills: ['Cloud IAM', 'Cloud networking', 'Logs/monitoring', 'Troubleshooting', 'Linux basics'],
      certs: {
        beginner: ['AWS Certified Cloud Practitioner or AZ-900 (choose one)'],
        level: 'intermediate',
        next: ['AWS Solutions Architect Associate or AZ-104 (choose one)'],
      },
      projects: [
        'Deploy a basic web app: static site + CDN + DNS',
        'Set up least-privilege IAM and document your permission model',
        'Add logs/metrics and create a simple “incident” runbook',
      ],
      nextRoles: ['cloud-engineer', 'devops', 'security-engineer'],
    },
    {
        level: 'intermediate',
      id: 'cloud-engineer',
      title: 'Cloud Engineer',
      icon: '🛰️',
      overview:
        'Designs and builds cloud infrastructure, networks, IAM, and platform services. Often uses Infrastructure-as-Code and automation.',
      bestFor: ['You like systems design + automation', 'You want to build scalable infrastructure'],
      steps: [
        'Pick a main cloud (AWS/Azure/GCP) and learn its core services',
        'Learn IaC (Terraform is common) and environment management',
        'Build secure networks + IAM (least privilege, separation of duties)',
        'Practice monitoring, cost awareness, and operational runbooks',
      ],
      skills: ['Cloud networking', 'IAM', 'Terraform/IaC', 'Linux', 'Monitoring', 'Security basics'],
      certs: {
        beginner: ['AWS SAA or AZ-104'],
        level: 'expert',
        next: ['Terraform Associate', 'CKA/CKAD (if Kubernetes-heavy path)'],
      },
      projects: [
        'IaC: deploy VPC/VNet + subnets + security groups + a small app stack',
        'Add CI to validate Terraform and run security checks',
        'Write a cost note: explain your architecture and cost drivers',
      ],
      nextRoles: ['devops', 'sre', 'security-engineer'],
    },
    {
        level: 'entry',
      id: 'devops',
      title: 'DevOps Engineer',
      icon: '🔁',
      overview:
        'Builds pipelines and automation so teams can ship safely and frequently. CI/CD, observability, infrastructure, and developer experience.',
      bestFor: ['You like automation and improving delivery', 'You enjoy debugging pipelines and systems'],
      steps: [
        'Learn CI/CD basics (build → test → deploy) and branching strategies',
        'Learn containers (Docker) and basic orchestration concepts',
        'Learn observability: logs, metrics, traces',
        'Automate infra and app delivery (IaC + pipelines)',
      ],
      skills: ['CI/CD', 'Docker', 'Linux', 'Cloud basics', 'IaC', 'Monitoring'],
      certs: {
        beginner: ['AZ-900 or AWS CCP (if new to cloud)'],
        level: 'intermediate',
        next: ['CKA/CKAD (Kubernetes)', 'Terraform Associate'],
      },
      projects: [
        'Create a CI pipeline that runs lint/tests and produces an artifact',
        'Deploy a small app with one-click rollback',
        'Add dashboards/alerts and write an incident playbook',
      ],
      nextRoles: ['sre', 'platform-engineer', 'cloud-engineer'],
    },
    {
        level: 'intermediate',
      id: 'sre',
      title: 'Site Reliability Engineer (SRE)',
      icon: '📈',
      overview:
        'Focuses on reliability at scale using engineering approaches: SLOs, error budgets, automation, and incident management.',
      bestFor: ['You like reliability + metrics', 'You enjoy incident response and root-cause analysis'],
      steps: [
        'Learn monitoring fundamentals and define SLOs for a service',
        'Practice incident response: detect → mitigate → recover → postmortem',
        'Automate toil and build reliable deployment strategies',
      ],
      skills: ['Observability', 'Linux', 'Automation', 'Distributed systems basics', 'Incident response'],
      certs: {
        beginner: ['None required, but cloud + Kubernetes help'],
        level: 'entry',
        next: ['CKA', 'Cloud associate-level (SAA/AZ-104)'],
      },
      projects: [
        'Add SLOs + dashboards to a demo service and measure error budget burn',
        'Write a postmortem template and fill it after simulated incidents',
      ],
      nextRoles: ['platform-engineer', 'devops', 'cloud-architect'],
    },
    {
        level: 'entry',
      id: 'soc-analyst',
      title: 'Security Analyst (SOC)',
      icon: '🕵️',
      overview:
        'Monitors alerts, investigates suspicious activity, triages incidents, and improves detections. A common entry point into security.',
      bestFor: ['You like investigation and pattern recognition', 'You want a clear entry path into cybersecurity'],
      steps: [
        'Learn security fundamentals: CIA triad, common attacks, basic networking',
        'Learn how logs work (Windows events, auth logs, web server logs)',
        'Practice triage: what’s noise vs real risk',
        'Learn a SIEM workflow and write clear incident notes',
      ],
      skills: ['Networking basics', 'Windows/Linux basics', 'Log analysis', 'Threat thinking', 'Communication'],
      certs: {
        beginner: ['CompTIA Security+ (common baseline)'],
        level: 'intermediate',
        next: ['CompTIA CySA+ (blue-team leaning)', 'Microsoft SC-900 (security fundamentals)'],
      },
      projects: [
        'Build a small lab and generate logs (login failures, malware simulation safely, etc.)',
        'Write detection notes: what signal you used, what you concluded, what you recommend',
      ],
      nextRoles: ['security-engineer', 'ir-analyst', 'grc'],
    },
    {
      id: 'security-engineer',
      title: 'Security Engineer',
      icon: '🛡️',
      overview:
        'Builds security controls: IAM policies, endpoint/security tooling, secure configs, vulnerability management, and automation.',
      bestFor: ['You want to build defenses, not just monitor', 'You like configuration + automation'],
      steps: [
        'Become strong in IAM, OS hardening basics, and network security basics',
        'Learn vulnerability management: scanning, prioritization, remediation workflows',
        'Learn cloud security patterns (least privilege, logging, segmentation)',
        'Automate security checks where possible',
      ],
      skills: ['IAM', 'Hardening basics', 'Vulnerability management', 'Cloud security basics', 'Scripting'],
      certs: {
        beginner: ['Security+'],
        next: ['SC-200/SC-300 (Microsoft tracks)', 'AWS Security Specialty (advanced, later)'],
      },
      projects: [
        'Write a hardening checklist and apply it to a lab VM',
        'Create a vulnerability remediation plan and track it',
        'Enable logging + alerts for a small cloud environment',
      ],
      nextRoles: ['cloud-security', 'appsec', 'security-architect'],
    },
    {
      id: 'pentester',
      title: 'Penetration Tester (Ethical Hacker)',
      icon: '🧪',
      overview:
        'Finds security weaknesses through testing and reports actionable fixes. Requires strong fundamentals and careful ethics/legal boundaries.',
      bestFor: ['You like breaking things to improve them', 'You enjoy deep technical learning'],
      steps: [
        'Master networking + web basics (HTTP, auth, sessions, common vulnerabilities)',
        'Learn Linux and scripting for automation',
        'Practice legally in labs and focus on reporting quality',
      ],
      skills: ['Web security basics', 'Networking', 'Linux', 'Scripting', 'Reporting'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['CompTIA PenTest+ (intro)', 'OSCP (advanced, significant effort)'],
      },
      projects: [
        'Write 3 sample pentest reports from lab findings (with remediation steps)',
        'Build a “web vuln lab notes” page: what you tried, what worked, why',
      ],
      nextRoles: ['appsec', 'red-team', 'security-consultant'],
    },
    {
      id: 'frontend-dev',
      title: 'Frontend Developer',
      icon: '🎨',
      overview:
        'Builds user interfaces and client-side behavior. Strong focus on UX, performance, accessibility, and clean UI architecture.',
      freePlatforms: [
        { name: 'freeCodeCamp', url: 'https://www.freecodecamp.org/' },
        { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
      ],
      youtubeCreators: [
        { name: 'Traversy Media', url: 'https://www.youtube.com/@TraversyMedia' },
        { name: 'Web Dev Simplified', url: 'https://www.youtube.com/@WebDevSimplified' },
      ],
      bestFor: ['You enjoy UI/UX and visual polish', 'You like building things people interact with'],
      steps: [
        'Master HTML/CSS/JS fundamentals',
        'Learn a UI framework (React is common) and component patterns',
        'Learn accessibility and performance basics',
        'Build a portfolio with real, deployed projects',
      ],
      skills: ['HTML/CSS/JS', 'Accessibility', 'Performance', 'Component architecture', 'Testing basics'],
      certs: {
        beginner: ['Not required; portfolio matters more'],
        next: ['Cloud/web fundamentals can help (deployment, CI)'],
      },
      projects: [
        'Build 2–3 polished UI projects (responsive + accessible)',
        'Add tests (unit or e2e) and a CI pipeline',
        'Deploy and document your decisions (tradeoffs, perf)',
      ],
      nextRoles: ['fullstack-dev', 'ui-engineer', 'frontend-lead'],
    },
    {
      id: 'backend-dev',
      title: 'Backend Developer',
      icon: '⚙️',
      overview:
        'Builds APIs, services, databases, authentication, and business logic. Focus on correctness, security, performance, and maintainability.',
      bestFor: ['You enjoy systems and logic', 'You like databases and APIs'],
      steps: [
        'Learn one backend stack deeply (Node/Express, Python, Java, etc.)',
        'Learn database basics (SQL + indexes + modeling)',
        'Learn auth, security basics, and API design',
        'Build 2–3 API projects and deploy them',
      ],
      skills: ['API design', 'Databases', 'Security basics', 'Testing', 'Debugging'],
      certs: {
        beginner: ['Not required; projects + fundamentals matter most'],
        next: ['Cloud associate-level can help for deployment (AZ-900/AWS CCP)'],
      },
      projects: [
        'Build a CRUD API + auth + role permissions',
        'Add rate limiting, validation, and security headers',
        'Add tests and basic observability (logs/metrics)',
      ],
      nextRoles: ['fullstack-dev', 'platform-engineer', 'backend-lead'],
    },
    {
      id: 'fullstack-dev',
      title: 'Full Stack Developer',
      icon: '🚀',
      overview:
        'Builds both frontend and backend. Great for shipping end-to-end products and learning system tradeoffs.',
      bestFor: ['You want to build complete apps', 'You like variety and fast iteration'],
      steps: [
        'Get solid at one side first (frontend or backend)',
        'Learn the other side enough to ship end-to-end',
        'Learn deployment basics and CI/CD',
      ],
      skills: ['UI + API', 'Databases', 'Auth', 'Deployment', 'Testing'],
      certs: {
        beginner: ['Not required'],
        next: ['Cloud fundamentals can help'],
      },
      projects: [
        'Ship a full app: auth, CRUD, permissions, deployment, and docs',
        'Add performance improvements and write a “what I improved” note',
      ],
      nextRoles: ['tech-lead', 'product-engineer', 'platform-engineer'],
    },
    {
      id: 'qa-automation',
      title: 'QA / Test Automation Engineer',
      icon: '✅',
      level: 'entry',
      overview:
        'Improves product quality through testing strategy, automation, and reliability. Often writes automated tests and builds test tooling.',
      bestFor: ['You like detail and preventing bugs', 'You enjoy building tooling and frameworks'],
      steps: [
        'Learn testing fundamentals (unit/integration/e2e)',
        'Learn one automation tool (Playwright/Cypress/Selenium)',
        'Learn CI pipelines and stable test design',
      ],
      skills: ['Testing strategy', 'Automation', 'CI', 'Debugging', 'Communication'],
      certs: {
        beginner: ['Not required'],
        next: ['Cloud/CI familiarity is a plus'],
      },
      projects: [
        'Add end-to-end tests to a demo app with CI',
        'Create a flaky-test checklist and stabilize tests',
      ],
      nextRoles: ['sdet', 'devops', 'engineering-lead'],
    },
    {
      id: 'data-analyst',
      title: 'Data Analyst',
      icon: '📊',
      level: 'entry',
      overview:
        'Turns data into insights through querying, dashboards, and storytelling. Strong business impact and a common entry into data careers.',
      bestFor: ['You like patterns and storytelling', 'You want a career with clear deliverables (dashboards/insights)'],
      steps: [
        'Learn SQL well (joins, aggregations, window functions basics)',
        'Learn spreadsheet modeling and a BI tool (Power BI/Tableau)',
        'Learn basic statistics and clear visualization principles',
      ],
      skills: ['SQL', 'Dashboards', 'Data cleaning', 'Visualization', 'Communication'],
      certs: {
        beginner: ['PL-300 (Power BI) can help if you go that route'],
        next: ['Cloud fundamentals if you work with cloud data platforms'],
      },
      projects: [
        'Create 2 dashboards with a written insights summary',
        'Build a small dataset cleaning + analysis notebook and publish it',
      ],
      nextRoles: ['data-engineer', 'analytics-engineer', 'data-scientist'],
    },
    {
      id: 'data-engineer',
      title: 'Data Engineer',
      icon: '🧱',
      level: 'intermediate',
      overview:
        'Builds pipelines and data platforms so analysts/scientists can reliably use data. Focus on ETL/ELT, modeling, and reliability.',
      bestFor: ['You like building systems and pipelines', 'You enjoy debugging data quality issues'],
      steps: [
        'Learn SQL + data modeling',
        'Learn one language for data (Python is common)',
        'Learn pipelines/orchestration basics and cloud storage concepts',
      ],
      skills: ['SQL', 'Python', 'Data modeling', 'Pipelines', 'Cloud storage'],
      certs: {
        beginner: ['Cloud fundamentals help (AZ-900/AWS CCP)'],
        next: ['Cloud data certs (platform-specific)'],
      },
      projects: [
        'Build a pipeline that ingests → cleans → models → publishes analytics tables',
        'Add data quality checks and a simple monitoring report',
      ],
      nextRoles: ['platform-engineer', 'analytics-engineer', 'data-architect'],
    },
    {
      id: 'grc',
      title: 'GRC (Governance, Risk, Compliance)',
      icon: '📜',
      level: 'entry',
      overview:
        'Security-focused role centered on policies, risk management, controls, and compliance. Less hands-on technical, more process and audit.',
      bestFor: ['You like policy/process and risk thinking', 'You want a security career that is not purely technical'],
      steps: [
        'Learn security fundamentals and common control concepts',
        'Learn risk assessments and how to write clear policies',
        'Understand how organizations measure compliance and evidence',
      ],
      skills: ['Risk thinking', 'Policy writing', 'Security fundamentals', 'Communication', 'Documentation'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['ISO/controls familiarity; advanced certs later as needed'],
      },
      projects: [
        'Write a sample security policy set for a small company (acceptable use, access, backups)',
        'Create a risk register with mitigations and owners',
      ],
      nextRoles: ['security-manager', 'compliance-analyst'],
    },
    {
      id: 'compliance-analyst',
      title: 'Compliance Analyst',
      icon: '🧾',
      level: 'entry',
      overview:
        'Helps organizations demonstrate compliance (SOC 2, ISO 27001, HIPAA, etc.) by managing evidence, control testing, and audit readiness.',
      bestFor: ['You like structured work and documentation', 'You want a security-adjacent role with clear checklists and outcomes'],
      steps: [
        'Learn common compliance frameworks and what controls are trying to achieve',
        'Learn evidence collection (screenshots, logs, tickets) and how to write clear control narratives',
        'Understand access reviews, change management, and security basics',
      ],
      skills: ['Documentation', 'Controls/evidence', 'Basic security concepts', 'Stakeholder communication', 'Process improvement'],
      certs: {
        beginner: ['Security+ (helpful foundation)'],
        next: ['ISO 27001 awareness; role-specific training as needed'],
      },
      projects: [
        'Write a sample SOC 2 evidence checklist for 10 common controls',
        'Create an access review template and run a mock review with sample data',
      ],
      nextRoles: ['grc', 'security-manager'],
    },
    {
      id: 'security-manager',
      title: 'Security Manager',
      icon: '🧑‍💼',
      level: 'expert',
      overview:
        'Leads security programs: priorities, roadmaps, policies, incident readiness, and cross-team delivery. Often a mix of leadership + technical awareness.',
      bestFor: ['You enjoy coordinating people and priorities', 'You can balance risk, delivery, and usability'],
      steps: [
        'Learn how security programs are run (policies, risk, incident response, metrics)',
        'Build strong stakeholder communication and executive reporting skills',
        'Develop incident leadership (tabletops, runbooks, comms)',
      ],
      skills: ['Program management', 'Risk management', 'Leadership', 'Incident coordination', 'Writing/communication'],
      certs: {
        beginner: ['Security+ (baseline)'],
        next: ['Advanced certs vary by domain; experience matters most'],
      },
      projects: [
        'Draft a lightweight security roadmap with milestones and owners',
        'Run a tabletop incident exercise and capture lessons learned',
      ],
      nextRoles: [],
    },
    {
      id: 'database-admin',
      title: 'Database Administrator (DBA)',
      icon: '🗄️',
      level: 'intermediate',
      overview:
        'Owns reliability, performance, backups, and security of databases. Often a blend of operations + deep SQL/data platform expertise.',
      bestFor: ['You like performance tuning and reliability', 'You enjoy careful change management and backups'],
      steps: [
        'Get strong at SQL and understanding query plans',
        'Learn backup/restore strategies and practice restores',
        'Learn indexing, replication basics, and performance monitoring',
      ],
      skills: ['SQL', 'Backup/restore', 'Performance tuning', 'Monitoring', 'Access controls'],
      certs: {
        beginner: ['Database platform fundamentals (vendor-specific)'],
        next: ['Cloud database services familiarity (AWS/Azure/GCP)'],
      },
      projects: [
        'Create a DB backup plan and run restore drills (document the RTO/RPO)',
        'Profile slow queries and tune indexes with measured before/after results',
      ],
      nextRoles: ['data-engineer', 'cloud-engineer', 'security-engineer'],
    },
    {
      id: 'platform-engineer',
      title: 'Platform Engineer',
      icon: '🏗️',
      level: 'expert',
      overview:
        'Builds internal platforms: CI/CD, Kubernetes, golden paths, developer tooling, and reliability guardrails so teams ship safely and fast.',
      bestFor: ['You like systems + developer experience', 'You enjoy automation and standardization at scale'],
      steps: [
        'Learn Linux + networking fundamentals',
        'Learn containers and Kubernetes basics',
        'Build CI/CD pipelines and infrastructure-as-code patterns',
        'Add observability (logs/metrics/traces) and SLO thinking',
      ],
      skills: ['Linux', 'Containers/Kubernetes', 'CI/CD', 'IaC', 'Observability', 'Reliability'],
      certs: {
        beginner: ['AZ-900/AWS CCP (cloud fundamentals)'],
        next: ['CKA/CKAD (Kubernetes)', 'AZ-104/AWS SAA (cloud associate)'],
      },
      projects: [
        'Create a "golden path" template repo with CI, linting, tests, and deploy',
        'Deploy a small app on Kubernetes with autoscaling + basic monitoring',
      ],
      nextRoles: ['sre', 'devops', 'cloud-engineer'],
    },
    {
      id: 'solutions-architect',
      title: 'Solutions Architect',
      icon: '🧩',
      level: 'expert',
      overview:
        'Designs systems end-to-end: requirements, tradeoffs, security, scalability, and cost. Often client-facing and documentation-heavy.',
      bestFor: ['You like big-picture design and tradeoffs', 'You can explain complex systems clearly'],
      steps: [
        'Learn system design fundamentals (availability, scaling, data, caching)',
        'Learn cloud building blocks (networking, IAM, compute, storage)',
        'Practice writing architecture docs and diagrams',
      ],
      skills: ['System design', 'Cloud fundamentals', 'Security basics', 'Communication', 'Cost awareness'],
      certs: {
        beginner: ['AZ-900/AWS CCP'],
        next: ['AWS Solutions Architect Associate or equivalent'],
      },
      projects: [
        'Write an architecture doc for a simple SaaS (auth, DB, caching, CDN, logs)',
        'Create threat model + mitigations for the design',
      ],
      nextRoles: ['cloud-engineer', 'security-engineer'],
    },
    {
      id: 'iam-engineer',
      title: 'IAM Engineer (Identity & Access)',
      icon: '🔐',
      level: 'intermediate',
      overview:
        'Specializes in identity, authentication/authorization, SSO, and least-privilege access across systems and cloud platforms.',
      bestFor: ['You like structured security work', 'You enjoy policy design and reducing access risk'],
      steps: [
        'Learn identity fundamentals (users, groups, roles, MFA, SSO)',
        'Learn IAM policies in a cloud provider and test least-privilege designs',
        'Learn access review processes and automation',
      ],
      skills: ['IAM', 'SSO', 'Policy design', 'Auditing', 'Automation basics'],
      certs: {
        beginner: ['AZ-900/AWS CCP'],
        next: ['Security+ (foundation)', 'Cloud associate certs help'],
      },
      projects: [
        'Build a least-privilege role set for a sample company (dev, ops, analyst)',
        'Create an access review + offboarding checklist and automate parts of it',
      ],
      nextRoles: ['cloud-security', 'security-engineer'],
    },
    {
      id: 'cloud-security',
      title: 'Cloud Security Engineer',
      icon: '☁️🔒',
      level: 'intermediate',
      overview:
        'Secures cloud environments with guardrails: IAM, network controls, logging, posture management, and secure deployment patterns.',
      bestFor: ['You like security + infrastructure', 'You want hands-on cloud security work'],
      steps: [
        'Get comfortable with cloud IAM and networking',
        'Learn secure-by-default patterns (least privilege, private networking, secrets)',
        'Learn cloud logging/monitoring and incident response basics',
      ],
      skills: ['Cloud IAM', 'Cloud networking', 'Logging/monitoring', 'Threat modeling basics', 'Automation'],
      certs: {
        beginner: ['Security+ (foundation)', 'AZ-900/AWS CCP'],
        next: ['AWS/Azure security specialty (optional; varies)'],
      },
      projects: [
        'Set up cloud logging + alerts for suspicious IAM changes',
        'Implement a secure VPC/VNet design with private subnets and minimal ingress',
      ],
      nextRoles: ['security-engineer', 'sre'],
    },
    {
      id: 'appsec',
      title: 'Application Security (AppSec) Engineer',
      icon: '🛡️',
      level: 'intermediate',
      overview:
        'Works with developers to prevent vulnerabilities: secure coding, threat modeling, dependency scanning, and security testing in CI/CD.',
      bestFor: ['You like security but also enjoy working with dev teams', 'You enjoy making secure defaults and guardrails'],
      steps: [
        'Learn OWASP Top 10 and common exploit patterns',
        'Learn secure coding practices in at least one stack (JS/Node, Python, Java, etc.)',
        'Learn SAST/DAST/dependency scanning and how to reduce false positives',
      ],
      skills: ['Secure coding', 'Threat modeling', 'App testing', 'Dependency risk', 'Developer collaboration'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Role-specific training; hands-on matters more than certs'],
      },
      projects: [
        'Add dependency scanning + basic SAST to a demo repo and triage findings',
        'Write a threat model for a login + payments flow and propose mitigations',
      ],
      nextRoles: ['security-engineer', 'pentester'],
    },
    {
      id: 'incident-response',
      title: 'Incident Responder',
      icon: '🚨',
      level: 'intermediate',
      overview:
        'Responds to security incidents: triage alerts, contain threats, coordinate recovery, and produce post-incident learnings.',
      bestFor: ['You stay calm under pressure', 'You like detective work and structured playbooks'],
      steps: [
        'Learn IR lifecycle (detect → triage → contain → eradicate → recover → learn)',
        'Learn logs and endpoint telemetry basics',
        'Practice tabletop exercises and write runbooks',
      ],
      skills: ['Triage', 'Log analysis', 'Endpoint basics', 'Communication', 'Runbooks'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Role-specific training varies; practice is key'],
      },
      projects: [
        'Create a sample incident runbook (phishing, credential theft, malware)',
        'Run a tabletop exercise and write an incident report with lessons learned',
      ],
      nextRoles: ['threat-hunter', 'security-engineer'],
    },
    {
      id: 'threat-hunter',
      title: 'Threat Hunter',
      icon: '🕵️',
      level: 'expert',
      overview:
        'Proactively searches for suspicious behavior in environments using telemetry, hypotheses, and adversary techniques.',
      bestFor: ['You like hypothesis-driven investigations', 'You enjoy patterns and detection engineering'],
      steps: [
        'Learn attacker techniques (MITRE ATT&CK basics)',
        'Learn how to query telemetry (SIEM queries) and build detections',
        'Practice developing hypotheses and validating findings',
      ],
      skills: ['Detection thinking', 'Log queries', 'Investigation', 'Adversary techniques', 'Reporting'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['SIEM/platform training as needed'],
      },
      projects: [
        'Write 5 detection hypotheses and document how you would test them',
        'Create a detection rule set for common suspicious behaviors',
      ],
      nextRoles: ['security-engineer'],
    },
    {
      id: 'forensics',
      title: 'Digital Forensics Analyst',
      icon: '🔎',
      level: 'intermediate',
      overview:
        'Collects and analyzes digital evidence after incidents: timelines, artifacts, root cause, and reporting suitable for stakeholders.',
      bestFor: ['You like careful evidence work', 'You enjoy deep technical investigations'],
      steps: [
        'Learn evidence handling and chain-of-custody concepts',
        'Learn common artifacts (logs, browser history, process trees, registry basics)',
        'Practice building timelines and writing clear findings reports',
      ],
      skills: ['Investigation', 'Artifacts knowledge', 'Reporting', 'Attention to detail'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Role-specific training as needed'],
      },
      projects: [
        'Create a mock incident timeline from sample logs',
        'Write a forensics-style report (what happened, evidence, confidence, next steps)',
      ],
      nextRoles: ['incident-response', 'threat-hunter'],
    },
    {
      id: 'analytics-engineer',
      title: 'Analytics Engineer',
      icon: '📐',
      level: 'intermediate',
      overview:
        'Bridges analytics and engineering: transforms raw data into clean, modeled datasets for BI using version control and testing practices.',
      bestFor: ['You like clean models and definitions', 'You enjoy reproducibility and data quality'],
      steps: [
        'Get strong at SQL and dimensional modeling basics',
        'Learn version control + CI for analytics code',
        'Add data quality tests and documentation for metrics',
      ],
      skills: ['SQL', 'Modeling', 'Testing mindset', 'Documentation', 'BI collaboration'],
      certs: {
        beginner: ['Not required'],
        next: ['Cloud data platform familiarity helps'],
      },
      projects: [
        'Create a modeled analytics dataset with documented metrics definitions',
        'Add simple tests to catch nulls, duplicates, and freshness issues',
      ],
      nextRoles: ['data-engineer', 'data-architect'],
    },
    {
      id: 'data-scientist',
      title: 'Data Scientist',
      icon: '🧠',
      level: 'intermediate',
      overview:
        'Uses statistics and modeling to answer questions and build predictive insights. Often collaborates closely with analysts and engineers.',
      bestFor: ['You like statistics and experimentation', 'You enjoy turning data into decisions'],
      steps: [
        'Build strong foundations in statistics + experimentation',
        'Learn Python for analysis (pandas, notebooks) and model evaluation basics',
        'Practice communicating results with clear assumptions and limitations',
      ],
      skills: ['Statistics', 'Python', 'Model evaluation', 'Communication', 'Experimentation'],
      certs: {
        beginner: ['Not required'],
        next: ['Domain-specific learning is often more valuable'],
      },
      projects: [
        'Create a notebook with a clear question → analysis → conclusion → limitations',
        'Build a simple predictive model and document evaluation and bias risks',
      ],
      nextRoles: ['ml-engineer', 'data-architect'],
    },
    {
      id: 'ml-engineer',
      title: 'Machine Learning Engineer',
      icon: '🤖',
      level: 'expert',
      overview:
        'Builds and ships ML systems: training pipelines, deployment, monitoring, and reliability. More engineering-heavy than pure modeling.',
      bestFor: ['You like productionizing models', 'You enjoy pipelines, deployment, and monitoring'],
      steps: [
        'Learn how models are trained and evaluated (baseline understanding)',
        'Learn deployment patterns and data pipelines',
        'Add monitoring (drift, performance, and reliability)',
      ],
      skills: ['Python', 'Pipelines', 'Deployment', 'Monitoring', 'Data basics'],
      certs: {
        beginner: ['Cloud fundamentals help'],
        next: ['Platform-specific ML certs (optional)'],
      },
      projects: [
        'Train a small model and deploy an API that serves predictions',
        'Add monitoring and retraining triggers (even basic) and document it',
      ],
      nextRoles: ['platform-engineer', 'sre'],
    },
    {
      id: 'product-engineer',
      title: 'Product Engineer',
      icon: '🧑‍💻',
      level: 'intermediate',
      overview:
        'Generalist engineer focused on delivering product features end-to-end (user experience + backend + quality). Strong collaboration with design/product.',
      bestFor: ['You like shipping features and iterating', 'You enjoy balancing UX, reliability, and delivery speed'],
      steps: [
        'Build strong fundamentals in your stack (frontend + backend basics)',
        'Learn product thinking: metrics, experiments, and user feedback loops',
        'Develop quality habits: tests, monitoring, and safe releases',
      ],
      skills: ['Full-stack basics', 'Communication', 'Testing', 'Delivery', 'Product thinking'],
      certs: {
        beginner: ['Not required'],
        next: ['Cloud fundamentals can help'],
      },
      projects: [
        'Ship a small app with auth + CRUD + deployment + monitoring',
        'Write a short product spec and implement it with iteration notes',
      ],
      nextRoles: ['tech-lead', 'fullstack-dev'],
    },
    {
      id: 'sdet',
      title: 'SDET (Software Development Engineer in Test)',
      icon: '🧪',
      level: 'intermediate',
      overview:
        'Engineering-focused QA role: builds test frameworks, tooling, and automation at scale; partners with teams to improve reliability.',
      bestFor: ['You like engineering and quality', 'You enjoy building tooling and improving developer workflows'],
      steps: [
        'Get solid at a programming language used in your org',
        'Learn automation frameworks and test architecture patterns',
        'Integrate testing into CI/CD and eliminate flaky tests',
      ],
      skills: ['Automation engineering', 'CI/CD', 'Framework design', 'Debugging', 'Communication'],
      certs: {
        beginner: ['Not required'],
        next: ['Cloud/CI familiarity helps'],
      },
      projects: [
        'Build a reusable test harness + reporting for a demo project',
        'Create a reliability scorecard and reduce flakiness over time',
      ],
      nextRoles: ['qa-automation', 'devops', 'engineering-lead'],
    },
    {
      id: 'tech-lead',
      title: 'Tech Lead',
      icon: '🧭',
      level: 'expert',
      overview:
        'Guides technical direction for a team: architecture decisions, delivery planning, mentoring, and cross-team coordination.',
      bestFor: ['You like mentoring and decision-making', 'You can balance delivery with engineering quality'],
      steps: [
        'Improve system design and code review skills',
        'Practice planning: breaking work down, estimating, risk management',
        'Strengthen communication: docs, alignment, stakeholder updates',
      ],
      skills: ['System design', 'Mentoring', 'Code review', 'Planning', 'Communication'],
      certs: {
        beginner: ['Not required'],
        next: ['Not required'],
      },
      projects: [
        'Write a design doc for a feature with tradeoffs and roll-out plan',
        'Mentor someone through a project and document the approach',
      ],
      nextRoles: ['engineering-lead'],
    },
    {
      id: 'engineering-lead',
      title: 'Engineering Lead',
      icon: '👥',
      level: 'expert',
      overview:
        'Leads a team (or multiple) with focus on people, delivery, and healthy engineering practices. Mix of leadership and technical oversight.',
      bestFor: ['You like coaching and building teams', 'You enjoy improving processes and delivery outcomes'],
      steps: [
        'Develop people leadership skills (coaching, feedback, hiring)',
        'Learn delivery management and prioritization',
        'Build strong engineering culture: quality, reliability, security basics',
      ],
      skills: ['Leadership', 'Delivery', 'Hiring/coaching', 'Communication', 'Operational excellence'],
      certs: {
        beginner: ['Not required'],
        next: ['Not required'],
      },
      projects: [
        'Create a simple team operating rhythm (planning, review, retro) and iterate on it',
        'Define engineering principles and use them to make tradeoffs',
      ],
      nextRoles: [],
    },
    {
      id: 'data-architect',
      title: 'Data Architect',
      icon: '🏛️',
      level: 'expert',
      overview:
        'Designs data platforms, governance, modeling standards, and long-term data strategy. Often shapes how teams define and use data.',
      bestFor: ['You like long-term design and standards', 'You can align technical models with business meaning'],
      steps: [
        'Deepen data modeling and platform knowledge (warehouses/lakes)',
        'Learn governance basics: lineage, definitions, access controls',
        'Practice writing standards for data quality and modeling',
      ],
      skills: ['Modeling', 'Architecture', 'Governance concepts', 'Communication', 'Platform knowledge'],
      certs: {
        beginner: ['Not required'],
        next: ['Platform-specific data certs (optional)'],
      },
      projects: [
        'Write a data modeling standard for a sample org (naming, SCD, metrics)',
        'Design a lake/warehouse architecture with access boundaries and lineage',
      ],
      nextRoles: [],
    },
    {
      id: 'noc-analyst',
      title: 'NOC Analyst (Network Operations Center)',
      icon: '📡',
      level: 'entry',
      overview:
        'Monitors network/service health, responds to alerts, and escalates incidents. Great entry into networking and operations.',
      bestFor: ['You like monitoring, alert triage, and structured troubleshooting', 'You want an ops entry point toward networking/SRE'],
      steps: [
        'Learn core networking (IP, DNS, DHCP) and common outage patterns',
        'Learn monitoring dashboards and alert triage (what is noise vs signal)',
        'Practice clear incident notes, escalation, and handoffs',
      ],
      skills: ['Networking basics', 'Monitoring', 'Incident communication', 'Troubleshooting'],
      certs: {
        beginner: ['CompTIA Network+'],
        next: ['CCNA (if you want to go deeper)'],
      },
      projects: [
        'Create a runbook for 5 common alerts (DNS issues, packet loss, CPU spikes)',
        'Set up a basic monitoring dashboard for a home lab service and document alerts',
      ],
      nextRoles: ['network-engineer', 'sre', 'devops'],
    },
    {
      id: 'network-engineer',
      title: 'Network Engineer',
      icon: '🧠🌐',
      level: 'intermediate',
      overview:
        'Designs and improves networks: routing/switching, Wi‑Fi, WAN, firewalls, and scalable troubleshooting across environments.',
      bestFor: ['You like designing systems and improving reliability', 'You enjoy deep troubleshooting and documentation'],
      steps: [
        'Deepen routing/switching and network design patterns',
        'Learn firewall policy basics and network segmentation principles',
        'Practice change management (maintenance windows, rollbacks) and documentation',
      ],
      skills: ['Routing/switching', 'Network design', 'Firewalls basics', 'Troubleshooting', 'Documentation'],
      certs: {
        beginner: ['CCNA'],
        next: ['CCNP (later, if needed)'],
      },
      projects: [
        'Create a segmented network design diagram (guest, prod, admin) with reasoning',
        'Write a change plan + rollback plan for a simulated network change',
      ],
      nextRoles: ['cloud-engineer', 'security-engineer', 'solutions-architect'],
    },
    {
      id: 'linux-admin',
      title: 'Linux Administrator',
      icon: '🐧',
      level: 'intermediate',
      overview:
        'Runs Linux systems: services, users/permissions, patching, troubleshooting, and automation. Common foundation for DevOps/SRE.',
      bestFor: ['You like working in terminals and automating tasks', 'You want a strong infra foundation'],
      steps: [
        'Learn Linux basics: filesystem, permissions, services, networking tools',
        'Learn logs, process management, and troubleshooting workflows',
        'Automate with Bash and basic configuration management concepts',
      ],
      skills: ['Linux', 'Networking basics', 'Shell scripting', 'Troubleshooting', 'Services'],
      certs: {
        beginner: ['Linux+ or Linux Essentials'],
        next: ['RHCSA (strong Linux admin path)'],
      },
      projects: [
        'Host a service (nginx) and document hardening + log locations',
        'Write scripts for user management and service health checks',
      ],
      nextRoles: ['devops', 'sre', 'platform-engineer'],
    },
    {
      id: 'windows-admin',
      title: 'Windows Administrator',
      icon: '🪟',
      level: 'intermediate',
      overview:
        'Manages Windows environments: Active Directory, GPOs, patching, endpoint/server hardening, and reliability.',
      bestFor: ['You like structured administration and enterprise tooling', 'You want an infra/security bridge'],
      steps: [
        'Learn AD, DNS basics in Windows environments, and group policy concepts',
        'Learn patching and endpoint management basics',
        'Automate with PowerShell and build repeatable runbooks',
      ],
      skills: ['Active Directory', 'Group Policy', 'PowerShell', 'Patching', 'Troubleshooting'],
      certs: {
        beginner: ['MS-900 / general Microsoft fundamentals'],
        next: ['AZ-104 (if moving into Azure)'],
      },
      projects: [
        'Create a PowerShell script that audits local admins + outputs a report',
        'Document a patching + rollback runbook',
      ],
      nextRoles: ['security-engineer', 'cloud-engineer', 'iam-engineer'],
    },
    {
      id: 'cloud-architect',
      title: 'Cloud Architect',
      icon: '🏛️☁️',
      level: 'expert',
      overview:
        'Designs cloud platforms end-to-end: landing zones, network topology, IAM, cost controls, reliability, and governance.',
      bestFor: ['You like architecture, standards, and long-term platform thinking', 'You can lead cross-team decisions'],
      steps: [
        'Master cloud networking + IAM + security guardrails',
        'Learn landing zone patterns (accounts/subscriptions, policies, logging)',
        'Practice architecture documentation and stakeholder alignment',
      ],
      skills: ['Cloud design', 'IAM', 'Networking', 'Governance', 'Cost optimization', 'Documentation'],
      certs: {
        beginner: ['Cloud associate cert (AWS SAA / AZ-104)'],
        next: ['Professional-level architect certs (optional)'],
      },
      projects: [
        'Design a landing zone blueprint (logging, IAM boundaries, network, guardrails)',
        'Create a cost and security checklist for new workloads',
      ],
      nextRoles: [],
    },
    {
      id: 'security-architect',
      title: 'Security Architect',
      icon: '🏰',
      level: 'expert',
      overview:
        'Defines secure architecture patterns, threat models, and security requirements across systems and teams. Balances risk with delivery.',
      bestFor: ['You like designing secure systems and setting standards', 'You can influence teams without blocking them'],
      steps: [
        'Deepen threat modeling and security architecture patterns',
        'Learn how to translate risk into practical requirements and controls',
        'Practice review processes (design reviews, secure defaults, guardrails)',
      ],
      skills: ['Threat modeling', 'Architecture', 'Security controls', 'Communication', 'Standards'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Advanced certs vary; experience matters most'],
      },
      projects: [
        'Write secure architecture patterns for auth, secrets, logging, and network boundaries',
        'Perform a threat model on a sample SaaS and publish mitigations',
      ],
      nextRoles: ['security-manager'],
    },
    {
      id: 'mobile-dev',
      title: 'Mobile Developer',
      icon: '📱',
      level: 'entry',
      overview:
        'Builds iOS/Android apps with strong UX, performance, and API integration. Can be native (Swift/Kotlin) or cross-platform (React Native/Flutter).',
      bestFor: ['You like building polished user experiences', 'You want to ship apps people use daily'],
      steps: [
        'Pick a path: Swift (iOS) or Kotlin (Android) or React Native/Flutter',
        'Learn state management, navigation, and API integration basics',
        'Learn performance basics and app debugging workflows',
      ],
      skills: ['Mobile UI', 'API integration', 'State management', 'Debugging', 'Performance basics'],
      certs: {
        beginner: ['Not required'],
        next: ['Not required'],
      },
      projects: [
        'Build an app with auth + offline caching + basic analytics (privacy-safe)',
        'Publish a small app or demo with screenshots and a README',
      ],
      nextRoles: ['frontend-dev', 'product-engineer'],
    },
    {
      id: 'ux-engineer',
      title: 'UX Engineer',
      icon: '🧑‍🎨',
      level: 'intermediate',
      overview:
        'Bridges design and engineering: builds accessible, consistent UI components and improves UX quality across the product.',
      bestFor: ['You like design systems and accessibility', 'You enjoy turning designs into polished, reusable UI'],
      steps: [
        'Learn accessibility (WCAG basics) and semantic HTML',
        'Learn design system thinking (tokens, components, patterns)',
        'Learn performance and UI testing basics',
      ],
      skills: ['Accessibility', 'Design systems', 'Frontend fundamentals', 'Communication', 'UI quality'],
      certs: {
        beginner: ['Not required'],
        next: ['Not required'],
      },
      projects: [
        'Build a small component library with accessibility notes',
        'Audit a site for accessibility issues and document fixes',
      ],
      nextRoles: ['frontend-dev', 'product-engineer'],
    },
    {
      id: 'purple-team',
      title: 'Purple Team Engineer',
      icon: '🟣',
      level: 'expert',
      overview:
        'Bridges red team (attack) and blue team (defense) by validating detections, improving response, and turning findings into guardrails.',
      bestFor: ['You like both offense and defense', 'You enjoy building practical improvements from real attack paths'],
      steps: [
        'Learn attacker techniques (MITRE ATT&CK) and defensive telemetry',
        'Practice detection validation and response improvements',
        'Build feedback loops: detections → incidents → lessons → hardening',
      ],
      skills: ['Adversary techniques', 'Detection engineering', 'Investigation', 'Communication', 'Automation'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Role-specific training as needed'],
      },
      projects: [
        'Pick 3 ATT&CK techniques and map detection + response steps',
        'Write a “detection gap” report and propose concrete improvements',
      ],
      nextRoles: ['security-engineer', 'threat-hunter'],
    },
    {
      id: 'vuln-management',
      title: 'Vulnerability Management Analyst',
      icon: '🩹',
      level: 'entry',
      overview:
        'Finds, prioritizes, and helps remediate vulnerabilities across systems and apps. A strong entry point into security with lots of cross-team collaboration.',
      bestFor: ['You like structured processes and prioritization', 'You want a security role that builds strong fundamentals'],
      steps: [
        'Learn common vulnerability types (OWASP Top 10, misconfigurations, exposed services)',
        'Learn scanning basics and how to validate findings (reduce false positives)',
        'Learn prioritization: severity vs exploitability vs business impact',
        'Practice remediation workflows and stakeholder communication',
      ],
      skills: ['Security fundamentals', 'Risk prioritization', 'Basic OS/networking', 'Communication', 'Ticketing/runbooks'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Role-specific training (scanner tools, cloud basics)'],
      },
      projects: [
        'Create a sample vuln triage board: severity, likelihood, owner, SLA, remediation notes',
        'Write a remediation playbook for 5 common findings (weak TLS, outdated packages, open ports, default creds, missing patches)',
      ],
      nextRoles: ['security-engineer', 'appsec', 'cloud-security'],
    },
    {
      id: 'siem-engineer',
      title: 'SIEM Engineer',
      icon: '📥',
      level: 'intermediate',
      overview:
        'Builds and maintains SIEM pipelines: log onboarding, parsing, normalization, alerts, dashboards, and data quality. Critical for a strong SOC.',
      bestFor: ['You like log pipelines and making noisy data useful', 'You want to scale security monitoring across an org'],
      steps: [
        'Learn logging fundamentals (sources, formats, time sync, retention)',
        'Practice onboarding new log sources and validating data quality',
        'Learn detection logic basics and dashboarding for investigations',
        'Automate onboarding and alert management where possible',
      ],
      skills: ['Log pipelines', 'Parsing/normalization', 'Monitoring', 'Basic scripting', 'Incident context'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Vendor-specific SIEM training (optional)'],
      },
      projects: [
        'Build a “log onboarding checklist” (fields, timestamps, volume, retention, PII review)',
        'Create 3 dashboards: auth activity, endpoint events, cloud audit events',
      ],
      nextRoles: ['detection-engineer', 'threat-hunter', 'security-engineer'],
    },
    {
      id: 'detection-engineer',
      title: 'Detection Engineer',
      icon: '🎯',
      level: 'expert',
      overview:
        'Designs high-signal detections and response playbooks, tuned to the environment and adversary techniques. Often partners tightly with IR and threat hunting.',
      bestFor: ['You like building scalable defenses', 'You enjoy balancing signal/noise and validating hypotheses'],
      steps: [
        'Master SIEM/telemetry sources and how attackers appear in logs',
        'Build detections mapped to MITRE ATT&CK with clear triage steps',
        'Validate detections (purple teaming) and reduce noise systematically',
        'Build automation for enrichment and response where safe',
      ],
      skills: ['Telemetry', 'Detection logic', 'MITRE ATT&CK', 'Investigation', 'Automation'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Role-specific training (SIEM + EDR + threat intel basics)'],
      },
      projects: [
        'Write 10 detections with: intent, data sources, logic, false positive notes, response steps',
        'Build a simple enrichment script that adds context (user, host, geo) to alerts',
      ],
      nextRoles: ['threat-hunter', 'security-architect', 'security-manager'],
    },
    {
      id: 'endpoint-engineer',
      title: 'Endpoint / EDR Engineer',
      icon: '💻🔒',
      level: 'intermediate',
      overview:
        'Builds and runs endpoint security and management: EDR, hardening baselines, patching strategy, device compliance, and response tooling.',
      bestFor: ['You like practical security controls and measurable impact', 'You want a strong bridge from IT → security'],
      steps: [
        'Learn endpoint hardening basics (least privilege, logging, patching, baselines)',
        'Learn how EDR works (telemetry, detections, response actions)',
        'Build rollout plans and safe change management processes',
        'Practice incident support: isolation, containment, and forensic preservation basics',
      ],
      skills: ['Windows/Linux basics', 'Patching', 'Hardening', 'EDR/endpoint tools', 'Change management'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Vendor training (endpoint/EDR) as needed'],
      },
      projects: [
        'Create a baseline checklist for endpoints (updates, logging, disk encryption, admin controls)',
        'Write a rollout plan + rollback plan for a security agent deployment',
      ],
      nextRoles: ['incident-response', 'security-engineer', 'siem-engineer'],
    },
    {
      id: 'kubernetes-engineer',
      title: 'Kubernetes Engineer',
      icon: '☸️',
      level: 'expert',
      overview:
        'Builds and operates Kubernetes clusters and the tooling around them: reliability, upgrades, security guardrails, and developer experiences.',
      bestFor: ['You like distributed systems and operations at scale', 'You want to work deep in platform infrastructure'],
      steps: [
        'Learn container fundamentals and Kubernetes core concepts (pods, services, ingress, deployments)',
        'Learn cluster operations (upgrades, capacity planning, networking, storage)',
        'Learn security baselines (RBAC, network policies, image scanning, secrets)',
        'Build repeatable automation and golden paths for teams',
      ],
      skills: ['Kubernetes', 'Linux', 'Networking', 'Automation', 'Reliability', 'Security basics'],
      certs: {
        beginner: ['Cloud fundamentals (optional)'],
        next: ['CKA / CKAD (optional, if it helps your path)'],
      },
      projects: [
        'Deploy a sample app with ingress + autoscaling + monitoring and document the runbook',
        'Create a cluster upgrade checklist (pre-checks, rollout, rollback, validation)',
      ],
      nextRoles: ['platform-engineer', 'sre', 'cloud-architect'],
    },
    {
      id: 'observability-engineer',
      title: 'Observability Engineer',
      icon: '📈🔭',
      level: 'intermediate',
      overview:
        'Builds logging/metrics/tracing platforms, dashboards, and alerting strategy so teams can understand and improve reliability quickly.',
      bestFor: ['You like turning chaos into clarity', 'You enjoy data + systems + incident response collaboration'],
      steps: [
        'Learn observability basics: metrics vs logs vs traces, SLOs/SLIs',
        'Build dashboards that match user experience and service health',
        'Learn alert quality: reduce noise, add context, and document runbooks',
        'Automate instrumentation defaults and safe rollouts',
      ],
      skills: ['Monitoring', 'Dashboards', 'Incident readiness', 'SLO thinking', 'Automation'],
      certs: {
        beginner: ['Not required'],
        next: ['Vendor training (optional)'],
      },
      projects: [
        'Create an SLO + alert policy for a sample service with a runbook',
        'Instrument a small app with logs + metrics + traces and document findings',
      ],
      nextRoles: ['sre', 'platform-engineer', 'devops'],
    },
    {
      id: 'it-project-manager',
      title: 'IT Project Manager',
      icon: '📅',
      level: 'intermediate',
      overview:
        'Plans and coordinates IT initiatives: timelines, scope, risks, stakeholders, and delivery. Strong path if you enjoy organization and communication.',
      bestFor: ['You like organizing work and unblocking teams', 'You want to lead delivery without coding full-time'],
      steps: [
        'Learn basic project planning: scope, milestones, risks, dependencies',
        'Practice stakeholder communication and status reporting',
        'Learn change management and rollout coordination',
        'Build lightweight documentation habits (notes, decisions, action items)',
      ],
      skills: ['Planning', 'Communication', 'Risk management', 'Documentation', 'Coordination'],
      certs: {
        beginner: ['CAPM (optional)'],
        next: ['PMP (later, experience-based)'],
      },
      projects: [
        'Write a project plan for a system migration: phases, risks, owners, rollback',
        'Create a stakeholder update template and a decision log template',
      ],
      nextRoles: ['technical-program-manager', 'engineering-lead'],
    },
    {
      id: 'technical-program-manager',
      title: 'Technical Program Manager (TPM)',
      icon: '🧩📦',
      level: 'expert',
      overview:
        'Leads complex technical initiatives spanning multiple teams. Focus on alignment, dependencies, risk, and delivery—deep technical context helps a lot.',
      bestFor: ['You can drive clarity across teams', 'You like hard coordination problems and long-term planning'],
      steps: [
        'Build strong system understanding (enough to ask the right questions)',
        'Learn how to manage dependencies and negotiate tradeoffs',
        'Create strong operating cadence: planning, tracking, escalation, retros',
        'Practice writing clear technical briefs and decision records',
      ],
      skills: ['Cross-team leadership', 'Systems thinking', 'Risk management', 'Communication', 'Execution'],
      certs: {
        beginner: ['Not required'],
        next: ['PMP (optional)'],
      },
      projects: [
        'Write a technical program brief for a platform migration (scope, risks, milestones)',
        'Create a dependency map and an escalation playbook for a multi-team rollout',
      ],
      nextRoles: ['engineering-lead', 'security-manager'],
    },
    {
      id: 'desktop-support',
      title: 'Desktop Support Technician',
      icon: '🖥️',
      level: 'entry',
      overview:
        'Hands-on IT support for laptops/desktops, OS installs, peripherals, account access, and common workplace tooling. Great “first IT job” role.',
      bestFor: ['You like hands-on troubleshooting', 'You want a clear first job target in IT'],
      steps: [
        'Learn Windows + basic macOS fundamentals (users, settings, networking basics)',
        'Practice hardware/peripheral troubleshooting (docks, monitors, printers)',
        'Learn ticketing, SLAs, and writing clear resolution notes',
        'Learn basic security hygiene (MFA, password resets, phishing reporting)',
      ],
      skills: ['Windows', 'Basic networking', 'Troubleshooting', 'Ticketing', 'Customer communication'],
      certs: {
        beginner: ['CompTIA A+ (common baseline)'],
        next: ['Network+ (if you like networking)', 'MS-900 (Microsoft 365 fundamentals)'],
      },
      projects: [
        'Create a “top 10 fixes” knowledge base doc (Wi‑Fi, printers, profile issues, etc.)',
        'Build a small home lab and document setup + troubleshooting steps',
      ],
      nextRoles: ['it-support', 'systems-admin', 'network-tech', 'soc-analyst'],
    },
    {
      id: 'field-tech',
      title: 'Field Service Technician',
      icon: '🧰🚗',
      level: 'entry',
      overview:
        'On-site troubleshooting and installations: endpoints, cabling basics, network gear swaps, and user support. Strong real-world operations foundation.',
      bestFor: ['You like moving around and fixing things on-site', 'You learn well by doing'],
      steps: [
        'Learn basic networking and cabling concepts (what plugs into what and why)',
        'Practice safe hardware handling and structured troubleshooting',
        'Learn documentation and inventory practices (asset tags, configs)',
      ],
      skills: ['Troubleshooting', 'Basic networking', 'Documentation', 'Hardware basics', 'Customer communication'],
      certs: {
        beginner: ['CompTIA A+'],
        next: ['Network+'],
      },
      projects: [
        'Create a “site visit checklist” template: symptoms, checks, actions, outcome',
        'Document a basic wiring/network layout diagram for a sample office/home lab',
      ],
      nextRoles: ['network-tech', 'desktop-support', 'noc-analyst'],
    },
    {
      id: 'it-ops-coordinator',
      title: 'IT Operations Coordinator',
      icon: '🗂️',
      level: 'entry',
      overview:
        'Coordinates IT work: onboarding/offboarding, tickets, asset tracking, vendor coordination, and keeping operations organized. Great for process-minded beginners.',
      bestFor: ['You like organization and clear processes', 'You want an IT-adjacent entry role with growth options'],
      steps: [
        'Learn onboarding/offboarding basics and access hygiene',
        'Learn asset inventory and lifecycle tracking basics',
        'Practice writing clear, consistent documentation and checklists',
      ],
      skills: ['Process thinking', 'Documentation', 'Communication', 'Ticketing', 'Basic IT concepts'],
      certs: {
        beginner: ['ITIL 4 Foundation (optional but useful)'],
        next: ['MS-900 (Microsoft 365 fundamentals)'],
      },
      projects: [
        'Create a full onboarding checklist (accounts, devices, MFA, access reviews)',
        'Create an offboarding checklist focused on access removal + evidence',
      ],
      nextRoles: ['it-support', 'servicenow-admin', 'compliance-analyst', 'grc'],
    },
    {
      id: 'm365-admin',
      title: 'Microsoft 365 Administrator',
      icon: '📧',
      level: 'intermediate',
      overview:
        'Runs Microsoft 365 services (identity basics, mail, collaboration) with security-minded configurations and lifecycle management.',
      bestFor: ['You like enterprise tooling and administration', 'You want a path toward IAM/security/cloud'],
      steps: [
        'Learn core M365 services (Exchange/Teams/SharePoint basics) at an admin level',
        'Learn identity + access patterns (MFA, conditional access concepts)',
        'Practice configuration change management and documenting decisions',
      ],
      skills: ['Admin tooling', 'Identity basics', 'Security hygiene', 'Troubleshooting', 'Documentation'],
      certs: {
        beginner: ['MS-900'],
        next: ['Role-based Microsoft certs (optional)'],
      },
      projects: [
        'Write a policy checklist for MFA + least privilege + audit logging',
        'Create a user lifecycle runbook: create, license, access, offboard',
      ],
      nextRoles: ['iam-engineer', 'security-engineer', 'windows-admin'],
    },
    {
      id: 'servicenow-admin',
      title: 'ServiceNow Administrator',
      icon: '🧾⚙️',
      level: 'intermediate',
      overview:
        'Maintains IT service management workflows: request catalogs, approvals, incident/problem processes, and reporting dashboards.',
      bestFor: ['You like workflows, automation, and clean processes', 'You want to improve how IT work gets done'],
      steps: [
        'Learn incident/problem/request fundamentals and how teams use them',
        'Practice building forms, workflows, approvals, and notifications',
        'Learn reporting and metrics that actually matter (SLA, resolution time)',
      ],
      skills: ['ITSM', 'Workflow thinking', 'Automation basics', 'Reporting', 'Communication'],
      certs: {
        beginner: ['Not required'],
        next: ['Vendor training (optional)'],
      },
      projects: [
        'Build a sample request workflow: new laptop request → approvals → fulfillment',
        'Create an incident dashboard with SLA tracking and trends',
      ],
      nextRoles: ['it-project-manager', 'engineering-lead'],
    },
    {
      id: 'virtualization-engineer',
      title: 'Virtualization Engineer',
      icon: '🧊',
      level: 'intermediate',
      overview:
        'Runs virtualization platforms and core infrastructure capacity. Focus on reliability, performance, and operational excellence.',
      bestFor: ['You like infrastructure and capacity planning', 'You want a strong base for cloud/platform roles'],
      steps: [
        'Learn virtualization basics: hosts, storage, networking, resource allocation',
        'Practice monitoring performance and resolving bottlenecks',
        'Learn backup/recovery concepts and change management',
      ],
      skills: ['Infrastructure fundamentals', 'Monitoring', 'Capacity planning', 'Troubleshooting', 'Documentation'],
      certs: {
        beginner: ['Not required'],
        next: ['Vendor training (optional)'],
      },
      projects: [
        'Document a capacity plan for a sample workload (CPU/memory/storage assumptions)',
        'Write a change plan + rollback plan for a virtualization upgrade',
      ],
      nextRoles: ['cloud-engineer', 'platform-engineer', 'sre'],
    },
    {
      id: 'backup-recovery',
      title: 'Backup & Recovery Engineer',
      icon: '💾',
      level: 'intermediate',
      overview:
        'Owns backup strategies, restore testing, retention, and recovery runbooks. High trust role that directly impacts business continuity.',
      bestFor: ['You like reliability and disaster recovery planning', 'You want a role with clear operational impact'],
      steps: [
        'Learn backup concepts: RPO/RTO, retention, restore verification',
        'Practice building runbooks and testing restores regularly',
        'Learn least-privilege access for backup systems and immutable storage concepts',
      ],
      skills: ['Backups', 'Runbooks', 'Reliability thinking', 'Security hygiene', 'Documentation'],
      certs: {
        beginner: ['Not required'],
        next: ['Role-specific training (optional)'],
      },
      projects: [
        'Create a DR plan for a sample service: RPO/RTO, steps, validation, owners',
        'Run a restore test and document lessons learned',
      ],
      nextRoles: ['systems-admin', 'sre', 'security-engineer'],
    },
    {
      id: 'storage-engineer',
      title: 'Storage Engineer',
      icon: '🗄️⚙️',
      level: 'intermediate',
      overview:
        'Designs and operates storage platforms with performance, durability, and recovery in mind. Often partners with DBA/infra teams.',
      bestFor: ['You like deep reliability/performance work', 'You enjoy infrastructure fundamentals'],
      steps: [
        'Learn storage fundamentals: latency, throughput, IOPS, redundancy',
        'Practice diagnosing storage bottlenecks and capacity planning',
        'Learn backup/restore patterns and access controls',
      ],
      skills: ['Storage concepts', 'Performance troubleshooting', 'Capacity planning', 'Reliability'],
      certs: {
        beginner: ['Not required'],
        next: ['Vendor training (optional)'],
      },
      projects: [
        'Write a storage selection guide: performance vs cost vs durability tradeoffs',
        'Create a capacity plan with a growth forecast and alert thresholds',
      ],
      nextRoles: ['database-admin', 'cloud-architect', 'platform-engineer'],
    },
    {
      id: 'cloud-ops',
      title: 'Cloud Operations Engineer',
      icon: '☁️🛠️',
      level: 'intermediate',
      overview:
        'Keeps cloud systems healthy: monitoring, incident response, cost hygiene, and operational improvements across cloud services.',
      bestFor: ['You like operations and reliability', 'You want to grow into SRE/DevOps/cloud engineering'],
      steps: [
        'Learn core cloud services and how failures show up (logs/metrics)',
        'Practice incident response and post-incident improvements',
        'Learn basic automation and infrastructure-as-code concepts',
      ],
      skills: ['Cloud fundamentals', 'Monitoring', 'Incident response', 'Automation basics', 'Cost awareness'],
      certs: {
        beginner: ['Cloud fundamentals cert (optional)'],
        next: ['Associate-level cloud certs (optional)'],
      },
      projects: [
        'Create a cloud incident runbook with dashboards and escalation steps',
        'Write a cost hygiene checklist (unused resources, tagging, budgets)',
      ],
      nextRoles: ['cloud-engineer', 'sre', 'devops'],
    },
    {
      id: 'finops',
      title: 'FinOps Analyst (Cloud Cost)',
      icon: '💸',
      level: 'intermediate',
      overview:
        'Focuses on cloud cost visibility and optimization: budgets, tagging, unit economics, and partnering with engineering to reduce spend safely.',
      bestFor: ['You like numbers and systems tradeoffs', 'You want business impact without pure coding'],
      steps: [
        'Learn cloud billing concepts and cost allocation (tags/labels)',
        'Learn cost optimization levers (rightsizing, storage tiers, reservations)',
        'Practice building simple dashboards and communicating savings tradeoffs',
      ],
      skills: ['Cloud billing basics', 'Analysis', 'Communication', 'Dashboards', 'Pragmatic decision-making'],
      certs: {
        beginner: ['Not required'],
        next: ['Cloud fundamentals (helpful)'],
      },
      projects: [
        'Create a tagging standard and a “cost anomaly” checklist',
        'Write a sample optimization proposal with risks/rollbacks and expected savings',
      ],
      nextRoles: ['cloud-architect', 'solutions-architect'],
    },
    {
      id: 'release-engineer',
      title: 'Release Engineer',
      icon: '🚀',
      level: 'intermediate',
      overview:
        'Owns safe delivery: release pipelines, rollout strategies, change control, and reducing deployment risk. Often sits between DevOps and product teams.',
      bestFor: ['You like reliability and reducing chaos', 'You enjoy improving delivery processes'],
      steps: [
        'Learn CI/CD fundamentals and common release patterns',
        'Practice safe rollouts (canary, blue/green) and rollback planning',
        'Build release checklists and automate repetitive verification',
      ],
      skills: ['CI/CD', 'Change management', 'Automation', 'Communication', 'Reliability mindset'],
      certs: {
        beginner: ['Not required'],
        next: ['Cloud/DevOps certs (optional)'],
      },
      projects: [
        'Design a release checklist: prechecks, rollout, rollback, validation',
        'Build a sample pipeline with a staged rollout plan and monitoring gate',
      ],
      nextRoles: ['devops', 'sre', 'platform-engineer'],
    },
    {
      id: 'build-engineer',
      title: 'Build / CI Engineer',
      icon: '🏗️',
      level: 'intermediate',
      overview:
        'Specializes in build systems and CI: faster pipelines, stable builds, caching, test infrastructure, and developer productivity improvements.',
      bestFor: ['You like tooling and performance improvements', 'You want a deep engineering impact across teams'],
      steps: [
        'Learn CI fundamentals and how builds/tests run',
        'Improve pipeline performance (caching, parallelization, flaky test reduction)',
        'Build dashboards/alerts for pipeline health and reliability',
      ],
      skills: ['CI systems', 'Scripting', 'Debugging', 'Tooling', 'Reliability'],
      certs: {
        beginner: ['Not required'],
        next: ['Not required'],
      },
      projects: [
        'Create a “flaky test” triage process and document root causes',
        'Design a caching strategy for builds and measure improvements',
      ],
      nextRoles: ['platform-engineer', 'sre', 'tech-lead'],
    },
    {
      id: 'security-awareness',
      title: 'Security Awareness & Training Specialist',
      icon: '🎓🔒',
      level: 'entry',
      overview:
        'Improves human security: phishing resilience, policy training, and practical habits. Strong entry point into security for communication-focused people.',
      bestFor: ['You like teaching and communication', 'You want to enter security without deep engineering at first'],
      steps: [
        'Learn common threats (phishing, social engineering, credential stuffing)',
        'Learn how to write short, clear security guidance that people follow',
        'Practice measuring impact (reporting rates, incidents, completion)',
      ],
      skills: ['Communication', 'Security basics', 'Training design', 'Empathy', 'Reporting/metrics'],
      certs: {
        beginner: ['Security+ (nice foundation)'],
        next: ['Role-specific training (optional)'],
      },
      projects: [
        'Write 5 short “security habit” guides (MFA, passwords, reporting phishing, device updates, safe sharing)',
        'Design a simple awareness program: topics, cadence, metrics',
      ],
      nextRoles: ['grc', 'compliance-analyst', 'security-engineer'],
    },
    {
      id: 'threat-intel',
      title: 'Threat Intelligence Analyst',
      icon: '🗞️🕵️',
      level: 'intermediate',
      overview:
        'Turns external and internal intel into actionable guidance: prioritizing threats, tracking campaigns, and informing detection and response.',
      bestFor: ['You like research + analysis + writing', 'You enjoy connecting dots and advising teams'],
      steps: [
        'Learn attacker motives, common techniques, and reporting formats',
        'Practice turning intel into actions (detections, hardening, awareness)',
        'Learn basic IR workflow so intel fits response needs',
      ],
      skills: ['Research', 'Writing', 'Security fundamentals', 'Analysis', 'Stakeholder communication'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Role-specific training (optional)'],
      },
      projects: [
        'Write an “intel-to-action” report: threat, impact, recommended detections/mitigations',
        'Create a weekly digest format with prioritized actions for security teams',
      ],
      nextRoles: ['threat-hunter', 'detection-engineer', 'security-architect'],
    },
    {
      id: 'malware-analyst',
      title: 'Malware Analyst',
      icon: '🦠',
      level: 'expert',
      overview:
        'Analyzes malware behavior to support detection, containment, and incident response. Highly technical role that requires patience and rigor.',
      bestFor: ['You enjoy deep technical investigation', 'You like reverse-engineering style problem solving'],
      steps: [
        'Master incident response workflows and evidence handling basics',
        'Learn how malware executes and persists (high-level first)',
        'Practice safe analysis approaches (sandboxing, behavior analysis)',
      ],
      skills: ['Investigation', 'Security fundamentals', 'Systems understanding', 'Careful documentation', 'Analytical rigor'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Role-specific training (optional)'],
      },
      projects: [
        'Write a malware analysis report template (behavior, IOCs, mitigations, detections)',
        'Map a sample incident timeline from artifacts and document conclusions',
      ],
      nextRoles: ['forensics', 'incident-response', 'threat-hunter'],
    },
    {
      id: 'privacy-analyst',
      title: 'Privacy Analyst',
      icon: '🕊️',
      level: 'intermediate',
      overview:
        'Supports privacy programs: data mapping, DPIAs/assessments, retention, and helping teams build privacy-minded processes.',
      bestFor: ['You like policy + process + practical risk thinking', 'You want a security-adjacent role with high business relevance'],
      steps: [
        'Learn data lifecycle concepts (collection → use → sharing → retention → deletion)',
        'Practice identifying personal data and minimizing it where possible',
        'Learn how to write clear requirements for teams (retention, access, logging hygiene)',
      ],
      skills: ['Data lifecycle thinking', 'Documentation', 'Risk assessment', 'Communication', 'Process design'],
      certs: {
        beginner: ['Not required'],
        next: ['Role-specific privacy training (optional)'],
      },
      projects: [
        'Create a simple “data inventory” template and fill it for a sample app',
        'Write a retention policy proposal: what, why, how long, and deletion process',
      ],
      nextRoles: ['compliance-analyst', 'grc', 'security-manager'],
    },
    {
      id: 'bi-developer',
      title: 'BI Developer (Dashboards)',
      icon: '📈',
      level: 'intermediate',
      overview:
        'Builds dashboards and reporting layers that decision-makers trust. Focus on clean metrics definitions, data quality, and performance.',
      bestFor: ['You like data storytelling and clarity', 'You want a strong analytics career path'],
      steps: [
        'Learn SQL well (joins, window functions, performance basics)',
        'Learn metric definitions and how to avoid “two sources of truth”',
        'Build dashboards with performance and usability in mind',
      ],
      skills: ['SQL', 'Data modeling basics', 'Dashboard design', 'Data quality thinking', 'Stakeholder communication'],
      certs: {
        beginner: ['Not required'],
        next: ['Tool-specific certs (optional)'],
      },
      projects: [
        'Build a KPI dashboard with a metric dictionary and assumptions',
        'Create a data quality checklist for the dashboard’s source tables',
      ],
      nextRoles: ['analytics-engineer', 'data-engineer', 'data-architect'],
    },
    {
      id: 'data-governance',
      title: 'Data Governance Analyst',
      icon: '🏷️',
      level: 'intermediate',
      overview:
        'Builds the rules and practices that make data reliable: definitions, ownership, access, retention, and quality expectations.',
      bestFor: ['You like structure, clarity, and cross-team alignment', 'You want high business impact around data correctness'],
      steps: [
        'Learn how teams define and use data (metrics, sources, ownership)',
        'Practice creating a metric dictionary and data ownership model',
        'Learn privacy-minded governance basics (classification, retention)',
      ],
      skills: ['Process design', 'Documentation', 'Data literacy', 'Stakeholder alignment', 'Risk thinking'],
      certs: {
        beginner: ['Not required'],
        next: ['Not required'],
      },
      projects: [
        'Create a data catalog template: dataset, owner, definition, retention, access rules',
        'Write a “single source of truth” proposal for 5 core business metrics',
      ],
      nextRoles: ['data-architect', 'privacy-analyst'],
    },
    {
      id: 'database-engineer',
      title: 'Database Engineer',
      icon: '🧱🗄️',
      level: 'intermediate',
      overview:
        'Builds database performance and reliability improvements with an engineering mindset: schema design, query tuning, migrations, and automation.',
      bestFor: ['You like performance and data correctness', 'You enjoy working close to critical systems'],
      steps: [
        'Learn schema design and indexing fundamentals',
        'Practice query tuning and understanding execution plans (at a basic level)',
        'Learn migrations and safe rollout strategies',
      ],
      skills: ['SQL', 'Data modeling', 'Performance tuning basics', 'Reliability thinking', 'Automation basics'],
      certs: {
        beginner: ['Not required'],
        next: ['Not required'],
      },
      projects: [
        'Design a schema for a sample app and justify indexing choices',
        'Write a migration plan with rollback and data validation checks',
      ],
      nextRoles: ['data-engineer', 'data-architect', 'solutions-architect'],
    },
    {
      id: 'enterprise-architect',
      title: 'Enterprise Architect',
      icon: '🏛️🧭',
      level: 'expert',
      overview:
        'Sets organization-wide architecture direction: standards, target state, system boundaries, and long-term modernization strategy.',
      bestFor: ['You can operate at high level + details when needed', 'You like building standards that make teams faster'],
      steps: [
        'Build deep understanding of business domains and system landscapes',
        'Define standards and principles (security, reliability, data governance)',
        'Practice influencing without direct authority through clear tradeoffs',
      ],
      skills: ['Architecture', 'Communication', 'Systems thinking', 'Governance', 'Strategic planning'],
      certs: {
        beginner: ['Not required'],
        next: ['Not required'],
      },
      projects: [
        'Write an architecture principles document (10 principles + examples)',
        'Create a target-state diagram and a phased modernization plan',
      ],
      nextRoles: [],
    },

    {
      id: 'it-asset-manager',
      title: 'IT Asset Manager (Hardware/Software)',
      icon: '🏷️💻',
      level: 'intermediate',
      overview:
        'Owns the lifecycle of devices and software: inventory, procurement coordination, renewals, audits, and operational hygiene. Strong blend of process + tooling.',
      bestFor: ['You like organization and accountability', 'You want a practical IT operations career path'],
      steps: [
        'Learn asset lifecycle basics: request → procure → deploy → maintain → retire',
        'Learn inventory tooling and data hygiene (naming, owners, locations, warranties)',
        'Learn license management basics and audit readiness',
        'Build lightweight automation and reporting (imports, reconciliations, reminders)',
      ],
      skills: ['Asset lifecycle', 'Reporting', 'Process design', 'Vendor coordination', 'Documentation'],
      certs: {
        beginner: ['ITIL 4 Foundation (optional)'],
        next: ['Vendor-specific tooling training (optional)'],
      },
      projects: [
        'Create an asset inventory template with required fields and validation rules',
        'Write a lifecycle runbook: onboarding device → patch cadence → secure wipe → disposal evidence',
      ],
      nextRoles: ['it-ops-coordinator', 'servicenow-admin', 'it-project-manager'],
    },

    {
      id: 'endpoint-management',
      title: 'Endpoint Management / MDM Engineer (Intune/Jamf)',
      icon: '📱🧩',
      level: 'intermediate',
      overview:
        'Manages fleet configuration and compliance: device enrollment, policy baselines, app deployment, updates, and security posture across Windows/macOS/mobile.',
      bestFor: ['You like making policies work at scale', 'You want a strong bridge from IT → security'],
      steps: [
        'Learn device identity basics, enrollment flows, and compliance policies',
        'Build configuration baselines (updates, disk encryption, local admin controls)',
        'Learn safe rollouts: rings, canaries, phased deployments, rollback',
        'Practice troubleshooting: policy conflicts, enrollment failures, app install failures',
      ],
      skills: ['Endpoint policy', 'Change management', 'Troubleshooting', 'Security hygiene', 'Documentation'],
      certs: {
        beginner: ['MS-900 (Microsoft fundamentals)'],
        next: ['Role-specific vendor training (Intune/Jamf) (optional)'],
      },
      projects: [
        'Design a baseline profile set (security + usability) and document exceptions',
        'Create a rollout plan with pilot group → phased rollout → validation checklist',
      ],
      nextRoles: ['endpoint-engineer', 'security-engineer', 'windows-admin'],
    },

    {
      id: 'sharepoint-admin',
      title: 'SharePoint / Collaboration Administrator',
      icon: '🗂️🔗',
      level: 'intermediate',
      overview:
        'Runs collaboration platforms (SharePoint/Teams/Drive-style tooling): permissions, site structure, lifecycle policies, and secure sharing guardrails.',
      bestFor: ['You like information organization and governance', 'You want an identity/security-adjacent admin role'],
      steps: [
        'Learn permission models and safe sharing patterns (least privilege, external sharing controls)',
        'Learn site lifecycle: creation standards, naming, ownership, retention, archiving',
        'Practice incident-style troubleshooting: access issues, sync issues, sharing failures',
        'Document clear governance rules that people can follow',
      ],
      skills: ['Permissions', 'Governance', 'Troubleshooting', 'Documentation', 'Stakeholder communication'],
      certs: {
        beginner: ['MS-900 (optional)'],
        next: ['Role-specific vendor training (optional)'],
      },
      projects: [
        'Create a “secure sharing” policy checklist with examples',
        'Build a site request + approval workflow outline with ownership rules',
      ],
      nextRoles: ['m365-admin', 'iam-engineer', 'privacy-analyst'],
    },

    {
      id: 'unified-comms-engineer',
      title: 'Unified Communications / VoIP Engineer',
      icon: '📞',
      level: 'intermediate',
      overview:
        'Builds and runs voice/video collaboration systems: call routing, quality troubleshooting, network dependencies, and reliable conferencing.',
      bestFor: ['You like hands-on troubleshooting + networking', 'You want a specialized infrastructure path'],
      steps: [
        'Learn basic voice concepts (SIP/RTP at a high level, QoS concepts)',
        'Learn how network conditions impact voice (latency, jitter, packet loss)',
        'Practice diagnosing call quality issues and documenting root causes',
        'Build change management habits for routing, dial plans, and rollouts',
      ],
      skills: ['Troubleshooting', 'Networking fundamentals', 'Change management', 'Documentation', 'Stakeholder support'],
      certs: {
        beginner: ['Network+ (helpful baseline)'],
        next: ['Vendor UC training (optional)'],
      },
      projects: [
        'Write a call-quality troubleshooting runbook (symptom → checks → fix → verify)',
        'Create a simple dependency map: DNS, firewall rules, WAN links, endpoints',
      ],
      nextRoles: ['network-engineer', 'cloud-engineer', 'it-project-manager'],
    },

    {
      id: 'wireless-network-engineer',
      title: 'Wireless Network Engineer',
      icon: '📶',
      level: 'intermediate',
      overview:
        'Designs and troubleshoots Wi‑Fi networks: coverage, roaming, security, and performance. Strong blend of planning + real-world troubleshooting.',
      bestFor: ['You like diagnosing “it works sometimes” problems', 'You enjoy planning and measurement'],
      steps: [
        'Learn Wi‑Fi basics (bands, channels, interference, roaming concepts)',
        'Practice site survey thinking and troubleshooting methodology',
        'Learn WLAN security basics (WPA2/WPA3, guest segmentation, auth patterns)',
        'Document standards and rollout playbooks for sites',
      ],
      skills: ['Wireless design basics', 'Troubleshooting', 'Documentation', 'Security basics', 'Change management'],
      certs: {
        beginner: ['Network+ (helpful)'],
        next: ['Vendor wireless training (optional)'],
      },
      projects: [
        'Create a simple Wi‑Fi coverage plan and document assumptions/tradeoffs',
        'Write a troubleshooting runbook for roaming + interference symptoms',
      ],
      nextRoles: ['network-engineer', 'security-engineer', 'cloud-network-engineer'],
    },

    {
      id: 'network-automation',
      title: 'Network Automation / NetDevOps Engineer',
      icon: '🤖🌐',
      level: 'intermediate',
      overview:
        'Automates network configuration and operations using code: templates, validation, CI checks, and safer change rollout. Great bridge from networking → software/devops.',
      bestFor: ['You like networking but want more coding/automation', 'You want safer, repeatable changes at scale'],
      steps: [
        'Learn basic scripting (Python) and data formats (JSON/YAML)',
        'Learn network automation concepts: idempotency, templates, config validation',
        'Practice safe change workflows: pre-checks, diff, staged rollout, rollback',
        'Build documentation habits: intent, assumptions, and verification steps',
      ],
      skills: ['Python basics', 'Networking fundamentals', 'Automation mindset', 'Change management', 'Documentation'],
      certs: {
        beginner: ['Not required'],
        next: ['Vendor automation training (optional)'],
      },
      projects: [
        'Write a script that validates configs (lint rules) before change approval',
        'Create a “change pipeline” checklist: prechecks → rollout → verification → postchecks',
      ],
      nextRoles: ['devops', 'platform-engineer', 'network-engineer'],
    },

    {
      id: 'cloud-network-engineer',
      title: 'Cloud Network Engineer',
      icon: '🌩️🌐',
      level: 'intermediate',
      overview:
        'Owns cloud networking: VPC/VNet design, routing, private connectivity, firewalling, DNS, and segmentation. Critical for secure, reliable cloud platforms.',
      bestFor: ['You like networking + architecture', 'You care about secure boundaries and connectivity'],
      steps: [
        'Learn cloud network primitives: subnets, route tables, gateways, private endpoints',
        'Learn segmentation patterns and how to design least-privilege connectivity',
        'Practice diagnosing connectivity issues with logs/flow telemetry',
        'Write repeatable reference architectures and runbooks',
      ],
      skills: ['Cloud networking', 'Routing', 'Segmentation', 'Troubleshooting', 'Documentation'],
      certs: {
        beginner: ['Cloud fundamentals (AZ-900/AWS CCP)'],
        next: ['Associate cloud cert (AZ-104/AWS SAA) (optional)'],
      },
      projects: [
        'Design a hub-and-spoke network with private connectivity and justify tradeoffs',
        'Create a connectivity troubleshooting runbook using flow logs + DNS checks',
      ],
      nextRoles: ['cloud-engineer', 'cloud-security', 'cloud-architect'],
    },

    {
      id: 'cloud-database-engineer',
      title: 'Cloud Database Engineer',
      icon: '☁️🗄️',
      level: 'intermediate',
      overview:
        'Specializes in managed database services in the cloud: reliability, scaling, backups, security controls, and performance tuning.',
      bestFor: ['You like reliability and performance', 'You want a cloud-focused DBA/DB engineering path'],
      steps: [
        'Learn one managed DB service well (Postgres/MySQL/SQL Server, plus managed features)',
        'Master backups, restore tests, replication basics, and maintenance windows',
        'Learn access controls, encryption, and safe secret handling patterns',
        'Practice performance tuning with measurable before/after changes',
      ],
      skills: ['SQL', 'Backups/restore', 'Cloud reliability', 'Security hygiene', 'Performance tuning basics'],
      certs: {
        beginner: ['Cloud fundamentals (optional)'],
        next: ['Platform-specific database training (optional)'],
      },
      projects: [
        'Create a backup/restore drill plan and run it monthly (document outcomes)',
        'Write a migration plan: schema change + rollback + data validation steps',
      ],
      nextRoles: ['database-engineer', 'cloud-architect', 'solutions-architect'],
    },

    {
      id: 'cloud-governance',
      title: 'Cloud Governance / Landing Zone Engineer',
      icon: '🧭☁️',
      level: 'intermediate',
      overview:
        'Builds cloud guardrails: account/subscription structure, policies, logging, baseline security, and standardized environments. Enables teams to move fast safely.',
      bestFor: ['You like standards and repeatable platforms', 'You want high leverage across many teams'],
      steps: [
        'Learn landing zone patterns: environments, identity boundaries, baseline logging',
        'Learn policy-as-code concepts and guardrails (deny risky configs; allow safe defaults)',
        'Practice building templates and reference architectures teams can reuse',
        'Define operational processes: access requests, exceptions, evidence, reviews',
      ],
      skills: ['Governance', 'Cloud fundamentals', 'Policy thinking', 'Documentation', 'Stakeholder alignment'],
      certs: {
        beginner: ['Cloud fundamentals (AZ-900/AWS CCP)'],
        next: ['Associate cloud cert (optional)'],
      },
      projects: [
        'Write a landing zone checklist: logging, IAM boundaries, network, tagging, budgets',
        'Create a policy set proposal with: intent, example violations, and exception process',
      ],
      nextRoles: ['cloud-architect', 'security-engineer', 'solutions-architect'],
    },

    {
      id: 'release-manager',
      title: 'Release Manager',
      icon: '🧷🚀',
      level: 'intermediate',
      overview:
        'Coordinates releases across teams: schedules, readiness checks, risk management, communications, and post-release follow-ups. Strong fit for process + delivery thinkers.',
      bestFor: ['You like coordination and risk reduction', 'You want to improve delivery reliability without being a full-time engineer'],
      steps: [
        'Learn release workflows: readiness criteria, freeze windows, rollback plans',
        'Build clear communication templates (go/no-go, status, stakeholder updates)',
        'Practice incident-aware thinking (what could go wrong; how do we recover?)',
        'Automate where possible: checklists, dashboards, and change records',
      ],
      skills: ['Communication', 'Risk management', 'Process design', 'Coordination', 'Documentation'],
      certs: {
        beginner: ['Not required'],
        next: ['ITIL 4 Foundation (optional)'],
      },
      projects: [
        'Create a release readiness checklist with owners and measurable gates',
        'Write a “release retro” template and run it after a simulated release',
      ],
      nextRoles: ['it-project-manager', 'technical-program-manager', 'engineering-lead'],
    },

    {
      id: 'security-operations-engineer',
      title: 'Security Operations Engineer (SecOps)',
      icon: '🛠️🛡️',
      level: 'intermediate',
      overview:
        'Runs and improves day-to-day security operations: tooling health, alert pipelines, response workflows, and reducing operational friction for the SOC/IR teams.',
      bestFor: ['You like reliability and practical improvements', 'You want a hands-on security + operations role'],
      steps: [
        'Learn your org’s telemetry sources and alert pipeline (from logs to alerts)',
        'Practice operational hygiene: runbooks, on-call readiness, and dashboard health',
        'Automate repetitive tasks (enrichment, ticketing, notifications) carefully',
        'Measure and reduce noise: false positives, missing context, poor alerts',
      ],
      skills: ['Operations mindset', 'Automation basics', 'Runbooks', 'Monitoring', 'Communication'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['SIEM/EDR platform training (optional)'],
      },
      projects: [
        'Create an alert quality scorecard (signal, context, response steps) and improve 10 alerts',
        'Build a safe enrichment script (adds context only) and document safeguards',
      ],
      nextRoles: ['siem-engineer', 'incident-response', 'detection-engineer'],
    },

    {
      id: 'iam-governance',
      title: 'IAM Governance / IGA Engineer',
      icon: '🪪📋',
      level: 'intermediate',
      overview:
        'Focuses on identity governance: access reviews, joiner/mover/leaver workflows, approvals, role mining, and ensuring access is justified and auditable.',
      bestFor: ['You like reducing risk with structured processes', 'You want a high-impact security role with strong cross-team touch points'],
      steps: [
        'Learn how access is granted today and where it becomes risky or inconsistent',
        'Build joiner/mover/leaver workflows with clear ownership and evidence',
        'Practice access reviews that are actionable (not checkbox compliance)',
        'Automate access evidence collection and lifecycle reporting where possible',
      ],
      skills: ['IAM basics', 'Governance thinking', 'Process design', 'Automation basics', 'Communication'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Cloud IAM training (optional)'],
      },
      projects: [
        'Create an access review template with decision guidance and audit notes',
        'Write a joiner/mover/leaver runbook with evidence requirements and rollback steps',
      ],
      nextRoles: ['iam-engineer', 'cloud-security', 'security-manager'],
    },

    {
      id: 'ui-designer',
      title: 'UI Designer',
      icon: '🧩🎨',
      level: 'entry',
      overview:
        'Designs visual interfaces: layouts, typography, components, and interaction patterns. Often partners closely with frontend engineers and design systems.',
      bestFor: ['You like visual craft and consistency', 'You want to build UI that feels polished and usable'],
      steps: [
        'Learn UI fundamentals: spacing, hierarchy, typography, contrast, states',
        'Learn component-based design and design system patterns',
        'Practice accessibility basics (color contrast, focus states, semantics)',
        'Work with real constraints: responsive layouts and developer handoff',
      ],
      skills: ['Visual design', 'Component thinking', 'Accessibility basics', 'Communication', 'Iteration'],
      certs: {
        beginner: ['Not required'],
        next: ['Not required'],
      },
      projects: [
        'Design a small component library (buttons, inputs, cards) with states and spacing rules',
        'Redesign a simple page and document design decisions + accessibility notes',
      ],
      nextRoles: ['product-designer', 'ux-engineer', 'frontend-dev'],
    },

    {
      id: 'product-designer',
      title: 'Product Designer',
      icon: '🧠🎨',
      level: 'intermediate',
      overview:
        'Designs end-to-end user experiences: research, flows, IA, UI, and iteration based on feedback and metrics. Works closely with PM/engineering.',
      bestFor: ['You like solving user problems end-to-end', 'You enjoy collaboration and iteration'],
      steps: [
        'Learn basic user research and how to turn insights into flows',
        'Practice designing for edge cases and states (loading, errors, empty)',
        'Learn how to communicate decisions clearly with specs and prototypes',
        'Develop accessibility habits and simple usability testing routines',
      ],
      skills: ['UX thinking', 'UI craft', 'Communication', 'Prototyping', 'Accessibility'],
      certs: {
        beginner: ['Not required'],
        next: ['Not required'],
      },
      projects: [
        'Create a product case study: problem → research → solution → iteration notes',
        'Design a flow with explicit error/empty/loading states and handoff notes',
      ],
      nextRoles: ['ux-engineer', 'product-engineer', 'tech-lead'],
    },

    {
      id: 'developer-advocate',
      title: 'Developer Advocate / DevRel Engineer',
      icon: '🎤💻',
      level: 'intermediate',
      overview:
        'Helps developers succeed with a product/platform: builds demos, docs, sample apps, and feedback loops between users and engineering. Mix of engineering + communication.',
      bestFor: ['You like teaching and building demos', 'You enjoy community and product feedback loops'],
      steps: [
        'Build strong practical coding skills and the ability to ship small apps quickly',
        'Learn how to write clear docs and create runnable examples',
        'Practice presenting and collecting feedback (what’s confusing, what’s missing)',
        'Build a feedback loop: issues → fixes → docs → examples → repeat',
      ],
      skills: ['Communication', 'Prototyping', 'Docs', 'Empathy', 'Engineering fundamentals'],
      certs: {
        beginner: ['Not required'],
        next: ['Cloud fundamentals can help (optional)'],
      },
      projects: [
        'Build a sample app + tutorial and test it with a friend (track where they get stuck)',
        'Create a “getting started” repo with clear README, troubleshooting, and demos',
      ],
      nextRoles: ['product-engineer', 'tech-lead', 'solutions-architect'],
    },

    {
      id: 'devsecops',
      title: 'DevSecOps Engineer',
      icon: '🛡️🔁',
      level: 'intermediate',
      overview:
        'Builds security into CI/CD and delivery workflows: scanning, secure defaults, policy checks, and developer-friendly guardrails. Bridges DevOps + AppSec.',
      bestFor: ['You like automation and security', 'You want high leverage across many teams'],
      steps: [
        'Learn CI/CD fundamentals and where security checks fit without killing velocity',
        'Learn secret scanning, dependency scanning, and basic SAST/DAST concepts',
        'Build pipelines with actionable outputs (triage, owners, SLAs) instead of noise',
        'Practice safe rollout of security gates with an exception process',
      ],
      skills: ['CI/CD', 'Secure delivery', 'Automation', 'Risk prioritization', 'Communication'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Cloud fundamentals (optional)', 'Platform-specific training (optional)'],
      },
      projects: [
        'Add dependency + secret scanning to a demo repo and document triage workflow',
        'Create a pipeline policy: what blocks releases vs what warns (with justification)',
      ],
      nextRoles: ['appsec', 'platform-engineer', 'security-engineer'],
    },

    {
      id: 'security-automation',
      title: 'Security Automation Engineer',
      icon: '⚡🛡️',
      level: 'intermediate',
      overview:
        'Automates security operations and controls: enrichment, response workflows, policy checks, and reducing manual toil (carefully, with safety guardrails).',
      bestFor: ['You like scripting and measurable impact', 'You enjoy turning messy processes into reliable automation'],
      steps: [
        'Learn basic scripting for automation (Python/Node) and safe rollout practices',
        'Learn common security workflows (IR, alert triage, vuln triage) and where automation helps',
        'Build guardrails: least privilege, logging, rate limits, and approval steps',
        'Measure outcomes (time-to-triage, false positives, response consistency)',
      ],
      skills: ['Automation mindset', 'Security workflows', 'Safe operations', 'Logging/monitoring', 'Documentation'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['SIEM/EDR training (optional)'],
      },
      projects: [
        'Build a “context enricher” script that adds owner/app/asset context to alerts (read-only)',
        'Create a safe automation checklist: permissions, rollback, rate limits, audit logs',
      ],
      nextRoles: ['security-operations-engineer', 'detection-engineer', 'platform-engineer'],
    },

    {
      id: 'pki-engineer',
      title: 'PKI / Certificates Engineer',
      icon: '📜🔐',
      level: 'intermediate',
      overview:
        'Owns certificate lifecycle and trust: issuing, renewal automation, mTLS basics, and preventing outages caused by expired certs and misconfigurations.',
      bestFor: ['You like careful engineering with high reliability impact', 'You enjoy reducing “surprise outages” via automation'],
      steps: [
        'Learn certificate fundamentals (public/private keys, chains, expiry, revocation concepts)',
        'Learn where certs break services (TLS termination, clients, load balancers)',
        'Build renewal automation and monitoring for expiry',
        'Document standards: naming, owners, rotation, and emergency procedures',
      ],
      skills: ['TLS basics', 'Automation', 'Reliability thinking', 'Documentation', 'Operational readiness'],
      certs: {
        beginner: ['Not required'],
        next: ['Cloud fundamentals (optional)'],
      },
      projects: [
        'Create a certificate inventory template + expiry monitoring checklist',
        'Write an outage postmortem scenario for an expired cert with prevention steps',
      ],
      nextRoles: ['security-engineer', 'cloud-security', 'sre'],
    },

    {
      id: 'pam-engineer',
      title: 'PAM Engineer (Privileged Access)',
      icon: '🗝️',
      level: 'intermediate',
      overview:
        'Manages privileged access controls: admin account governance, just-in-time access, session recording, vaulting, and reducing standing privileges.',
      bestFor: ['You like high-impact risk reduction', 'You enjoy structured access controls and governance'],
      steps: [
        'Learn privileged access risks and common mitigation patterns',
        'Build admin lifecycle: break-glass accounts, rotation, approvals, evidence',
        'Implement least privilege and just-in-time access concepts where possible',
        'Practice access reviews and incident response support for privileged activity',
      ],
      skills: ['IAM fundamentals', 'Governance', 'Risk thinking', 'Documentation', 'Stakeholder alignment'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Cloud IAM training (optional)'],
      },
      projects: [
        'Create a privileged access policy: JIT, approvals, logging, emergency access',
        'Write a break-glass runbook with evidence requirements and rotation steps',
      ],
      nextRoles: ['iam-governance', 'iam-engineer', 'security-engineer'],
    },

    {
      id: 'cspm-engineer',
      title: 'CSPM / Cloud Posture Engineer',
      icon: '☁️🛡️📏',
      level: 'intermediate',
      overview:
        'Improves cloud security posture at scale: baseline policies, misconfiguration detection, remediation playbooks, and safe guardrails teams can adopt.',
      bestFor: ['You like cloud + security + measurable outcomes', 'You enjoy building guardrails rather than chasing incidents forever'],
      steps: [
        'Learn common cloud misconfigs (public storage, weak IAM, exposed services) and why they matter',
        'Build a remediation workflow: owners, SLAs, exceptions, and evidence',
        'Create secure-by-default templates and policy checks',
        'Measure posture improvements and reduce recurring classes of issues',
      ],
      skills: ['Cloud security basics', 'Policy thinking', 'Automation', 'Risk prioritization', 'Communication'],
      certs: {
        beginner: ['Cloud fundamentals (AZ-900/AWS CCP)'],
        next: ['Security+ (foundation)'],
      },
      projects: [
        'Create a “top 10 cloud misconfigs” playbook with remediation steps and owners',
        'Build a secure template repo (networking + logging + IAM) with guardrails documented',
      ],
      nextRoles: ['cloud-security', 'cloud-governance', 'security-engineer'],
    },

    {
      id: 'threat-modeling',
      title: 'Threat Modeling Specialist',
      icon: '🧠🧨',
      level: 'intermediate',
      overview:
        'Partners with engineering to identify threats early and design practical mitigations. Helps teams build secure defaults without slowing delivery.',
      bestFor: ['You like system thinking and risk tradeoffs', 'You enjoy collaborating with teams and improving designs early'],
      steps: [
        'Learn threat modeling basics (assets, trust boundaries, attacker goals, mitigations)',
        'Practice turning risks into actionable requirements and tests',
        'Build lightweight review processes and templates teams will actually use',
        'Track outcomes: reduced incidents, fewer critical findings, faster reviews',
      ],
      skills: ['Threat modeling', 'Communication', 'Architecture thinking', 'Security fundamentals', 'Documentation'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Not required'],
      },
      projects: [
        'Threat model a simple SaaS (auth, payments, admin) and write mitigations + tests',
        'Create a threat modeling template and run two sample workshops with notes',
      ],
      nextRoles: ['security-architect', 'appsec', 'solutions-architect'],
    },

    {
      id: 'security-consultant',
      title: 'Security Consultant',
      icon: '🧳🛡️',
      level: 'intermediate',
      overview:
        'Advises teams/clients on security improvements: assessments, roadmaps, guardrails, and practical recommendations. Mix of communication + technical awareness.',
      bestFor: ['You like variety and stakeholder work', 'You’re strong at translating risk into action'],
      steps: [
        'Learn assessment frameworks: what to look for and how to prioritize recommendations',
        'Practice writing clear reports with actionable, realistic remediation steps',
        'Develop soft skills: stakeholder alignment, negotiation, and expectation setting',
        'Build repeatable templates: findings, severities, evidence, and follow-ups',
      ],
      skills: ['Communication', 'Risk prioritization', 'Documentation', 'Security fundamentals', 'Stakeholder management'],
      certs: {
        beginner: ['Security+ (foundation)'],
        next: ['Role-specific training (optional)'],
      },
      projects: [
        'Write a mock security assessment report for a sample app (findings + remediation)',
        'Create a security roadmap template (themes, milestones, owners, metrics)',
      ],
      nextRoles: ['security-manager', 'security-architect', 'grc'],
    },

    {
      id: 'iac-engineer',
      title: 'Infrastructure as Code (IaC) Engineer (Terraform)',
      icon: '🧱📜',
      level: 'intermediate',
      overview:
        'Builds reusable infrastructure modules and safe deployment patterns with IaC. Focus on standardization, reviewability, and reliable environments.',
      bestFor: ['You like building reusable templates and standards', 'You want a cloud/platform path with strong engineering practices'],
      steps: [
        'Learn Terraform fundamentals and state management concepts',
        'Build reusable modules with clear inputs/outputs and validation',
        'Add CI checks: formatting, validation, policy checks, and plan review',
        'Practice safe rollout: workspaces/environments, drift detection, rollback strategy',
      ],
      skills: ['Terraform/IaC', 'Cloud fundamentals', 'Automation', 'Code review habits', 'Documentation'],
      certs: {
        beginner: ['Cloud fundamentals (AZ-900/AWS CCP)'],
        next: ['Terraform Associate (optional)'],
      },
      projects: [
        'Create a reusable module repo (network + logging + compute) with docs and examples',
        'Build a CI pipeline that enforces validation + policy checks + plan review',
      ],
      nextRoles: ['cloud-engineer', 'platform-engineer', 'cloud-governance'],
    },

    {
      id: 'serverless-engineer',
      title: 'Serverless Engineer',
      icon: '🧬☁️',
      level: 'intermediate',
      overview:
        'Builds event-driven systems using managed/serverless services. Focus on reliability, cost, security, and operational visibility in distributed workflows.',
      bestFor: ['You like building scalable systems with managed building blocks', 'You care about cost and reliability tradeoffs'],
      steps: [
        'Learn event-driven design basics (events, queues, retries, idempotency)',
        'Learn observability for distributed workflows (logs, tracing, correlation ids)',
        'Learn secure patterns: least privilege, secrets, safe triggers, validation',
        'Practice cost-aware design and throttling/backpressure',
      ],
      skills: ['Cloud fundamentals', 'Event-driven patterns', 'Reliability thinking', 'Security basics', 'Observability'],
      certs: {
        beginner: ['Cloud fundamentals (optional)'],
        next: ['Associate cloud cert (optional)'],
      },
      projects: [
        'Build an event-driven workflow (ingest → process → store) with retries + idempotency documented',
        'Add tracing/log correlation to a demo flow and write an ops runbook',
      ],
      nextRoles: ['cloud-engineer', 'sre', 'solutions-architect'],
    },

    {
      id: 'api-platform-engineer',
      title: 'API Platform / Gateway Engineer',
      icon: '🚪⚙️',
      level: 'intermediate',
      overview:
        'Builds shared API infrastructure: gateways, auth integration, rate limiting, routing, and standards so teams can ship APIs safely and consistently.',
      bestFor: ['You like platform building and standards', 'You enjoy making teams faster with good defaults'],
      steps: [
        'Learn API fundamentals: auth, versioning, idempotency, rate limiting, error contracts',
        'Learn gateway patterns (routing, policies, WAF basics, observability)',
        'Build reusable templates and documentation for API teams',
        'Practice safe rollout of policy changes with metrics and rollback paths',
      ],
      skills: ['API design basics', 'Security basics', 'Observability', 'Platform thinking', 'Documentation'],
      certs: {
        beginner: ['Not required'],
        next: ['Cloud fundamentals can help (optional)'],
      },
      projects: [
        'Define an API standard doc (auth, errors, pagination, rate limits) with examples',
        'Build a demo gateway policy set and document rollout + rollback approach',
      ],
      nextRoles: ['platform-engineer', 'security-engineer', 'solutions-architect'],
    },

    {
      id: 'service-mesh-engineer',
      title: 'Service Mesh Engineer',
      icon: '🕸️☸️',
      level: 'expert',
      overview:
        'Owns service-to-service networking and security patterns (mTLS, routing, retries, observability) across microservices platforms. Deep platform role.',
      bestFor: ['You like deep platform networking + reliability', 'You enjoy solving cross-cutting problems at scale'],
      steps: [
        'Learn Kubernetes networking and service-to-service communication patterns',
        'Learn mTLS and certificate lifecycle basics for services',
        'Practice traffic management (timeouts, retries, circuit breaking) and safe rollouts',
        'Build observability defaults and debugging playbooks for teams',
      ],
      skills: ['Kubernetes', 'Networking', 'mTLS basics', 'Reliability thinking', 'Observability'],
      certs: {
        beginner: ['Not required'],
        next: ['CKA/CKAD (optional)'],
      },
      projects: [
        'Design a service-to-service security plan (mTLS, identities, rotation) and document it',
        'Create a traffic policy playbook (timeouts/retries) with failure-mode examples',
      ],
      nextRoles: ['kubernetes-engineer', 'platform-engineer', 'sre'],
    },

    {
      id: 'cloud-sre',
      title: 'Cloud Reliability Engineer',
      icon: '☁️📉',
      level: 'expert',
      overview:
        'Reliability-focused engineer specializing in cloud platforms: capacity, incident response, scaling, and guardrails to keep workloads healthy and predictable.',
      bestFor: ['You like incident response and hard reliability problems', 'You enjoy creating standards and automation'],
      steps: [
        'Master observability and incident response for cloud workloads',
        'Build reliability guardrails: SLOs, runbooks, alert quality, safe deploys',
        'Learn scaling/capacity patterns and failure modes in cloud services',
        'Automate toil reduction and improve resilience continuously',
      ],
      skills: ['Observability', 'Incident response', 'Automation', 'Cloud fundamentals', 'Reliability thinking'],
      certs: {
        beginner: ['Cloud associate-level (optional)'],
        next: ['Not required'],
      },
      projects: [
        'Create SLOs + alerts + runbooks for a cloud workload and simulate incidents',
        'Write a resilience checklist (timeouts, retries, backpressure, load testing) and apply it',
      ],
      nextRoles: ['cloud-architect', 'platform-engineer', 'enterprise-architect'],
    },
  ];

  const byId = new Map(roles.map((r) => [r.id, r]));

  const safeText = (v) => String(v ?? '').trim();

  const parseRoleFromHash = () => {
    const hash = String(window.location.hash || '').replace(/^#/, '');
    if (!hash) return null;

    // Support both `#role=it-support` and `#it-support`.
    if (hash.startsWith('role=')) return hash.slice('role='.length);
    return hash;
  };

  const setHashRole = (roleId) => {
    if (!roleId) return;
    window.location.hash = `role=${encodeURIComponent(roleId)}`;
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string') node.textContent = text;
    return node;
  };

  const renderList = (activeId) => {
    listEl.innerHTML = '';

    const normalizedRoles = roles.map((r) => ({
      ...r,
      level: LEVELS.includes(r.level) ? r.level : 'intermediate',
      category: inferCategoryKey(r),
    }));

    const levelSortIndex = new Map(LEVELS.map((v, idx) => [v, idx]));

    for (const category of CATEGORIES) {
      const group = normalizedRoles
        .filter((r) => r.category === category.key)
        .sort((a, b) => {
          const la = levelSortIndex.get(a.level) ?? 999;
          const lb = levelSortIndex.get(b.level) ?? 999;
          if (la !== lb) return la - lb;
          return String(a.title).localeCompare(String(b.title));
        });
      if (!group.length) continue;

      const title = document.createElement('div');
      title.className = 'role-group-title';
      title.textContent = category.label;
      listEl.appendChild(title);

      for (const role of group) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-secondary';
        btn.setAttribute('data-role-id', role.id);
        btn.setAttribute('aria-pressed', role.id === activeId ? 'true' : 'false');

        const left = document.createElement('span');
        left.className = 'role-title';
        left.textContent = `${role.icon} ${role.title}`;

        const tag = document.createElement('span');
        tag.className = 'role-level-tag';
        tag.textContent = levelLabel[role.level] || role.level;

        btn.appendChild(left);
        btn.appendChild(tag);

        btn.addEventListener('click', () => {
          setHashRole(role.id);
        });

        listEl.appendChild(btn);
      }
    }
  };

  const renderDetail = (role) => {
    detailEl.innerHTML = '';

    if (!role) {
      const card = el('div', 'role-detail-panel');
      card.appendChild(el('h3', '', 'Choose a role'));
      card.appendChild(
        el('p', 'role-meta', 'Select a role from the list to see a structured roadmap (skills, certs, projects).')
      );
      detailEl.appendChild(card);
      return;
    }

    const card = el('div', 'role-detail-panel');

    const heading = el('h3', '', `${role.icon} ${role.title}`);
    card.appendChild(heading);
    card.appendChild(el('p', 'role-meta', safeText(role.overview)));

    const addSection = (title, items, { kind = 'ul' } = {}) => {
      if (!items || !items.length) return;
      card.appendChild(el('div', 'role-section-title', title));
      if (kind === 'p') {
        for (const it of items) card.appendChild(el('p', 'role-meta', safeText(it)));
        return;
      }
      const ul = document.createElement('ul');
      for (const it of items) ul.appendChild(el('li', '', safeText(it)));
      card.appendChild(ul);
    };

    const addLinkSection = (title, links) => {
      const list = Array.isArray(links) ? links : [];
      const items = list
        .map((x) => ({ name: String(x?.name || '').trim(), url: String(x?.url || '').trim() }))
        .filter((x) => x.name && x.url);
      if (!items.length) return;

      card.appendChild(el('div', 'role-section-title', title));
      const ul = document.createElement('ul');
      for (const it of items) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = it.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = it.name;
        li.appendChild(a);
        ul.appendChild(li);
      }
      card.appendChild(ul);
    };

    addSection('Best for', role.bestFor);
    addSection('Structured starting steps', role.steps);
    addSection('Core skills to build', role.skills);

    addLinkSection('Free learning platforms', role.freePlatforms);
    addLinkSection('YouTube creators / channels', role.youtubeCreators);

    if (role.certs) {
      const { beginner = [], next = [], advanced = [] } = role.certs;
      if (beginner.length || next.length || advanced.length) {
        card.appendChild(el('div', 'role-section-title', 'Certifications (optional but helpful)'));
        const wrap = el('div', 'role-meta');

        const addCertGroup = (label, list) => {
          if (!list.length) return;
          const groupTitle = el('div', '', label);
          groupTitle.style.fontWeight = '800';
          groupTitle.style.marginTop = '10px';
          wrap.appendChild(groupTitle);

          const ul = document.createElement('ul');
          for (const c of list) ul.appendChild(el('li', '', safeText(c)));
          wrap.appendChild(ul);
        };

        addCertGroup('Start', beginner);
        addCertGroup('Next', next);
        addCertGroup('Advanced', advanced);

        card.appendChild(wrap);
      }
    }

    addSection('Portfolio projects / labs', role.projects);

    if (role.nextRoles && role.nextRoles.length) {
      const next = role.nextRoles
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((r) => r.title);
      addSection('Common next roles', next);
    }

    const ctas = el('div', 'form-actions');
    const forumBtn = el('a', 'btn-primary', 'Ask the community');
    forumBtn.href = '/forum.html';
    const resourcesBtn = el('a', 'btn-secondary', 'Browse resources');
    resourcesBtn.href = '/resources.html';
    ctas.appendChild(forumBtn);
    ctas.appendChild(resourcesBtn);
    card.appendChild(ctas);

    detailEl.appendChild(card);
  };

  const applyFromHash = () => {
    const requested = decodeURIComponent(parseRoleFromHash() || '');
    const fallback = roles[0] && roles[0].id;
    const activeId = byId.has(requested) ? requested : fallback;

    renderList(activeId);
    renderDetail(byId.get(activeId));

    // Update aria-pressed state
    const buttons = listEl.querySelectorAll('button[data-role-id]');
    for (const b of buttons) {
      const id = b.getAttribute('data-role-id');
      b.setAttribute('aria-pressed', id === activeId ? 'true' : 'false');
    }
  };

  window.addEventListener('hashchange', applyFromHash);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFromHash);
  } else {
    applyFromHash();
  }
})();
