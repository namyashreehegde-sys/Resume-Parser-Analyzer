/**
 * server/ai/constants/skillDictionary.js
 *
 * Master keyword dictionary for skill extraction and job-description matching.
 * Each category maps to an array of canonical skill names.
 * Matching is case-insensitive; stored names use the canonical casing below.
 */

const SKILL_CATEGORIES = {
  programming_language: [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C', 'C++', 'C#',
    'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'R', 'MATLAB',
    'Scala', 'Perl', 'Dart', 'Lua', 'Haskell', 'Elixir', 'Clojure',
    'F#', 'VBA', 'Shell', 'Bash', 'PowerShell', 'Assembly',
  ],
  web_technology: [
    'HTML', 'CSS', 'HTML5', 'CSS3', 'REST', 'RESTful', 'GraphQL',
    'WebSocket', 'XML', 'JSON', 'AJAX', 'SASS', 'SCSS', 'LESS',
    'Bootstrap', 'Tailwind CSS', 'Material UI', 'Chakra UI',
    'Webpack', 'Vite', 'Babel', 'OAuth', 'JWT', 'WebRTC',
  ],
  framework: [
    'React', 'Next.js', 'Angular', 'Vue', 'Vue.js', 'Svelte',
    'Express', 'Express.js', 'NestJS', 'Koa', 'Fastify',
    'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot',
    'Laravel', 'Rails', 'Ruby on Rails', 'ASP.NET', '.NET',
    'React Native', 'Flutter', 'Ionic', 'Electron',
    'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy',
  ],
  database: [
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle',
    'Cassandra', 'DynamoDB', 'Firebase', 'Firestore', 'Elasticsearch',
    'MariaDB', 'Microsoft SQL Server', 'MSSQL', 'CockroachDB',
    'Neo4j', 'Couchbase', 'InfluxDB', 'Supabase',
  ],
  tool: [
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Docker', 'Kubernetes',
    'Webpack', 'Vite', 'Babel', 'ESLint', 'Prettier', 'Postman',
    'Figma', 'Sketch', 'Adobe XD', 'JIRA', 'Confluence', 'Trello',
    'VS Code', 'IntelliJ', 'Eclipse', 'Xcode', 'Android Studio',
    'Nginx', 'Apache', 'npm', 'yarn', 'pnpm', 'pip',
    'Prometheus', 'Grafana', 'Datadog', 'Splunk',
  ],
  cloud_devops: [
    'AWS', 'Amazon Web Services', 'Azure', 'GCP', 'Google Cloud',
    'Kubernetes', 'Docker', 'CI/CD', 'Jenkins', 'GitHub Actions',
    'GitLab CI', 'CircleCI', 'Travis CI', 'Terraform', 'Ansible',
    'Puppet', 'Chef', 'Linux', 'Ubuntu', 'CentOS', 'Heroku',
    'Vercel', 'Netlify', 'DigitalOcean', 'Cloudflare',
    'S3', 'EC2', 'Lambda', 'ECS', 'EKS', 'RDS',
  ],
  soft_skill: [
    'Leadership', 'Communication', 'Teamwork', 'Problem Solving',
    'Time Management', 'Agile', 'Scrum', 'Kanban', 'Critical Thinking',
    'Collaboration', 'Adaptability', 'Creativity', 'Analytical',
    'Project Management', 'Mentoring', 'Public Speaking',
    'Detail-Oriented', 'Self-Motivated', 'Fast Learner',
  ],
};

// Flat lookup: lowercase keyword → { name, category }
const KEYWORD_LOOKUP = {};

for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
  for (const skill of skills) {
    KEYWORD_LOOKUP[skill.toLowerCase()] = { name: skill, category };
  }
}

/**
 * Look up a token and return its canonical entry, or null.
 */
function lookupSkill(token) {
  return KEYWORD_LOOKUP[token.toLowerCase()] || null;
}

// Stop words for JD keyword extraction
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','shall','should','may','might','must',
  'can','could','not','no','nor','so','yet','both','either','neither',
  'each','few','more','most','other','some','such','only','own','same',
  'than','too','very','just','because','as','until','while','about',
  'against','between','into','through','during','before','after','above',
  'below','up','down','out','off','over','under','again','further','then',
  'once','here','there','when','where','why','how','all','any','both',
  'it','its','this','that','these','those','i','we','you','he','she','they',
  'what','which','who','whom','if','else','our','your','their','my','his','her',
  'we','us','they','them','experience','work','using','use','used','role',
  'position','candidate','team','company','ability','skills','knowledge',
  'strong','good','great','excellent','understanding','looking','responsible',
  'responsibilities','required','requirements','preferred','plus','bonus',
  'years','year','including','following','also','well','able','must','need',
]);

module.exports = { SKILL_CATEGORIES, KEYWORD_LOOKUP, STOP_WORDS, lookupSkill };
