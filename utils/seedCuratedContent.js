const Tag = require('../models/Tag');
const Resource = require('../models/Resource');

const normalizeTags = (arr) => {
  const a = Array.isArray(arr) ? arr : [];
  return Array.from(new Set(a.map((t) => String(t || '').trim().toLowerCase()).filter(Boolean))).slice(0, 12);
};

const upsertTag = async (t) => {
  const slug = String(t.slug || '').trim().toLowerCase();
  if (!slug) return { slug: '', created: false };

  const res = await Tag.updateOne(
    { slug },
    {
      $setOnInsert: {
        slug,
        isSystem: true,
      },
      $set: {
        name: String(t.name || slug).trim(),
        category: String(t.category || 'general').trim() || 'general',
        description: String(t.description || '').trim(),
        isActive: true,
      },
    },
    { upsert: true }
  );

  return { slug, created: Boolean(res?.upsertedId) };
};

const upsertResourceLink = async (r) => {
  const url = String(r.url || '').trim();
  if (!url) return { key: '', created: false };

  const key = `link:${url}`;
  const tags = normalizeTags(r.tags);

  const res = await Resource.updateOne(
    { key },
    {
      $setOnInsert: {
        key,
        url,
        createdBy: null,
      },
      $set: {
        title: String(r.title || '').trim().slice(0, 200),
        description: String(r.description || '').trim().slice(0, 2000),
        kind: String(r.kind || 'documentation').trim(),
        level: String(r.level || 'all').trim(),
        tags,
        isActive: true,
      },
    },
    { upsert: true }
  );

  return { key, created: Boolean(res?.upsertedId) };
};

const seedCuratedContent = async () => {
  // Admin-curated tags (slugs are the stable contract used by posts/resources)
  const tags = [
    { slug: 'html', name: 'HTML', category: 'frontend', description: 'HTML structure, semantics, forms, accessibility.' },
    { slug: 'css', name: 'CSS', category: 'frontend', description: 'Layout, responsive design, animations, modern CSS.' },
    { slug: 'javascript', name: 'JavaScript', category: 'frontend', description: 'JS fundamentals, DOM, async, tooling.' },
    { slug: 'typescript', name: 'TypeScript', category: 'frontend', description: 'Types, TS tooling, TS with frameworks.' },
    { slug: 'react', name: 'React', category: 'frontend', description: 'React fundamentals, hooks, patterns.' },
    { slug: 'nodejs', name: 'Node.js', category: 'backend', description: 'Node runtime, modules, streams, tooling.' },
    { slug: 'express', name: 'Express', category: 'backend', description: 'Express routing, middleware, APIs.' },
    { slug: 'mongodb', name: 'MongoDB', category: 'backend', description: 'MongoDB querying, indexes, schema design.' },
    { slug: 'database', name: 'Databases', category: 'backend', description: 'SQL/NoSQL concepts, modeling, migrations.' },
    { slug: 'git', name: 'Git', category: 'tooling', description: 'Version control basics and workflows.' },
    { slug: 'github', name: 'GitHub', category: 'tooling', description: 'PRs, issues, actions, collaboration.' },
    { slug: 'testing', name: 'Testing', category: 'engineering', description: 'Unit/integration testing, Jest, best practices.' },
    { slug: 'security', name: 'Security', category: 'engineering', description: 'Auth, OWASP basics, web security.' },
    { slug: 'api', name: 'APIs', category: 'backend', description: 'REST, JSON, HTTP, API design.' },
    { slug: 'career', name: 'Career', category: 'career', description: 'Interviews, resumes, roadmaps, growth.' },

    // Broad buckets (useful for high-level roadmaps)
    { slug: 'frontend', name: 'Frontend', category: 'career', description: 'Frontend roadmaps and core concepts.' },
    { slug: 'backend', name: 'Backend', category: 'career', description: 'Backend roadmaps and core concepts.' },

    // Broader engineering / devops / cloud
    { slug: 'linux', name: 'Linux', category: 'devops', description: 'Linux fundamentals, CLI, processes, networking.' },
    { slug: 'docker', name: 'Docker', category: 'devops', description: 'Containers, images, compose, best practices.' },
    { slug: 'kubernetes', name: 'Kubernetes', category: 'devops', description: 'K8s basics, deployments, services, clusters.' },
    { slug: 'devops', name: 'DevOps', category: 'devops', description: 'CI/CD, automation, release engineering.' },
    { slug: 'cloud', name: 'Cloud', category: 'cloud', description: 'Cloud fundamentals, services, architecture.' },
    { slug: 'aws', name: 'AWS', category: 'cloud', description: 'Amazon Web Services fundamentals and docs.' },
    { slug: 'azure', name: 'Azure', category: 'cloud', description: 'Microsoft Azure fundamentals and docs.' },
    { slug: 'gcp', name: 'GCP', category: 'cloud', description: 'Google Cloud Platform fundamentals and docs.' },
    { slug: 'networking', name: 'Networking', category: 'engineering', description: 'HTTP, DNS, TCP/IP basics, troubleshooting.' },
    { slug: 'system-design', name: 'System Design', category: 'engineering', description: 'Scalability, trade-offs, architectures.' },
    { slug: 'algorithms', name: 'Algorithms', category: 'engineering', description: 'Algorithmic thinking and common patterns.' },
    { slug: 'data-structures', name: 'Data Structures', category: 'engineering', description: 'Arrays, maps, trees, graphs, complexity.' },

    // Languages
    { slug: 'python', name: 'Python', category: 'language', description: 'Python fundamentals, standard library, tooling.' },
    { slug: 'java', name: 'Java', category: 'language', description: 'Java fundamentals, JVM, ecosystem.' },
    { slug: 'csharp', name: 'C#', category: 'language', description: 'C# language and .NET ecosystem.' },
    { slug: 'dotnet', name: '.NET', category: 'language', description: '.NET runtime, libraries, tooling.' },

    // Networking / homelab / ops
    { slug: 'homelab', name: 'Homelab', category: 'devops', description: 'Self-hosting, lab builds, hardware, and practical ops.' },
    { slug: 'self-hosting', name: 'Self Hosting', category: 'devops', description: 'Run services at home: media, cloud, auth, backups.' },
    { slug: 'routing', name: 'Routing', category: 'engineering', description: 'Routing concepts: static routes, OSPF/BGP, policy routing.' },
    { slug: 'switching', name: 'Switching', category: 'engineering', description: 'Layer 2 networking: VLANs, trunks, STP, LACP.' },
    { slug: 'tcpip', name: 'TCP/IP', category: 'engineering', description: 'TCP, UDP, IP addressing, MTU, fragmentation, troubleshooting.' },
    { slug: 'dns', name: 'DNS', category: 'engineering', description: 'DNS records, resolvers, authoritative servers, troubleshooting.' },
    { slug: 'dhcp', name: 'DHCP', category: 'engineering', description: 'DHCP fundamentals, scopes, reservations, common pitfalls.' },
    { slug: 'ipv6', name: 'IPv6', category: 'engineering', description: 'IPv6 addressing, routing, SLAAC, and transition mechanisms.' },
    { slug: 'wireless', name: 'Wireless', category: 'engineering', description: 'Wi‑Fi fundamentals, planning, roaming, security.' },
    { slug: 'vpn', name: 'VPN', category: 'security', description: 'VPN fundamentals, WireGuard/OpenVPN, remote access and site-to-site.' },
    { slug: 'firewalls', name: 'Firewalls', category: 'security', description: 'Firewall rules, NAT, segmentation, zero trust basics.' },
    { slug: 'load-balancing', name: 'Load Balancing', category: 'devops', description: 'Reverse proxies, L4/L7 load balancers, HA patterns.' },
    { slug: 'monitoring', name: 'Monitoring', category: 'devops', description: 'Metrics, alerting, dashboards, and SLOs.' },
    { slug: 'logging', name: 'Logging', category: 'devops', description: 'Centralized logs, structured logging, retention and search.' },
    { slug: 'observability', name: 'Observability', category: 'devops', description: 'Metrics, logs, traces, profiling, incident response.' },
    { slug: 'prometheus', name: 'Prometheus', category: 'devops', description: 'Metrics scraping, alerts, exporters, recording rules.' },
    { slug: 'grafana', name: 'Grafana', category: 'devops', description: 'Dashboards, alerting, data sources for observability.' },
    { slug: 'backup', name: 'Backups', category: 'devops', description: 'Backup strategies, retention, restore testing.' },
    { slug: 'storage', name: 'Storage', category: 'devops', description: 'NAS/SAN basics, file systems, performance and reliability.' },
    { slug: 'zfs', name: 'ZFS', category: 'devops', description: 'ZFS datasets, snapshots, replication, integrity.' },
    { slug: 'virtualization', name: 'Virtualization', category: 'devops', description: 'Hypervisors, VMs, virtual networking, capacity planning.' },
    { slug: 'kvm', name: 'KVM', category: 'devops', description: 'Linux virtualization using KVM/QEMU tools and concepts.' },
    { slug: 'proxmox', name: 'Proxmox', category: 'devops', description: 'Proxmox VE virtualization and homelab clusters.' },
    { slug: 'truenas', name: 'TrueNAS', category: 'devops', description: 'TrueNAS storage, shares, apps, and ZFS-backed NAS.' },
    { slug: 'pfsense', name: 'pfSense', category: 'security', description: 'pfSense firewall/router platform docs and guidance.' },
    { slug: 'opnsense', name: 'OPNsense', category: 'security', description: 'OPNsense firewall/router platform docs and guidance.' },
    { slug: 'openwrt', name: 'OpenWrt', category: 'engineering', description: 'OpenWrt router OS docs: routing, firewalling, packages.' },
    { slug: 'vyos', name: 'VyOS', category: 'engineering', description: 'VyOS routing platform docs and configuration.' },
    { slug: 'ansible', name: 'Ansible', category: 'devops', description: 'Automation via playbooks, roles, inventory, idempotence.' },
    { slug: 'terraform', name: 'Terraform', category: 'devops', description: 'Infrastructure-as-code, modules, state, and workflows.' },

    // Security (expanded)
    { slug: 'appsec', name: 'Application Security', category: 'security', description: 'Secure coding, threat modeling, and app hardening.' },
    { slug: 'network-security', name: 'Network Security', category: 'security', description: 'Segmentation, ACLs, IDS/IPS, and network monitoring.' },
    { slug: 'pentesting', name: 'Penetration Testing', category: 'security', description: 'Offensive security workflow, tooling, reporting.' },
    { slug: 'ctf', name: 'CTF / Practice', category: 'security', description: 'Hands-on security practice labs and CTF platforms.' },
    { slug: 'incident-response', name: 'Incident Response', category: 'security', description: 'IR lifecycle, triage, containment, eradication, recovery.' },
    { slug: 'forensics', name: 'Forensics', category: 'security', description: 'Digital forensics fundamentals and tooling.' },
    { slug: 'reverse-engineering', name: 'Reverse Engineering', category: 'security', description: 'Binary analysis, RE tooling, safe practices.' },
    { slug: 'malware', name: 'Malware Analysis', category: 'security', description: 'Malware triage, sandboxes, dynamic/static analysis.' },
    { slug: 'cryptography', name: 'Cryptography', category: 'security', description: 'Crypto fundamentals, practical pitfalls, and protocols.' },
    { slug: 'iam', name: 'IAM', category: 'security', description: 'Identity, access control, MFA, RBAC/ABAC basics.' },
    { slug: 'hardening', name: 'Hardening', category: 'security', description: 'Secure baseline configuration for OS and services.' },
    { slug: 'ids', name: 'IDS/IPS', category: 'security', description: 'Intrusion detection/prevention: tooling and tuning.' },
    { slug: 'siem', name: 'SIEM', category: 'security', description: 'Security event management, detections, and triage.' },

    // OS / services / languages (expanded)
    { slug: 'windows', name: 'Windows', category: 'devops', description: 'Windows fundamentals for admins and developers.' },
    { slug: 'windows-server', name: 'Windows Server', category: 'devops', description: 'Windows Server administration and services.' },
    { slug: 'active-directory', name: 'Active Directory', category: 'security', description: 'AD fundamentals, identity, Kerberos, and hardening.' },
    { slug: 'powershell', name: 'PowerShell', category: 'tooling', description: 'PowerShell scripting and automation.' },
    { slug: 'bash', name: 'Bash', category: 'tooling', description: 'Shell scripting and CLI workflows.' },
    { slug: 'nginx', name: 'Nginx', category: 'devops', description: 'Nginx web server and reverse proxy.' },
    { slug: 'apache', name: 'Apache', category: 'devops', description: 'Apache HTTP Server fundamentals and modules.' },
    { slug: 'postgresql', name: 'PostgreSQL', category: 'backend', description: 'Postgres fundamentals, queries, indexing, ops.' },
    { slug: 'redis', name: 'Redis', category: 'backend', description: 'Redis data structures, caching, queues, and ops.' },
    { slug: 'go', name: 'Go', category: 'language', description: 'Go language docs and ecosystem.' },
    { slug: 'rust', name: 'Rust', category: 'language', description: 'Rust language docs and ecosystem.' },
    { slug: 'containers', name: 'Containers', category: 'devops', description: 'Container fundamentals beyond just Docker tooling.' },
    { slug: 'kali', name: 'Kali Linux', category: 'security', description: 'Kali documentation and tooling reference (for labs).' },
    { slug: 'blue-team', name: 'Blue Team', category: 'security', description: 'Defensive security: detection, monitoring, response.' },
    { slug: 'red-team', name: 'Red Team', category: 'security', description: 'Offensive security: tradecraft, testing, reporting.' },
    { slug: 'yara', name: 'YARA', category: 'security', description: 'Pattern matching rules used in malware analysis and hunting.' },
    { slug: 'sigma', name: 'Sigma', category: 'security', description: 'Generic detection rules for SIEMs and log analytics.' },
    { slug: 'elastic', name: 'Elastic', category: 'devops', description: 'Elasticsearch/Kibana stack for logs and observability.' },
    { slug: 'splunk', name: 'Splunk', category: 'security', description: 'Splunk docs for searching, dashboards, and detections.' },

    // Vendor docs (networking / security / virtualization / storage)
    { slug: 'cisco', name: 'Cisco', category: 'engineering', description: 'Cisco networking platform docs and learning.' },
    { slug: 'juniper', name: 'Juniper', category: 'engineering', description: 'Juniper networking platform docs and learning.' },
    { slug: 'arista', name: 'Arista', category: 'engineering', description: 'Arista networking platform docs and learning.' },
    { slug: 'fortinet', name: 'Fortinet', category: 'security', description: 'Fortinet security platform documentation.' },
    { slug: 'paloalto', name: 'Palo Alto Networks', category: 'security', description: 'Palo Alto Networks security platform documentation.' },
    { slug: 'ubiquiti', name: 'Ubiquiti', category: 'engineering', description: 'Ubiquiti networking and Wi‑Fi documentation.' },
    { slug: 'unifi', name: 'UniFi', category: 'engineering', description: 'UniFi network controller and device documentation.' },
    { slug: 'aruba', name: 'HPE Aruba', category: 'engineering', description: 'Aruba switching/wireless documentation.' },
    { slug: 'vmware', name: 'VMware', category: 'devops', description: 'VMware virtualization platform documentation.' },
    { slug: 'synology', name: 'Synology', category: 'devops', description: 'Synology NAS documentation and admin guides.' },
    { slug: 'mikrotik', name: 'MikroTik', category: 'engineering', description: 'MikroTik RouterOS and networking documentation.' },

    // Labs + certifications
    { slug: 'labs', name: 'Labs', category: 'engineering', description: 'Hands-on labs, emulators, practice environments.' },
    { slug: 'gns3', name: 'GNS3', category: 'engineering', description: 'Network emulation platform for routing/switching labs.' },
    { slug: 'eve-ng', name: 'EVE-NG', category: 'engineering', description: 'Network emulation platform for routing/switching labs.' },
    { slug: 'packet-tracer', name: 'Packet Tracer', category: 'engineering', description: 'Cisco Packet Tracer learning and lab tooling.' },
    { slug: 'cml', name: 'Cisco Modeling Labs (CML)', category: 'engineering', description: 'Cisco lab environment for network simulation.' },
    { slug: 'certifications', name: 'Certifications', category: 'career', description: 'Vendor-neutral and vendor-specific certification paths.' },
    { slug: 'ccna', name: 'CCNA', category: 'career', description: 'Cisco Certified Network Associate learning resources.' },
    { slug: 'ccnp', name: 'CCNP', category: 'career', description: 'Cisco Certified Network Professional learning resources.' },
    { slug: 'jncia', name: 'JNCIA', category: 'career', description: 'Juniper Networks Certified Internet Associate resources.' },
    { slug: 'jncis', name: 'JNCIS', category: 'career', description: 'Juniper Networks Certified Internet Specialist resources.' },
    { slug: 'nse', name: 'NSE', category: 'career', description: 'Fortinet certification program resources.' },
    { slug: 'pcnse', name: 'PCNSE', category: 'career', description: 'Palo Alto Networks certification resources.' },
    { slug: 'securityplus', name: 'Security+', category: 'career', description: 'CompTIA Security+ certification resources.' },
    { slug: 'networkplus', name: 'Network+', category: 'career', description: 'CompTIA Network+ certification resources.' },
    { slug: 'linuxplus', name: 'Linux+', category: 'career', description: 'CompTIA Linux+ certification resources.' },

    // Blue-team tooling + detection labs
    { slug: 'edr', name: 'EDR', category: 'security', description: 'Endpoint detection and response concepts and tooling.' },
    { slug: 'soc', name: 'SOC', category: 'security', description: 'Security operations center workflows and practices.' },
    { slug: 'security-onion', name: 'Security Onion', category: 'security', description: 'NSM and SOC platform for labs (Zeek/Suricata/Elastic).'},
    { slug: 'velociraptor', name: 'Velociraptor', category: 'security', description: 'DFIR and endpoint visibility platform for incident response.' },
    { slug: 'sysmon', name: 'Sysmon', category: 'security', description: 'Windows Sysmon telemetry for detections and investigations.' },
    { slug: 'defender', name: 'Microsoft Defender', category: 'security', description: 'Microsoft Defender security platform docs and concepts.' },
    { slug: 'sentinel', name: 'Microsoft Sentinel', category: 'security', description: 'Cloud-native SIEM/SOAR on Azure.' },
    { slug: 'thehive', name: 'TheHive', category: 'security', description: 'Incident response / case management platform.' },
    { slug: 'misp', name: 'MISP', category: 'security', description: 'Threat intelligence platform for sharing and enrichment.' },
    { slug: 'stix-taxii', name: 'STIX/TAXII', category: 'security', description: 'Threat intel exchange standards and APIs.' },
    { slug: 'stigs', name: 'STIGs', category: 'security', description: 'Security Technical Implementation Guides (hardening baselines).' },
    { slug: 'cis-benchmarks', name: 'CIS Benchmarks', category: 'security', description: 'Configuration benchmarks for hardening OS and services.' },
    { slug: 'nist', name: 'NIST', category: 'security', description: 'NIST publications and security guidance (IR, controls, frameworks).' },

    // Identity / crypto / hardening (expanded)
    { slug: 'pki', name: 'PKI', category: 'security', description: 'Public key infrastructure: certificate authorities, issuance, and trust.' },
    { slug: 'tls', name: 'TLS', category: 'security', description: 'TLS fundamentals, configuration, and operational best practices.' },
    { slug: 'kerberos', name: 'Kerberos', category: 'security', description: 'Kerberos auth fundamentals (common in Active Directory environments).' },
    { slug: 'ldap', name: 'LDAP', category: 'security', description: 'LDAP fundamentals and directory services concepts.' },
    { slug: 'secrets', name: 'Secrets Management', category: 'security', description: 'Secure handling of secrets, keys, and credentials.' },
    { slug: 'vault', name: 'Vault', category: 'security', description: 'HashiCorp Vault and secrets management practices.' },
    { slug: 'devsecops', name: 'DevSecOps', category: 'security', description: 'Security automation in CI/CD and infrastructure workflows.' },
    { slug: 'vuln-management', name: 'Vulnerability Management', category: 'security', description: 'Scanning, prioritization, patching, and remediation workflows.' },
    { slug: 'scanners', name: 'Scanners', category: 'security', description: 'Vulnerability scanners and security testing tools.' },

    // Security tooling (SAST/SCA/IaC/SBOM)
    { slug: 'sast', name: 'SAST', category: 'security', description: 'Static application security testing (code scanning).' },
    { slug: 'sca', name: 'SCA', category: 'security', description: 'Software composition analysis (dependency vulnerability scanning).' },
    { slug: 'iac-security', name: 'IaC Security', category: 'security', description: 'Security scanning for Terraform/Kubernetes/IaC patterns.' },
    { slug: 'sbom', name: 'SBOM', category: 'security', description: 'Software bill of materials concepts and tooling.' },
    { slug: 'semgrep', name: 'Semgrep', category: 'security', description: 'SAST tool for code scanning and secure coding checks.' },
    { slug: 'checkov', name: 'Checkov', category: 'security', description: 'IaC security scanner for Terraform/Kubernetes and more.' },
    { slug: 'tfsec', name: 'tfsec', category: 'security', description: 'Terraform security scanner (static analysis).' },
    { slug: 'syft', name: 'Syft', category: 'security', description: 'SBOM generator for containers and filesystems.' },
    { slug: 'grype', name: 'Grype', category: 'security', description: 'Vulnerability scanner that works well with SBOMs.' },

    // OS hardening tooling
    { slug: 'lynis', name: 'Lynis', category: 'security', description: 'Linux security auditing and hardening suggestions.' },
    { slug: 'openscap', name: 'OpenSCAP', category: 'security', description: 'SCAP-based compliance scanning for Linux systems.' },
    { slug: 'patching', name: 'Patching', category: 'security', description: 'Patch management strategies and operational practice.' },

    // Vulnerability/advisory sources (for vuln management + patch prioritization)
    { slug: 'cve', name: 'CVE', category: 'security', description: 'Common Vulnerabilities and Exposures identifiers and program resources.' },
    { slug: 'nvd', name: 'NVD', category: 'security', description: 'NIST National Vulnerability Database: CVEs, CVSS, CWE/CPE references.' },
    { slug: 'kev', name: 'KEV', category: 'security', description: 'Known Exploited Vulnerabilities catalog sources (prioritization signal).' },
    { slug: 'osv', name: 'OSV', category: 'security', description: 'Open Source Vulnerabilities data format and ecosystem (API-backed).' },
    { slug: 'msrc', name: 'MSRC', category: 'security', description: 'Microsoft Security Response Center advisories and update guidance.' },
    { slug: 'advisories', name: 'Advisories', category: 'security', description: 'Security advisories, bulletins, disclosure and patch information.' },

    // Labs
    { slug: 'ad-labs', name: 'AD Labs', category: 'security', description: 'Hands-on Active Directory lab environments and practice resources.' },
  ];

  const resources = [
    // Official docs
    {
      title: 'MDN Web Docs',
      description: 'The go-to reference for HTML/CSS/JS and web APIs.',
      kind: 'documentation',
      level: 'all',
      url: 'https://developer.mozilla.org/',
      tags: ['html', 'css', 'javascript', 'api'],
    },

    {
      title: 'MDN Learn Web Development',
      description: 'Structured learning area for HTML, CSS, and JavaScript fundamentals.',
      kind: 'course',
      level: 'beginner',
      url: 'https://developer.mozilla.org/en-US/docs/Learn',
      tags: ['html', 'css', 'javascript'],
    },

    {
      title: 'HTML Living Standard (WHATWG)',
      description: 'The HTML standard (authoritative spec).',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://html.spec.whatwg.org/',
      tags: ['html'],
    },

    {
      title: 'CSS Specifications (W3C)',
      description: 'Index of CSS specifications and modules.',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://www.w3.org/Style/CSS/specs.en.html',
      tags: ['css'],
    },
    {
      title: 'React Documentation',
      description: 'Official React docs with guides and API reference.',
      kind: 'documentation',
      level: 'all',
      url: 'https://react.dev/',
      tags: ['react', 'javascript'],
    },
    {
      title: 'Node.js Documentation',
      description: 'Official Node.js API reference and guides.',
      kind: 'documentation',
      level: 'all',
      url: 'https://nodejs.org/en/docs',
      tags: ['nodejs', 'javascript'],
    },
    {
      title: 'Express Documentation',
      description: 'Official Express docs for building web APIs in Node.',
      kind: 'documentation',
      level: 'all',
      url: 'https://expressjs.com/',
      tags: ['express', 'nodejs', 'api'],
    },
    {
      title: 'MongoDB Manual',
      description: 'Official MongoDB manual: CRUD, indexes, aggregation.',
      kind: 'documentation',
      level: 'all',
      url: 'https://www.mongodb.com/docs/manual/',
      tags: ['mongodb', 'database'],
    },
    {
      title: 'TypeScript Handbook',
      description: 'Official TypeScript handbook and reference.',
      kind: 'documentation',
      level: 'all',
      url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
      tags: ['typescript', 'javascript'],
    },

    {
      title: 'Vite Documentation',
      description: 'Fast build tool and dev server for modern web projects.',
      kind: 'documentation',
      level: 'all',
      url: 'https://vite.dev/guide/',
      tags: ['javascript', 'typescript'],
    },

    {
      title: 'Next.js Documentation',
      description: 'React framework documentation (routing, data fetching, deployment).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://nextjs.org/docs',
      tags: ['react', 'javascript', 'typescript'],
    },

    {
      title: 'React Router Documentation',
      description: 'Routing for React applications.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://reactrouter.com/en/main',
      tags: ['react', 'javascript'],
    },

    {
      title: 'JavaScript.info',
      description: 'Modern JavaScript tutorial from basics to advanced topics.',
      kind: 'course',
      level: 'beginner',
      url: 'https://javascript.info/',
      tags: ['javascript'],
    },

    {
      title: 'Eloquent JavaScript (Online Book)',
      description: 'Free online book covering JavaScript fundamentals and functional patterns.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://eloquentjavascript.net/',
      tags: ['javascript'],
    },

    {
      title: 'You Don\'t Know JS Yet (Book Series)',
      description: 'Deep dive into JavaScript concepts (open-source).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://github.com/getify/You-Dont-Know-JS',
      tags: ['javascript'],
    },

    {
      title: 'ESLint Documentation',
      description: 'Linting for JavaScript/TypeScript with rules and best practices.',
      kind: 'documentation',
      level: 'all',
      url: 'https://eslint.org/docs/latest/',
      tags: ['javascript', 'typescript'],
    },

    {
      title: 'Prettier Documentation',
      description: 'Opinionated code formatter for consistent code style.',
      kind: 'documentation',
      level: 'all',
      url: 'https://prettier.io/docs/en/',
      tags: ['javascript', 'typescript'],
    },

    {
      title: 'web.dev',
      description: 'Practical guidance for modern web development (performance, UX, security).',
      kind: 'documentation',
      level: 'all',
      url: 'https://web.dev/',
      tags: ['html', 'css', 'javascript', 'security'],
    },

    {
      title: 'HTTP Status Codes (MDN)',
      description: 'Quick reference for HTTP status codes and semantics.',
      kind: 'documentation',
      level: 'all',
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status',
      tags: ['api', 'networking'],
    },

    {
      title: 'Jest Documentation',
      description: 'Official Jest docs for unit/integration testing in JS.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://jestjs.io/docs/getting-started',
      tags: ['testing', 'javascript'],
    },

    {
      title: 'Playwright Documentation',
      description: 'End-to-end testing framework for modern web apps.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://playwright.dev/docs/intro',
      tags: ['testing', 'javascript'],
    },

    {
      title: 'Docker Documentation',
      description: 'Official Docker docs: images, containers, networking, compose.',
      kind: 'documentation',
      level: 'all',
      url: 'https://docs.docker.com/',
      tags: ['docker', 'devops'],
    },

    {
      title: 'Docker Compose Documentation',
      description: 'Multi-container apps with Docker Compose.',
      kind: 'documentation',
      level: 'all',
      url: 'https://docs.docker.com/compose/',
      tags: ['docker', 'devops'],
    },

    {
      title: 'Kubernetes Documentation',
      description: 'Official Kubernetes docs: concepts, tasks, and reference.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://kubernetes.io/docs/home/',
      tags: ['kubernetes', 'devops'],
    },

    {
      title: 'AWS Documentation',
      description: 'Official AWS docs and service guides.',
      kind: 'documentation',
      level: 'all',
      url: 'https://docs.aws.amazon.com/',
      tags: ['aws', 'cloud'],
    },

    {
      title: 'Microsoft Learn',
      description: 'Official Microsoft Learn platform (Azure, .NET, security, and more).',
      kind: 'course',
      level: 'all',
      url: 'https://learn.microsoft.com/',
      tags: ['azure', 'dotnet', 'career'],
    },

    {
      title: 'Google Cloud Documentation',
      description: 'Official Google Cloud docs and guides.',
      kind: 'documentation',
      level: 'all',
      url: 'https://cloud.google.com/docs',
      tags: ['gcp', 'cloud'],
    },

    {
      title: 'Python Documentation',
      description: 'Official Python docs: language reference and standard library.',
      kind: 'documentation',
      level: 'all',
      url: 'https://docs.python.org/3/',
      tags: ['python'],
    },

    {
      title: '.NET Documentation',
      description: 'Official .NET documentation and guides.',
      kind: 'documentation',
      level: 'all',
      url: 'https://learn.microsoft.com/en-us/dotnet/',
      tags: ['dotnet', 'csharp'],
    },

    {
      title: 'Java Documentation (Oracle)',
      description: 'Official Java documentation entry point (language and JVM ecosystem).',
      kind: 'documentation',
      level: 'all',
      url: 'https://docs.oracle.com/en/java/',
      tags: ['java'],
    },

    {
      title: 'System Design Primer (GitHub)',
      description: 'Popular open-source resource covering system design concepts and interviews.',
      kind: 'article',
      level: 'intermediate',
      url: 'https://github.com/donnemartin/system-design-primer',
      tags: ['system-design', 'career'],
    },

    {
      title: 'NeetCode Roadmap',
      description: 'Curated problem patterns and interview preparation guidance.',
      kind: 'practice',
      level: 'intermediate',
      url: 'https://neetcode.io/',
      tags: ['algorithms', 'data-structures', 'career'],
    },

    {
      title: 'HackerRank',
      description: 'Practice coding challenges and interview preparation.',
      kind: 'practice',
      level: 'beginner',
      url: 'https://www.hackerrank.com/',
      tags: ['career', 'algorithms'],
    },

    {
      title: 'Can I use',
      description: 'Browser support tables for modern web features.',
      kind: 'tool',
      level: 'all',
      url: 'https://caniuse.com/',
      tags: ['html', 'css', 'javascript'],
    },

    {
      title: 'Roadmap.sh',
      description: 'Role-based roadmaps (frontend/backend/devops) and learning paths.',
      kind: 'article',
      level: 'all',
      url: 'https://roadmap.sh/',
      tags: ['career', 'devops', 'frontend', 'backend'],
    },

    // High-quality learning
    {
      title: 'freeCodeCamp',
      description: 'Free interactive learning with projects and certifications.',
      kind: 'course',
      level: 'beginner',
      url: 'https://www.freecodecamp.org/',
      tags: ['html', 'css', 'javascript', 'career'],
    },
    {
      title: 'The Odin Project',
      description: 'Project-based full-stack curriculum (free).',
      kind: 'course',
      level: 'beginner',
      url: 'https://www.theodinproject.com/',
      tags: ['html', 'css', 'javascript', 'nodejs', 'git'],
    },
    {
      title: 'CS50 (Harvard) — OpenCourseWare',
      description: 'Strong foundation in computer science and problem solving.',
      kind: 'course',
      level: 'beginner',
      url: 'https://cs50.harvard.edu/x/',
      tags: ['career'],
    },

    // Practice/tools
    {
      title: 'LeetCode',
      description: 'Interview-oriented coding practice problems.',
      kind: 'practice',
      level: 'intermediate',
      url: 'https://leetcode.com/',
      tags: ['career', 'testing'],
    },
    {
      title: 'Postman',
      description: 'API testing and collaboration tool.',
      kind: 'tool',
      level: 'all',
      url: 'https://www.postman.com/',
      tags: ['api'],
    },
    {
      title: 'OWASP Top 10',
      description: 'Most critical web application security risks overview.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://owasp.org/www-project-top-ten/',
      tags: ['security'],
    },

    {
      title: 'OWASP Cheat Sheet Series',
      description: 'Practical defensive guidance for common web security topics.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://cheatsheetseries.owasp.org/',
      tags: ['security'],
    },

    {
      title: 'PortSwigger Web Security Academy',
      description: 'Hands-on labs and explanations for real web vulnerabilities.',
      kind: 'course',
      level: 'intermediate',
      url: 'https://portswigger.net/web-security',
      tags: ['security'],
    },

    {
      title: 'MongoDB University',
      description: 'Free MongoDB courses (indexes, aggregation, modeling).',
      kind: 'course',
      level: 'beginner',
      url: 'https://learn.mongodb.com/',
      tags: ['mongodb', 'database'],
    },

    {
      title: 'Mongoose Documentation',
      description: 'Mongoose ODM docs: schemas, validation, middleware, queries.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://mongoosejs.com/docs/guide.html',
      tags: ['mongodb', 'nodejs'],
    },

    {
      title: 'Express Security Best Practices',
      description: 'Express guide for hardening and production security considerations.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://expressjs.com/en/advanced/best-practice-security.html',
      tags: ['express', 'security', 'nodejs'],
    },

    {
      title: 'Node.js Best Practices (Community)',
      description: 'A large community-driven list of Node.js best practices.',
      kind: 'article',
      level: 'intermediate',
      url: 'https://github.com/goldbergyoni/nodebestpractices',
      tags: ['nodejs', 'security'],
    },

    {
      title: 'Linux Journey',
      description: 'Free Linux learning path with exercises (CLI, permissions, networking).',
      kind: 'course',
      level: 'beginner',
      url: 'https://linuxjourney.com/',
      tags: ['linux'],
    },

    {
      title: 'Regex101',
      description: 'Regex tester and debugger with helpful explanations.',
      kind: 'tool',
      level: 'all',
      url: 'https://regex101.com/',
      tags: ['tooling'],
    },

    {
      title: 'JSONPlaceholder',
      description: 'Free fake REST API for prototyping and testing clients.',
      kind: 'tool',
      level: 'all',
      url: 'https://jsonplaceholder.typicode.com/',
      tags: ['api', 'testing'],
    },

    {
      title: 'web.dev Learn',
      description: 'Guides on modern web fundamentals (performance, accessibility, security).',
      kind: 'course',
      level: 'beginner',
      url: 'https://web.dev/learn/',
      tags: ['html', 'css', 'javascript', 'security'],
    },
    {
      title: 'Git Book (Pro Git)',
      description: 'Free book on Git: basics to advanced workflows.',
      kind: 'documentation',
      level: 'all',
      url: 'https://git-scm.com/book/en/v2',
      tags: ['git', 'github'],
    },

    // Networking fundamentals
    {
      title: 'Practical Networking',
      description: 'Clear explanations of networking fundamentals (routing/switching/DNS/NAT) with diagrams.',
      kind: 'course',
      level: 'beginner',
      url: 'https://www.practicalnetworking.net/',
      tags: ['networking', 'tcpip', 'routing', 'switching', 'dns'],
    },
    {
      title: 'Cloudflare Learning Center (Networking + Security)',
      description: 'Good high-level explanations of DNS, HTTP, TLS, DDoS, and zero trust concepts.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://www.cloudflare.com/learning/',
      tags: ['networking', 'dns', 'security', 'cryptography'],
    },
    {
      title: 'IETF Datatracker',
      description: 'Track RFCs/Internet-Drafts and standards work from the IETF.',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://datatracker.ietf.org/',
      tags: ['networking', 'tcpip'],
    },
    {
      title: 'RFC Editor',
      description: 'Authoritative index of RFCs (protocol specs, best practices).',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://www.rfc-editor.org/',
      tags: ['networking', 'tcpip'],
    },
    {
      title: 'IANA Service Name and Transport Protocol Port Number Registry',
      description: 'Official registry for well-known ports and services.',
      kind: 'documentation',
      level: 'all',
      url: 'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml',
      tags: ['networking', 'tcpip'],
    },

    // Routing / switching / network OS
    {
      title: 'FRRouting (FRR) Documentation',
      description: 'Open-source routing suite supporting BGP/OSPF/IS-IS and more (great for labs).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.frrouting.org/',
      tags: ['routing', 'networking', 'linux'],
    },
    {
      title: 'BIRD Internet Routing Daemon Documentation',
      description: 'BIRD routing daemon docs (BGP/OSPF) commonly used in Linux routing labs.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://bird.network.cz/',
      tags: ['routing', 'networking', 'linux'],
    },
    {
      title: 'VyOS Documentation',
      description: 'VyOS docs: routing, firewall, VPN, and network automation-friendly configs.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.vyos.io/en/latest/',
      tags: ['vyos', 'routing', 'vpn', 'firewalls'],
    },
    {
      title: 'OpenWrt Documentation',
      description: 'OpenWrt docs: routing, firewalling, packages, and troubleshooting for routers.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://openwrt.org/docs/start',
      tags: ['openwrt', 'routing', 'firewalls', 'wireless'],
    },
    {
      title: 'MikroTik Wiki',
      description: 'RouterOS documentation and configuration guides (good for routing/firewall labs).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://help.mikrotik.com/docs/',
      tags: ['routing', 'firewalls', 'networking'],
    },

    // DNS / DHCP / VPN
    {
      title: 'BIND 9 Administrator Reference Manual',
      description: 'Authoritative DNS server documentation for BIND.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://bind9.readthedocs.io/en/latest/',
      tags: ['dns', 'linux', 'servers'],
    },
    {
      title: 'dnsmasq Documentation',
      description: 'Lightweight DNS forwarder + DHCP server commonly used in homelabs.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://thekelleys.org.uk/dnsmasq/doc.html',
      tags: ['dns', 'dhcp', 'homelab', 'linux'],
    },
    {
      title: 'WireGuard Documentation',
      description: 'Fast, modern VPN (protocol + implementation docs).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.wireguard.com/',
      tags: ['vpn', 'security', 'networking', 'linux'],
    },
    {
      title: 'OpenVPN Documentation',
      description: 'OpenVPN setup guides and reference (remote access/site-to-site).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://openvpn.net/community-resources/',
      tags: ['vpn', 'security', 'networking'],
    },
    {
      title: 'Tailscale Documentation',
      description: 'WireGuard-based mesh VPN docs (great for homelabs and remote access).',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://tailscale.com/kb',
      tags: ['vpn', 'homelab', 'networking', 'security'],
    },

    // Homelab platforms
    {
      title: 'Proxmox VE Documentation',
      description: 'Proxmox VE docs: clusters, storage, backup, networking, and virtualization.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://pve.proxmox.com/pve-docs/',
      tags: ['proxmox', 'virtualization', 'homelab', 'backup', 'storage'],
    },
    {
      title: 'TrueNAS Documentation',
      description: 'TrueNAS docs for ZFS-backed storage, shares, and apps.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.truenas.com/docs/',
      tags: ['truenas', 'storage', 'zfs', 'homelab', 'backup'],
    },
    {
      title: 'pfSense Documentation',
      description: 'pfSense docs: firewall rules, NAT, VPN, VLANs, and advanced routing.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.netgate.com/pfsense/en/latest/',
      tags: ['pfsense', 'firewalls', 'routing', 'vpn', 'homelab'],
    },
    {
      title: 'OPNsense Documentation',
      description: 'OPNsense docs: firewalling, routing, VPN, and plugins.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.opnsense.org/',
      tags: ['opnsense', 'firewalls', 'routing', 'vpn', 'homelab'],
    },
    {
      title: 'Pi-hole Documentation',
      description: 'Network-wide ad blocking via DNS; great homelab starter service.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://docs.pi-hole.net/',
      tags: ['homelab', 'dns', 'networking'],
    },
    {
      title: 'Home Assistant Documentation',
      description: 'Home automation platform docs (popular homelab workload).',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://www.home-assistant.io/docs/',
      tags: ['self-hosting', 'homelab'],
    },

    // Linux / servers fundamentals
    {
      title: 'Arch Wiki',
      description: 'High-quality Linux documentation (useful even if you don’t run Arch).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://wiki.archlinux.org/',
      tags: ['linux', 'networking', 'servers'],
    },
    {
      title: 'Debian Administrator’s Handbook',
      description: 'Free book covering Debian administration (services, updates, networking).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://debian-handbook.info/',
      tags: ['linux', 'servers', 'security'],
    },
    {
      title: 'The Linux Command Line (William Shotts)',
      description: 'Free book focused on the CLI, scripting, and core Linux concepts.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://linuxcommand.org/tlcl.php',
      tags: ['linux'],
    },
    {
      title: 'systemd Documentation',
      description: 'systemd docs: unit files, journald logging, services, timers.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.freedesktop.org/wiki/Software/systemd/',
      tags: ['linux', 'servers', 'logging'],
    },
    {
      title: 'The OpenSSH Project',
      description: 'OpenSSH docs and security notes (SSH hardening basics).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.openssh.com/',
      tags: ['linux', 'security', 'hardening'],
    },

    // Web / reverse proxies / load balancing
    {
      title: 'Nginx Documentation',
      description: 'Nginx docs: reverse proxy, TLS termination, caching, and performance.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://nginx.org/en/docs/',
      tags: ['servers', 'load-balancing', 'security'],
    },
    {
      title: 'Apache HTTP Server Documentation',
      description: 'Apache HTTP Server docs (modules, TLS, proxying).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://httpd.apache.org/docs/',
      tags: ['servers', 'security'],
    },
    {
      title: 'Caddy Documentation',
      description: 'Modern web server with automatic HTTPS; great for homelab deployments.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://caddyserver.com/docs/',
      tags: ['servers', 'self-hosting', 'security'],
    },
    {
      title: 'HAProxy Documentation',
      description: 'High-performance load balancer and reverse proxy docs.',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://www.haproxy.org/#docs',
      tags: ['load-balancing', 'servers', 'networking'],
    },
    {
      title: 'Traefik Documentation',
      description: 'Cloud-native reverse proxy, commonly used with Docker/Kubernetes.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://doc.traefik.io/traefik/',
      tags: ['load-balancing', 'docker', 'kubernetes', 'devops'],
    },
    {
      title: 'Let’s Encrypt Documentation',
      description: 'Free, automated TLS certificates (how it works + operational guidance).',
      kind: 'documentation',
      level: 'all',
      url: 'https://letsencrypt.org/docs/',
      tags: ['security', 'cryptography', 'servers'],
    },
    {
      title: 'Certbot Documentation',
      description: 'Certbot client docs for obtaining and renewing Let’s Encrypt certificates.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://certbot.eff.org/docs/',
      tags: ['security', 'servers', 'linux'],
    },

    // Monitoring / observability
    {
      title: 'Prometheus Documentation',
      description: 'Prometheus metrics, exporters, alerting, and best practices.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://prometheus.io/docs/introduction/overview/',
      tags: ['prometheus', 'monitoring', 'observability', 'devops'],
    },
    {
      title: 'Grafana Documentation',
      description: 'Grafana dashboards and alerting docs.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://grafana.com/docs/grafana/latest/',
      tags: ['grafana', 'monitoring', 'observability'],
    },
    {
      title: 'Netdata Documentation',
      description: 'Real-time metrics and monitoring agent docs (easy win for homelabs).',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://learn.netdata.cloud/',
      tags: ['monitoring', 'observability', 'homelab'],
    },

    // Automation / IaC
    {
      title: 'Ansible Documentation',
      description: 'Official Ansible docs: playbooks, inventory, roles, and modules.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.ansible.com/',
      tags: ['ansible', 'devops', 'linux'],
    },
    {
      title: 'Terraform Documentation',
      description: 'Terraform docs: providers, state, modules, workflows.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://developer.hashicorp.com/terraform/docs',
      tags: ['terraform', 'devops', 'cloud'],
    },

    // Network/security tooling
    {
      title: 'Wireshark Documentation',
      description: 'Packet capture and protocol analysis docs (essential networking skill).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.wireshark.org/docs/',
      tags: ['networking', 'security', 'tcpip'],
    },
    {
      title: 'tcpdump Manual',
      description: 'tcpdump reference for CLI packet captures and filters.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.tcpdump.org/manpages/tcpdump.1.html',
      tags: ['networking', 'linux', 'tcpip'],
    },
    {
      title: 'Nmap Reference Guide',
      description: 'Network scanner documentation and usage patterns.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://nmap.org/book/man.html',
      tags: ['networking', 'security', 'pentesting'],
    },
    {
      title: 'OWASP WebGoat',
      description: 'Deliberately insecure app for learning OWASP Top 10 hands-on.',
      kind: 'practice',
      level: 'intermediate',
      url: 'https://owasp.org/www-project-webgoat/',
      tags: ['security', 'appsec', 'ctf'],
    },
    {
      title: 'DVWA (Damn Vulnerable Web Application)',
      description: 'Local lab app for learning web vulnerabilities safely.',
      kind: 'practice',
      level: 'intermediate',
      url: 'https://github.com/digininja/DVWA',
      tags: ['security', 'appsec', 'ctf'],
    },

    // Cybersecurity frameworks + references
    {
      title: 'MITRE ATT&CK',
      description: 'Knowledge base of adversary tactics and techniques (great for blue team).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://attack.mitre.org/',
      tags: ['security', 'incident-response', 'siem'],
    },
    {
      title: 'NIST Cybersecurity Framework (CSF)',
      description: 'High-level security framework (Identify/Protect/Detect/Respond/Recover).',
      kind: 'documentation',
      level: 'all',
      url: 'https://www.nist.gov/cyberframework',
      tags: ['security', 'hardening', 'incident-response'],
    },
    {
      title: 'CIS Critical Security Controls',
      description: 'Prioritized security safeguards for organizations and homelab best practices.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.cisecurity.org/controls/cis-controls-list',
      tags: ['security', 'hardening'],
    },

    // Hands-on practice
    {
      title: 'OverTheWire Wargames',
      description: 'Classic security wargames (Bandit is a great Linux intro).',
      kind: 'practice',
      level: 'beginner',
      url: 'https://overthewire.org/wargames/',
      tags: ['ctf', 'linux', 'security'],
    },
    {
      title: 'picoCTF',
      description: 'Beginner-friendly CTF challenges (web, crypto, reversing, forensics).',
      kind: 'practice',
      level: 'beginner',
      url: 'https://picoctf.org/',
      tags: ['ctf', 'security', 'cryptography', 'forensics', 'reverse-engineering'],
    },
    {
      title: 'TryHackMe',
      description: 'Guided security labs and learning paths (web, networking, blue team).',
      kind: 'course',
      level: 'beginner',
      url: 'https://tryhackme.com/',
      tags: ['security', 'ctf', 'networking', 'pentesting'],
    },
    {
      title: 'Hack The Box',
      description: 'Hands-on pentesting and defensive practice labs.',
      kind: 'practice',
      level: 'intermediate',
      url: 'https://www.hackthebox.com/',
      tags: ['security', 'ctf', 'pentesting'],
    },

    // Defensive telemetry / IDS
    {
      title: 'Zeek Documentation',
      description: 'Network security monitoring: protocol-aware logs and scripting.',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://docs.zeek.org/en/current/',
      tags: ['security', 'ids', 'network-security', 'networking'],
    },
    {
      title: 'Suricata Documentation',
      description: 'IDS/IPS/NSM engine docs (signatures, outputs, tuning).',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://suricata.readthedocs.io/en/latest/',
      tags: ['security', 'ids', 'network-security'],
    },
    {
      title: 'Wazuh Documentation',
      description: 'Open-source security platform (SIEM + endpoint visibility) for labs and small orgs.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://documentation.wazuh.com/current/',
      tags: ['security', 'siem', 'logging', 'incident-response'],
    },
    {
      title: 'osquery Documentation',
      description: 'Query OS state using SQL (great for fleet visibility and IR).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://osquery.io/',
      tags: ['security', 'incident-response', 'forensics', 'hardening'],
    },

    // Dev + security mindset
    {
      title: 'OWASP Application Security Verification Standard (ASVS)',
      description: 'A structured checklist for app security requirements and verification.',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://owasp.org/www-project-application-security-verification-standard/',
      tags: ['security', 'appsec'],
    },
    {
      title: 'OWASP Juice Shop',
      description: 'Modern intentionally insecure web app for training and awareness.',
      kind: 'practice',
      level: 'intermediate',
      url: 'https://owasp.org/www-project-juice-shop/',
      tags: ['security', 'appsec', 'ctf'],
    },

    // Self-hosting / homelab apps
    {
      title: 'Awesome Selfhosted',
      description: 'Massive curated list of self-hosted services and software.',
      kind: 'article',
      level: 'all',
      url: 'https://github.com/awesome-selfhosted/awesome-selfhosted',
      tags: ['self-hosting', 'homelab', 'devops'],
    },
    {
      title: 'Nextcloud Documentation',
      description: 'Self-hosted file sync and collaboration platform docs.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.nextcloud.com/',
      tags: ['self-hosting', 'homelab', 'linux', 'servers'],
    },
    {
      title: 'Jellyfin Documentation',
      description: 'Open-source media server documentation (great homelab workload).',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://jellyfin.org/docs/',
      tags: ['self-hosting', 'homelab'],
    },
    {
      title: 'Syncthing Documentation',
      description: 'Peer-to-peer file synchronization docs (simple, reliable homelab service).',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://docs.syncthing.net/',
      tags: ['self-hosting', 'homelab', 'security'],
    },
    {
      title: 'Vaultwarden (Bitwarden compatible) Wiki',
      description: 'Self-hosted password manager backend for Bitwarden clients.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://github.com/dani-garcia/vaultwarden/wiki',
      tags: ['self-hosting', 'homelab', 'security', 'iam'],
    },
    {
      title: 'Keycloak Documentation',
      description: 'Open-source identity and access management (OIDC/SAML) docs.',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://www.keycloak.org/documentation',
      tags: ['iam', 'security', 'self-hosting'],
    },
    {
      title: 'Authentik Documentation',
      description: 'Self-hosted identity provider docs (SSO, OIDC/SAML) for homelabs.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.goauthentik.io/',
      tags: ['iam', 'security', 'self-hosting', 'homelab'],
    },

    // Linux networking + firewalling
    {
      title: 'iproute2 Documentation',
      description: 'Modern Linux networking tools (ip, tc) reference and guidance.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://wiki.linuxfoundation.org/networking/iproute2',
      tags: ['linux', 'networking', 'tcpip', 'routing'],
    },
    {
      title: 'nftables Wiki',
      description: 'Modern Linux packet filtering framework (successor to iptables).',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://wiki.nftables.org/wiki-nftables/index.php/Main_Page',
      tags: ['linux', 'security', 'firewalls', 'network-security'],
    },
    {
      title: 'UFW Documentation (Ubuntu)',
      description: 'Uncomplicated Firewall docs for basic Linux firewall configuration.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://help.ubuntu.com/community/UFW',
      tags: ['linux', 'security', 'firewalls', 'hardening'],
    },
    {
      title: 'fail2ban Documentation',
      description: 'Ban abusive IPs based on log patterns (SSH/web) — great baseline hardening.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://github.com/fail2ban/fail2ban',
      tags: ['linux', 'security', 'hardening', 'logging'],
    },

    // Docker / containers (expanded)
    {
      title: 'OCI Runtime Specification',
      description: 'Open Container Initiative runtime spec (container fundamentals).',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://github.com/opencontainers/runtime-spec',
      tags: ['containers', 'devops'],
    },
    {
      title: 'Kubernetes Networking Concepts',
      description: 'Understanding Services, Ingress, CNI, and traffic routing inside clusters.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://kubernetes.io/docs/concepts/cluster-administration/networking/',
      tags: ['kubernetes', 'networking', 'devops'],
    },

    // Web servers / reverse proxy
    {
      title: 'Nginx Documentation (Official)',
      description: 'Official Nginx docs (core reference).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://nginx.org/en/docs/',
      tags: ['nginx', 'servers', 'load-balancing', 'security'],
    },
    {
      title: 'Nginx Proxy Manager Documentation',
      description: 'Beginner-friendly UI for reverse proxying services in a homelab.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://nginxproxymanager.com/guide/',
      tags: ['self-hosting', 'homelab', 'nginx', 'security'],
    },
    {
      title: 'Apache HTTP Server Documentation (Official)',
      description: 'Official Apache HTTP Server docs (modules and configuration).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://httpd.apache.org/docs/',
      tags: ['apache', 'servers', 'security'],
    },

    // Databases / messaging
    {
      title: 'PostgreSQL Documentation',
      description: 'Official PostgreSQL docs: SQL, indexing, replication, and ops.',
      kind: 'documentation',
      level: 'all',
      url: 'https://www.postgresql.org/docs/',
      tags: ['postgresql', 'database', 'backend'],
    },
    {
      title: 'Redis Documentation',
      description: 'Official Redis docs: data structures, persistence, replication, and security.',
      kind: 'documentation',
      level: 'all',
      url: 'https://redis.io/docs/latest/',
      tags: ['redis', 'backend', 'security'],
    },

    // Windows / AD
    {
      title: 'Microsoft Windows Server Documentation',
      description: 'Official docs for Windows Server roles, management, and best practices.',
      kind: 'documentation',
      level: 'all',
      url: 'https://learn.microsoft.com/en-us/windows-server/',
      tags: ['windows-server', 'servers'],
    },
    {
      title: 'Active Directory Domain Services Documentation',
      description: 'AD DS concepts, deployment, and administration docs.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview',
      tags: ['active-directory', 'windows-server', 'iam', 'security'],
    },
    {
      title: 'PowerShell Documentation',
      description: 'Official PowerShell docs and conceptual guides.',
      kind: 'documentation',
      level: 'all',
      url: 'https://learn.microsoft.com/en-us/powershell/',
      tags: ['powershell', 'windows', 'tooling'],
    },

    // Blue team / detection engineering
    {
      title: 'Sigma HQ (Detection Rules)',
      description: 'Community-maintained Sigma detection rules repository.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://github.com/SigmaHQ/sigma',
      tags: ['sigma', 'security', 'blue-team', 'siem'],
    },
    {
      title: 'YARA Documentation',
      description: 'YARA rules reference (malware analysis + hunting).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://yara.readthedocs.io/en/stable/',
      tags: ['yara', 'security', 'malware', 'forensics'],
    },
    {
      title: 'Elastic Security Documentation',
      description: 'Elastic security platform docs (SIEM, detection rules, data sources).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.elastic.co/guide/en/security/current/index.html',
      tags: ['elastic', 'siem', 'security', 'logging'],
    },
    {
      title: 'Splunk Documentation',
      description: 'Splunk docs: searching, SPL, dashboards, and admin basics.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.splunk.com/Documentation',
      tags: ['splunk', 'siem', 'security', 'logging'],
    },

    // Red team / offensive references
    {
      title: 'Kali Linux Documentation',
      description: 'Kali docs and tooling references for lab environments.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.kali.org/docs/',
      tags: ['kali', 'security', 'red-team', 'pentesting'],
    },
    {
      title: 'Metasploit Unleashed',
      description: 'Free Metasploit training resource (older but still useful concepts).',
      kind: 'course',
      level: 'intermediate',
      url: 'https://www.offsec.com/metasploit-unleashed/',
      tags: ['pentesting', 'security', 'red-team'],
    },

    // Programming ecosystems
    {
      title: 'Go Documentation',
      description: 'Official Go docs and standard library reference.',
      kind: 'documentation',
      level: 'all',
      url: 'https://go.dev/doc/',
      tags: ['go'],
    },
    {
      title: 'The Go Blog',
      description: 'Deep dives and announcements from the Go team.',
      kind: 'article',
      level: 'intermediate',
      url: 'https://go.dev/blog/',
      tags: ['go'],
    },
    {
      title: 'The Rust Book',
      description: 'Official Rust book: ownership, borrowing, lifetimes, concurrency.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://doc.rust-lang.org/book/',
      tags: ['rust'],
    },
    {
      title: 'Bash Guide for Beginners',
      description: 'A practical introduction to Bash scripting and shell fundamentals.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://tldp.org/LDP/Bash-Beginners-Guide/html/',
      tags: ['bash', 'linux', 'tooling'],
    },

    // Vendor docs (networking + security)
    {
      title: 'Cisco Documentation (Home)',
      description: 'Cisco product documentation landing page (routing/switching/wireless/security).',
      kind: 'documentation',
      level: 'all',
      url: 'https://www.cisco.com/c/en/us/support/index.html',
      tags: ['cisco', 'networking', 'routing', 'switching', 'wireless', 'security'],
    },
    {
      title: 'Cisco DevNet',
      description: 'Cisco developer docs and labs (network automation, APIs, tooling).',
      kind: 'course',
      level: 'intermediate',
      url: 'https://developer.cisco.com/',
      tags: ['cisco', 'networking', 'devops', 'api', 'ansible'],
    },
    {
      title: 'Juniper TechLibrary (Documentation)',
      description: 'Juniper official documentation portal for Junos and platforms.',
      kind: 'documentation',
      level: 'all',
      url: 'https://www.juniper.net/documentation/',
      tags: ['juniper', 'networking', 'routing', 'switching'],
    },
    {
      title: 'Juniper Day One Books',
      description: 'Practical Juniper guides (excellent for routing/switching/security labs).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.juniper.net/documentation/jnbooks/en_US/day-one-books/',
      tags: ['juniper', 'networking', 'routing', 'switching', 'security'],
    },
    {
      title: 'Arista EOS Central (Documentation)',
      description: 'Arista EOS documentation portal (routing/switching, automation, features).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.arista.com/en/support/product-documentation',
      tags: ['arista', 'networking', 'routing', 'switching'],
    },
    {
      title: 'Fortinet Documentation Library',
      description: 'Official Fortinet docs (FortiGate, FortiManager, FortiAnalyzer, etc.).',
      kind: 'documentation',
      level: 'all',
      url: 'https://docs.fortinet.com/',
      tags: ['fortinet', 'security', 'firewalls', 'vpn', 'network-security'],
    },
    {
      title: 'Palo Alto Networks Documentation Portal',
      description: 'Official Palo Alto Networks documentation for PAN‑OS and platform products.',
      kind: 'documentation',
      level: 'all',
      url: 'https://docs.paloaltonetworks.com/',
      tags: ['paloalto', 'security', 'firewalls', 'vpn', 'network-security'],
    },
    {
      title: 'Ubiquiti Help Center',
      description: 'Official Ubiquiti help articles for networking and Wi‑Fi products.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://help.ui.com/',
      tags: ['ubiquiti', 'unifi', 'wireless', 'networking', 'homelab'],
    },
    {
      title: 'HPE Aruba Networking Support Portal',
      description: 'Aruba switching/wireless docs and resources (official entry point).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.arubanetworks.com/support-services/support-center/',
      tags: ['aruba', 'switching', 'wireless', 'networking'],
    },
    {
      title: 'VMware vSphere Documentation',
      description: 'Official vSphere/vCenter docs (virtualization fundamentals and operations).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.vmware.com/en/VMware-vSphere/index.html',
      tags: ['vmware', 'virtualization', 'servers', 'storage', 'networking'],
    },
    {
      title: 'Synology Knowledge Center',
      description: 'Synology official documentation and guides for DSM and NAS administration.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://kb.synology.com/',
      tags: ['synology', 'storage', 'backup', 'homelab', 'self-hosting'],
    },

    // Lab tooling (emulation / simulation)
    {
      title: 'GNS3 Documentation',
      description: 'Official GNS3 docs for network emulation labs.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.gns3.com/',
      tags: ['labs', 'gns3', 'networking', 'routing', 'switching'],
    },
    {
      title: 'EVE-NG Documentation',
      description: 'EVE-NG docs for building virtual network labs.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.eve-ng.net/index.php/documentation/',
      tags: ['labs', 'eve-ng', 'networking', 'routing', 'switching'],
    },
    {
      title: 'Cisco Packet Tracer Resources',
      description: 'Packet Tracer downloads/resources (Cisco Networking Academy).',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://www.netacad.com/courses/packet-tracer',
      tags: ['labs', 'packet-tracer', 'cisco', 'ccna', 'networking'],
    },
    {
      title: 'Cisco Modeling Labs (CML)',
      description: 'Cisco Modeling Labs product page and docs entry point for simulation-based labs.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.cisco.com/c/en/us/products/cloud-systems-management/modeling-labs/index.html',
      tags: ['labs', 'cml', 'cisco', 'networking', 'routing'],
    },

    // Certification roadmaps (vendor + vendor-neutral)
    {
      title: 'Cisco Certifications',
      description: 'Official Cisco certification program overview and exam listings (CCNA/CCNP/etc.).',
      kind: 'documentation',
      level: 'all',
      url: 'https://www.cisco.com/c/en/us/training-events/training-certifications/certifications.html',
      tags: ['certifications', 'cisco', 'ccna', 'ccnp', 'career'],
    },
    {
      title: 'Cisco CCNA (200-301) Exam Topics',
      description: 'Official CCNA exam topics outline (use to build a study plan).',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://learningnetwork.cisco.com/s/ccna-exam-topics',
      tags: ['certifications', 'ccna', 'cisco', 'networking', 'routing', 'switching'],
    },
    {
      title: 'Juniper Certification Program (JNCIA/JNCIS)',
      description: 'Official Juniper certification program overview and exam details.',
      kind: 'documentation',
      level: 'all',
      url: 'https://www.juniper.net/us/en/training/certification.html',
      tags: ['certifications', 'juniper', 'jncia', 'jncis', 'career'],
    },
    {
      title: 'Fortinet Training Institute',
      description: 'Official Fortinet training and certification resources (NSE program content).',
      kind: 'course',
      level: 'all',
      url: 'https://training.fortinet.com/',
      tags: ['certifications', 'fortinet', 'nse', 'security', 'firewalls'],
    },
    {
      title: 'Palo Alto Networks Certification Program',
      description: 'Official Palo Alto Networks certification program overview (PCNSE and more).',
      kind: 'documentation',
      level: 'all',
      url: 'https://www.paloaltonetworks.com/services/education/certification',
      tags: ['certifications', 'paloalto', 'pcnse', 'security', 'firewalls'],
    },
    {
      title: 'CompTIA Network+ (N10) Certification',
      description: 'Official Network+ certification overview and exam details.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://www.comptia.org/certifications/network',
      tags: ['certifications', 'networkplus', 'networking', 'career'],
    },
    {
      title: 'CompTIA Security+ Certification',
      description: 'Official Security+ certification overview and exam details.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://www.comptia.org/certifications/security',
      tags: ['certifications', 'securityplus', 'security', 'career'],
    },
    {
      title: 'CompTIA Linux+ Certification',
      description: 'Official Linux+ certification overview and exam details.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://www.comptia.org/certifications/linux',
      tags: ['certifications', 'linuxplus', 'linux', 'career'],
    },

    // Vendor deep links (routing/switching/security)
    {
      title: 'Cisco IOS XE Configuration Guides',
      description: 'Cisco IOS XE configuration guides (routing/switching/security features).',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://www.cisco.com/c/en/us/support/ios-nx-os-software/ios-xe-17/products-installation-and-configuration-guides-list.html',
      tags: ['cisco', 'routing', 'switching', 'networking'],
    },
    {
      title: 'Juniper Junos OS Documentation',
      description: 'Junos OS docs entry point (routing policy, security, interfaces, protocols).',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://www.juniper.net/documentation/product/en_US/junos-os',
      tags: ['juniper', 'routing', 'switching', 'networking'],
    },
    {
      title: 'FortiGate Administration Guides (Fortinet Docs)',
      description: 'FortiGate docs landing area for admin guides and feature references.',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://docs.fortinet.com/product/fortigate',
      tags: ['fortinet', 'firewalls', 'vpn', 'security', 'network-security'],
    },
    {
      title: 'PAN-OS Administrator’s Guide (Palo Alto Networks)',
      description: 'PAN-OS admin guide entry point for firewall policy, routing, VPN, and security features.',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://docs.paloaltonetworks.com/pan-os',
      tags: ['paloalto', 'firewalls', 'vpn', 'security', 'network-security'],
    },

    // Blue-team lab platforms + endpoint visibility
    {
      title: 'Security Onion Documentation',
      description: 'NSM/SOC platform docs (Zeek, Suricata, Elastic) commonly used in homelab security monitoring.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.securityonion.net/',
      tags: ['security-onion', 'security', 'ids', 'siem', 'logging', 'networking', 'blue-team'],
    },
    {
      title: 'Velociraptor Documentation',
      description: 'Endpoint visibility and DFIR platform docs for incident response and threat hunting.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.velociraptor.app/',
      tags: ['velociraptor', 'security', 'incident-response', 'forensics', 'edr', 'blue-team'],
    },
    {
      title: 'Sysmon (Sysinternals) Documentation',
      description: 'Sysmon reference for high-signal Windows telemetry useful for detections and investigations.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon',
      tags: ['sysmon', 'windows', 'security', 'blue-team', 'logging'],
    },
    {
      title: 'Microsoft Defender for Endpoint Documentation',
      description: 'Defender for Endpoint docs: onboarding, investigations, hunting, and response.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://learn.microsoft.com/en-us/defender-endpoint/',
      tags: ['defender', 'security', 'edr', 'incident-response', 'windows'],
    },
    {
      title: 'Microsoft Sentinel Documentation',
      description: 'Sentinel SIEM/SOAR docs: data connectors, analytics rules, workbooks, and playbooks.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://learn.microsoft.com/en-us/azure/sentinel/',
      tags: ['sentinel', 'security', 'siem', 'logging', 'incident-response', 'azure'],
    },
    {
      title: 'TheHive Project Documentation',
      description: 'Incident response case management docs (triage, cases, tasks, observables).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.thehive-project.org/',
      tags: ['thehive', 'security', 'incident-response', 'soc'],
    },
    {
      title: 'MISP Documentation',
      description: 'Threat intelligence sharing platform docs (events, attributes, feeds, correlations).',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://www.misp-project.org/documentation/',
      tags: ['misp', 'security', 'incident-response', 'soc', 'stix-taxii'],
    },

    // Hardening baselines + standards
    {
      title: 'CIS Benchmarks',
      description: 'Secure configuration benchmarks for OS and services (hardening baselines).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.cisecurity.org/cis-benchmarks',
      tags: ['cis-benchmarks', 'security', 'hardening', 'linux', 'windows'],
    },
    {
      title: 'DISA STIGs',
      description: 'Security Technical Implementation Guides for hardening (useful for learning baselines).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://public.cyber.mil/stigs/',
      tags: ['stigs', 'security', 'hardening'],
    },
    {
      title: 'NIST SP 800-61 (Computer Security Incident Handling Guide)',
      description: 'A foundational incident response lifecycle guide.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final',
      tags: ['nist', 'security', 'incident-response', 'soc'],
    },
    {
      title: 'NIST SP 800-53 (Security and Privacy Controls)',
      description: 'Comprehensive catalog of controls used for governance and security programs.',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final',
      tags: ['nist', 'security', 'hardening'],
    },

    // Vendor security best-practices entry points
    {
      title: 'Cisco Security Best Practices (Product Security)',
      description: 'Cisco security guidance hub (PSIRT, advisories, and best-practice resources).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.cisco.com/c/en/us/products/security.html',
      tags: ['cisco', 'security', 'network-security', 'hardening'],
    },
    {
      title: 'Juniper Security Documentation (SRX and security topics)',
      description: 'Juniper security docs entry point for firewalling/VPN/security operations topics.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.juniper.net/documentation/product/us/en/security',
      tags: ['juniper', 'security', 'firewalls', 'vpn', 'hardening'],
    },
    {
      title: 'Fortinet Best Practices (FortiGate)',
      description: 'Fortinet guidance and documentation hub for FortiGate best practices and hardening.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.fortinet.com/',
      tags: ['fortinet', 'security', 'firewalls', 'hardening', 'vpn'],
    },
    {
      title: 'Palo Alto Networks Best Practices (Documentation Portal)',
      description: 'Entry point for Palo Alto Networks security docs and guidance (hardening, operations).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.paloaltonetworks.com/',
      tags: ['paloalto', 'security', 'firewalls', 'hardening', 'vpn'],
    },

    // PKI / TLS / crypto operations
    {
      title: 'OpenSSL Documentation',
      description: 'OpenSSL project docs (TLS tooling, certificates, crypto primitives).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.openssl.org/docs/',
      tags: ['security', 'cryptography', 'tls', 'pki', 'linux'],
    },
    {
      title: 'Mozilla SSL Configuration Generator',
      description: 'Generate sane TLS configurations for popular servers (great practical baseline).',
      kind: 'tool',
      level: 'all',
      url: 'https://ssl-config.mozilla.org/',
      tags: ['tls', 'security', 'hardening', 'servers'],
    },
    {
      title: 'Let’s Encrypt — ACME Protocol (Docs)',
      description: 'How certificate issuance and renewal works using ACME.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://letsencrypt.org/docs/',
      tags: ['pki', 'tls', 'security', 'servers'],
    },
    {
      title: 'Smallstep Documentation (step-ca)',
      description: 'Modern certificate authority tooling for internal PKI (great for homelabs).',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://smallstep.com/docs/',
      tags: ['pki', 'tls', 'security', 'homelab', 'self-hosting'],
    },

    // Identity / AD security (defense + learning)
    {
      title: 'Microsoft Security Baselines',
      description: 'Recommended security baseline settings for Windows and Microsoft products.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://learn.microsoft.com/en-us/windows/security/threat-protection/windows-security-configuration-framework/windows-security-baselines',
      tags: ['windows', 'security', 'hardening', 'active-directory'],
    },
    {
      title: 'MITRE D3FEND',
      description: 'Defensive countermeasure knowledge base mapped to adversary techniques.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://d3fend.mitre.org/',
      tags: ['security', 'blue-team', 'incident-response'],
    },

    // DevSecOps + scanning tools
    {
      title: 'OWASP Dependency-Check',
      description: 'Detect known vulnerabilities in application dependencies (SCA).',
      kind: 'tool',
      level: 'intermediate',
      url: 'https://owasp.org/www-project-dependency-check/',
      tags: ['security', 'devsecops', 'vuln-management'],
    },
    {
      title: 'Trivy (Vulnerability Scanner)',
      description: 'Scanner for containers, SBOMs, and IaC; great for CI and homelab builds.',
      kind: 'tool',
      level: 'intermediate',
      url: 'https://aquasecurity.github.io/trivy/',
      tags: ['security', 'devsecops', 'scanners', 'containers', 'docker'],
    },
    {
      title: 'OWASP ZAP',
      description: 'Web app security scanner and proxy for testing (safe, common baseline tool).',
      kind: 'tool',
      level: 'intermediate',
      url: 'https://www.zaproxy.org/',
      tags: ['security', 'appsec', 'pentesting', 'scanners'],
    },

    // Cloud security foundations
    {
      title: 'AWS Well-Architected Framework — Security Pillar',
      description: 'Practical guidance for designing secure workloads on AWS.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html',
      tags: ['aws', 'cloud', 'security', 'devsecops'],
    },
    {
      title: 'Azure Security Benchmark',
      description: 'Microsoft guidance for security controls and best practices in Azure.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://learn.microsoft.com/en-us/security/benchmark/azure/overview',
      tags: ['azure', 'cloud', 'security', 'hardening'],
    },
    {
      title: 'Google Cloud Security Foundations Guide',
      description: 'Guidance for building secure foundations and guardrails on GCP.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://cloud.google.com/architecture/security-foundations',
      tags: ['gcp', 'cloud', 'security', 'hardening'],
    },

    // Active Directory / Kerberos learning (defensive + fundamentals)
    {
      title: 'Kerberos Authentication Overview (Microsoft Learn)',
      description: 'Conceptual overview of Kerberos authentication (useful for AD troubleshooting and security).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview',
      tags: ['kerberos', 'active-directory', 'windows-server', 'security'],
    },
    {
      title: 'Active Directory Security Best Practices (Microsoft)',
      description: 'Guidance for securing Active Directory and identity infrastructure.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/best-practices-for-securing-active-directory',
      tags: ['active-directory', 'security', 'hardening', 'windows-server', 'iam'],
    },
    {
      title: 'Microsoft Security — Identity (Concepts and guidance)',
      description: 'Identity security guidance across Microsoft’s security ecosystem.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://learn.microsoft.com/en-us/security/identity-protection/',
      tags: ['iam', 'security', 'active-directory', 'defender'],
    },

    // Active Directory labs + assessment tooling (hands-on)
    {
      title: 'PingCastle (Active Directory Security Assessment)',
      description: 'AD security assessment and reporting tool; useful for baseline checks and learning common AD weaknesses.',
      kind: 'tool',
      level: 'intermediate',
      url: 'https://www.pingcastle.com/',
      tags: ['active-directory', 'security', 'hardening', 'iam', 'ad-labs'],
    },
    {
      title: 'GOAD (Game Of Active Directory) Documentation',
      description: 'Vulnerable Active Directory lab environment for practicing common AD attack/defense techniques (use only in isolated labs).',
      kind: 'labs',
      level: 'advanced',
      url: 'https://orange-cyberdefense.github.io/GOAD/',
      tags: ['active-directory', 'security', 'kerberos', 'ad-labs', 'labs'],
    },
    {
      title: 'BadBlood (Populate a Test Active Directory Domain)',
      description: 'PowerShell tooling to generate realistic AD objects and relationships for security testing and detection practice.',
      kind: 'tool',
      level: 'advanced',
      url: 'https://github.com/davidprowe/BadBlood',
      tags: ['active-directory', 'security', 'powershell', 'ad-labs', 'labs'],
    },

    // Vulnerability management / advisories (prioritization + patch workflow)
    {
      title: 'CVE Program (CVE.org)',
      description: 'CVE program home: background, record lifecycle, and resources for understanding CVE IDs and records.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://www.cve.org/',
      tags: ['cve', 'security', 'vuln-management', 'advisories'],
    },
    {
      title: 'National Vulnerability Database (NVD)',
      description: 'NIST NVD search and vulnerability details including CVSS scoring and references.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://nvd.nist.gov/',
      tags: ['nvd', 'cve', 'security', 'vuln-management', 'advisories'],
    },
    {
      title: 'CISA Known Exploited Vulnerabilities (KEV) — JSON Feed',
      description: 'Machine-readable KEV feed for prioritizing vulnerabilities with known exploitation in the wild.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
      tags: ['kev', 'security', 'vuln-management', 'patching', 'advisories'],
    },
    {
      title: 'Microsoft Security Update Guide (MSRC)',
      description: 'Microsoft’s security update portal for CVEs, patches, and product guidance.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://msrc.microsoft.com/update-guide',
      tags: ['msrc', 'windows', 'windows-server', 'security', 'patching', 'advisories'],
    },
    {
      title: 'GitHub Security Advisories (Database + browsing)',
      description: 'Browse advisories across ecosystems and vendors; useful for open-source dependency risk triage.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://github.com/advisories',
      tags: ['github', 'security', 'advisories', 'vuln-management', 'sca'],
    },
    {
      title: 'GitHub Advisory Database (Repository)',
      description: 'Open advisory database backing GitHub advisories; useful for understanding formats and contributing fixes.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://github.com/github/advisory-database',
      tags: ['github', 'security', 'advisories', 'vuln-management', 'sca'],
    },
    {
      title: 'OSV.dev (Open Source Vulnerabilities)',
      description: 'OSV UI for searching open source vulnerabilities by package/ecosystem.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://osv.dev/',
      tags: ['osv', 'security', 'advisories', 'vuln-management', 'sca'],
    },
    {
      title: 'OSV.dev Documentation (API, schema, data sources)',
      description: 'Docs for OSV APIs and data model; helpful for automating vuln triage and integrating scans.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://google.github.io/osv.dev/',
      tags: ['osv', 'security', 'advisories', 'vuln-management', 'devsecops'],
    },
    {
      title: 'Ubuntu Security Notices (USNs)',
      description: 'Ubuntu security notices and updates; useful for patch tracking in Linux fleets.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://ubuntu.com/security/notices',
      tags: ['linux', 'security', 'patching', 'advisories', 'vuln-management'],
    },
    {
      title: 'Debian Security Tracker',
      description: 'Debian’s security tracker with vulnerability status across packages and releases.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://security-tracker.debian.org/tracker/',
      tags: ['linux', 'security', 'patching', 'advisories', 'vuln-management'],
    },
    {
      title: 'endoflife.date (Support Lifecycle Tracker)',
      description: 'Tracks product end-of-life/support dates; handy for risk management and upgrade planning.',
      kind: 'documentation',
      level: 'beginner',
      url: 'https://endoflife.date/',
      tags: ['patching', 'security', 'devops'],
    },

    // Vuln scanning platforms (defensive)
    {
      title: 'Greenbone Community Edition (OpenVAS) Documentation',
      description: 'Vulnerability scanning platform docs for defensive asset discovery and patch prioritization.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://greenbone.github.io/docs/latest/',
      tags: ['vuln-management', 'scanners', 'security', 'linux'],
    },

    // SAST / SCA / IaC / SBOM tooling
    {
      title: 'Semgrep Documentation',
      description: 'SAST tooling docs for secure code scanning with rules and CI integration.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://semgrep.dev/docs/',
      tags: ['semgrep', 'sast', 'security', 'devsecops'],
    },
    {
      title: 'Checkov Documentation',
      description: 'IaC security scanning docs (Terraform, Kubernetes, cloud configs).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://www.checkov.io/1.Welcome/What%20is%20Checkov.html',
      tags: ['checkov', 'iac-security', 'security', 'devsecops', 'terraform', 'kubernetes'],
    },
    {
      title: 'tfsec Documentation',
      description: 'Terraform security scanner docs for catching common IaC misconfigurations.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://aquasecurity.github.io/tfsec/',
      tags: ['tfsec', 'iac-security', 'security', 'terraform', 'devsecops'],
    },
    {
      title: 'Syft (SBOM Generator) Documentation',
      description: 'Generate SBOMs from container images and filesystems (pairs well with vulnerability scanning).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://github.com/anchore/syft',
      tags: ['syft', 'sbom', 'security', 'containers', 'devsecops'],
    },
    {
      title: 'Grype (Vulnerability Scanner) Documentation',
      description: 'Scan container images and SBOMs for vulnerabilities (defensive baseline tooling).',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://github.com/anchore/grype',
      tags: ['grype', 'scanners', 'sbom', 'security', 'containers', 'devsecops'],
    },

    // Linux hardening tools
    {
      title: 'Lynis (Security Auditing) Documentation',
      description: 'Linux security auditing tool that suggests hardening improvements.',
      kind: 'documentation',
      level: 'intermediate',
      url: 'https://cisofy.com/lynis/',
      tags: ['lynis', 'linux', 'security', 'hardening'],
    },
    {
      title: 'OpenSCAP Documentation',
      description: 'Security compliance scanning and remediation tooling for Linux (SCAP profiles).',
      kind: 'documentation',
      level: 'advanced',
      url: 'https://www.open-scap.org/documentation/',
      tags: ['openscap', 'linux', 'security', 'hardening', 'stigs', 'cis-benchmarks'],
    },
  ];

  const tagResults = [];
  for (const t of tags) tagResults.push(await upsertTag(t));

  // Ensure resources only reference known tags
  const active = await Tag.find({ isActive: true }).select('slug');
  const allowed = new Set(active.map((t) => t.slug));
  const safeResources = resources.map((r) => ({
    ...r,
    tags: normalizeTags(r.tags).filter((t) => allowed.has(t)),
  }));

  const resourceResults = [];
  for (const r of safeResources) resourceResults.push(await upsertResourceLink(r));

  return {
    tags: tagResults,
    resources: resourceResults,
  };
};

module.exports = { seedCuratedContent };
