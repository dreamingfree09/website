const SiteContent = require('../models/SiteContent');

const DEFAULT_PATHWAYS_HTML = `
<section class="pathways-hero">
  <h2>IT Career Pathways</h2>
  <p>Explore different career paths in technology and find the right journey for you.</p>
</section>

<section class="pathways-intro">
  <p>The IT industry offers diverse career opportunities for people with different interests and skill sets. Whether you're creative, analytical, or love problem-solving, there's a path for you.</p>
</section>

<section class="pathways-grid">
  <div class="pathway-card">
    <h3>🎨 Frontend Development</h3>
    <p><strong>What you'll do:</strong> Create beautiful, interactive user interfaces that people interact with daily.</p>
    <div class="pathway-details">
      <h4>Key Skills:</h4>
      <ul>
        <li>HTML, CSS, JavaScript</li>
        <li>React, Vue, or Angular</li>
        <li>Responsive Design</li>
        <li>UI/UX Principles</li>
      </ul>
      <h4>Career Path:</h4>
      <p>Junior Developer → Frontend Developer → Senior Frontend Developer → Frontend Architect</p>
    </div>
  </div>

  <div class="pathway-card">
    <h3>⚙️ Backend Development</h3>
    <p><strong>What you'll do:</strong> Build the server-side logic, databases, and APIs that power applications.</p>
    <div class="pathway-details">
      <h4>Key Skills:</h4>
      <ul>
        <li>Node.js, Python, or Java</li>
        <li>Database Management (SQL/NoSQL)</li>
        <li>API Design</li>
        <li>Security & Authentication</li>
      </ul>
      <h4>Career Path:</h4>
      <p>Junior Developer → Backend Developer → Senior Backend Developer → Solutions Architect</p>
    </div>
  </div>

  <div class="pathway-card">
    <h3>🚀 Full Stack Development</h3>
    <p><strong>What you'll do:</strong> Work on both frontend and backend, building complete web applications.</p>
    <div class="pathway-details">
      <h4>Key Skills:</h4>
      <ul>
        <li>Frontend + Backend Technologies</li>
        <li>Database Design</li>
        <li>DevOps Basics</li>
        <li>System Architecture</li>
      </ul>
      <h4>Career Path:</h4>
      <p>Junior Full Stack → Full Stack Developer → Senior Full Stack → Tech Lead</p>
    </div>
  </div>

  <div class="pathway-card">
    <h3>☁️ DevOps Engineering</h3>
    <p><strong>What you'll do:</strong> Bridge development and operations, automating deployment and infrastructure.</p>
    <div class="pathway-details">
      <h4>Key Skills:</h4>
      <ul>
        <li>CI/CD Pipelines</li>
        <li>Docker & Kubernetes</li>
        <li>Cloud Platforms (AWS, Azure, GCP)</li>
        <li>Scripting & Automation</li>
      </ul>
      <h4>Career Path:</h4>
      <p>System Admin → DevOps Engineer → Senior DevOps → DevOps Architect</p>
    </div>
  </div>

  <div class="pathway-card">
    <h3>📊 Data Science & Analytics</h3>
    <p><strong>What you'll do:</strong> Extract insights from data and build predictive models.</p>
    <div class="pathway-details">
      <h4>Key Skills:</h4>
      <ul>
        <li>Python, R, SQL</li>
        <li>Machine Learning</li>
        <li>Data Visualization</li>
        <li>Statistics & Mathematics</li>
      </ul>
      <h4>Career Path:</h4>
      <p>Data Analyst → Data Scientist → Senior Data Scientist → Data Science Manager</p>
    </div>
  </div>

  <div class="pathway-card">
    <h3>🔐 Cybersecurity</h3>
    <p><strong>What you'll do:</strong> Protect systems, networks, and data from cyber threats.</p>
    <div class="pathway-details">
      <h4>Key Skills:</h4>
      <ul>
        <li>Network Security</li>
        <li>Penetration Testing</li>
        <li>Security Frameworks</li>
        <li>Incident Response</li>
      </ul>
      <h4>Career Path:</h4>
      <p>Security Analyst → Security Engineer → Senior Security → CISO</p>
    </div>
  </div>
</section>

<section class="getting-started">
  <h3>Getting Started</h3>
  <div class="steps">
    <div class="step">
      <h4>1. Choose Your Path</h4>
      <p>Explore the pathways above and identify what interests you most.</p>
    </div>
    <div class="step">
      <h4>2. Learn the Basics</h4>
      <p>Start with foundational skills through online courses, tutorials, and practice.</p>
    </div>
    <div class="step">
      <h4>3. Build Projects</h4>
      <p>Apply your knowledge by creating real projects for your portfolio.</p>
    </div>
    <div class="step">
      <h4>4. Join the Community</h4>
      <p>Connect with others in the Piqniq forum to share knowledge and get support.</p>
    </div>
  </div>
</section>
`.trim();

const seedSiteContent = async () => {
  const results = [];

  const existing = await SiteContent.findOne({ slug: 'pathways' }).select('_id slug');
  if (!existing) {
    const created = await SiteContent.create({ slug: 'pathways', html: DEFAULT_PATHWAYS_HTML, isActive: true });
    results.push({ slug: 'pathways', created: true, id: String(created._id) });
  } else {
    results.push({ slug: 'pathways', created: false });
  }

  return results;
};

module.exports = {
  seedSiteContent,
};
