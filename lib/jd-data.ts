export interface JobDescription {
  company: string;
  position: string;
  experience: string;
  hires: number;
  salary: string;
  responsibilities: string;
  qualifications: string;
  preferred: string;
}

export const JD_MAP: Record<string, JobDescription> = {
  FPT401: {
    company: "FPT Software Korea",
    position: "Embedded Software Developer",
    experience: "Intern / 1 year",
    hires: 5,
    salary: "7M – 40M VND",
    responsibilities: `Join a 3–6 month training program in software technologies for the Automotive domain.
Learn industry-standard tools including Agile, ASPICE, and ISO 26262.
Participate in mentored projects (simulated and real).
Communicate with colleagues and clients in Korean and English.
Transition to full-time automotive software engineering role post-training.`,
    qualifications: `Bachelor's degree (or final-year student) in Computer Science, IT, Electronics, or related field.
Solid programming foundation in Java, C/C++, Python, or similar languages.
Strong teamwork and logical thinking abilities.
No prior work experience required; open to fresh graduates.`,
    preferred: `Korean language proficiency (TOPIK Level 4+).
Fresh graduates interested in automotive software careers.
Vietnamese candidates with Korean language skills and long-term career commitment.`,
  },

  SL201: {
    company: "SeedLab",
    position: "Performance & Growth Manager",
    experience: "4-5 years",
    hires: 1,
    salary: "20M – 40M VND",
    responsibilities: `Manage and optimize Amazon Ads (Sponsored Products, Brands, Display).
Build and scale campaign structures from Auto to Manual to Scaling.
Conduct keyword research and develop SEO strategies.
Analyze sales and advertising data for actionable insights.
Plan and execute pricing and promotional strategies.
Drive external traffic from Meta and Google to Amazon listings.
Set up and manage Amazon Attribution tracking.
KPIs: ROAS, ACOS, TACOS, total revenue growth, organic vs. paid sales ratio.`,
    qualifications: `4+ years hands-on Amazon PPC experience.
Proven track record driving revenue growth.
Strong analytical skills (Excel, GA, or similar tools).
Solid understanding of keyword strategy and Amazon SEO.`,
    preferred: `Experience with external traffic channels (Meta, Google).`,
  },

  SL202: {
    company: "SeedLab",
    position: "Content & Conversion Manager",
    experience: "4-5 years",
    hires: 1,
    salary: "20M – 40M VND",
    responsibilities: `Create and optimize Amazon listings (title, bullet points, descriptions).
Plan and execute A+ Content; lead product image and video direction.
Develop review and rating strategies.
Define brand positioning and product messaging.
Analyze competitor listings and content strategies.
Optimize content based on SEO and performance data.
KPIs: Conversion rate (CVR), Sales per session, CTR, Listing quality score.`,
    qualifications: `4+ years Amazon listing and content optimization experience.
Proven track record of improving conversion rates.
Strong copywriting and content planning skills.
Experience working with designers or managing creative assets.
Strong understanding of consumer behavior and buying psychology.`,
    preferred: "",
  },

  JN301: {
    company: "Jinosys",
    position: "Mobile App & Web Service Developer",
    experience: "1-2 years / All levels",
    hires: 2,
    salary: "7M – 10M VND",
    responsibilities: `Robot AI and autonomous navigation system development.
Enhancement of existing AI-powered fire detection models.
On-device AI fire detection using smartphone cameras.
IoT device and platform integration and management.
Web service development and cloud API integration.
AI data collection and model training support.`,
    qualifications: `Development skills: PHP, HTML5, CSS3, JavaScript, Android (Java/Kotlin).
AI frameworks: TensorFlow, PyTorch Mobile.
API integration experience.`,
    preferred: `Korean language proficiency (OPIc IM level).`,
  },

  NX501: {
    company: "Nexacode",
    position: "Full-stack Developer",
    experience: "1 year / Entry-level",
    hires: 2,
    salary: "18M – 20M VND",
    responsibilities: `Internal SaaS program development and external project collaboration.
Develop and maintain internal SaaS products.
Design, develop, and optimize front-end and back-end systems.
Collaborate with UI/UX designers and QA teams.
Write clean, maintainable code following best practices.
Testing, debugging, and performance optimization.
Analyze requirements and propose technical solutions.`,
    qualifications: `SaaS software development experience with at least one:
Front-End: React, Next.js development.
Back-End: Nest.js, Python development.
App: Flutter development.
Minimum 1 year of professional experience.`,
    preferred: "",
  },

  WP601: {
    company: "Wellpod",
    position: "TikTok Ads Marketing Manager",
    experience: "1-2 years",
    hires: 1,
    salary: "18M – 20M VND",
    responsibilities: `Plan and produce short-form content for TikTok Shopping (Shorts/Reels format).
Perform video editing and create promotional material for advertisements.
Identify and implement content strategies aligned with Vietnam market trends.`,
    qualifications: `Background as a TikTok or YouTube influencer.
Proficiency with video editing software like CapCut.
Experience operating e-commerce platforms such as Shopify.`,
    preferred: `Prior involvement in distribution or e-commerce sectors.`,
  },

  WP602: {
    company: "Wellpod",
    position: "TikTok Shop & Shopify Manager",
    experience: "1-2 years",
    hires: 1,
    salary: "18M – 20M VND",
    responsibilities: `Operate and manage TikTok Shop and Shopify e-commerce platforms.
Register products and configure product detail pages.
Design storefronts and create UI/UX layouts.
Manage orders, shipping, and customer support.`,
    qualifications: `Experience as a TikTok/YouTube influencer.
Proficiency in video editing tools (CapCut).
Experience managing e-commerce solutions like Shopify.`,
    preferred: `Distribution or e-commerce background.`,
  },

  MT701: {
    company: "Mutistation",
    position: "UI/UX Designer",
    experience: "3 years",
    hires: 2,
    salary: "20M – 22M VND",
    responsibilities: `Design and optimize brand website UI/UX to improve user experience and conversion.
Create wireframes, user flows, and high-fidelity designs using Figma/Adobe XD.
Improve conversion rate (CVR) through data-driven design decisions.
Ensure responsive and consistent design across web and mobile platforms.
Collaborate closely with developers to ensure accurate implementation.
Conduct user research, usability testing, and iterate designs accordingly.`,
    qualifications: `Experience designing in-house malls or D2C e-commerce platforms.
Demonstrated success improving conversion rates.
Proficiency with design tools (Figma, Adobe XD, etc.).
User-centered UX design background.`,
    preferred: "",
  },

  MT702: {
    company: "Mutistation",
    position: "Website Developer",
    experience: "3 years",
    hires: 1,
    salary: "20M – 22M VND",
    responsibilities: `Develop and maintain brand/e-commerce (D2C) websites.
Implement frontend features using React, Vue, or similar frameworks.
Build and manage backend systems (Node.js, Java, PHP, etc.).
Integrate payment gateways and third-party APIs.
Optimize website performance, speed, and scalability.
Ensure website security, stability, and smooth user experience.`,
    qualifications: `Experience developing e-commerce platforms or in-house shopping malls.
Experience integrating Payment APIs (Payment Gateways).
Frontend: React, Vue, etc.
Backend: Node.js, Java, PHP, etc.`,
    preferred: "",
  },

  AW801: {
    company: "Andwise",
    position: "Full-stack Developer",
    experience: "3 years",
    hires: 3,
    salary: "25M – 28M VND",
    responsibilities: `Maintenance and improvement of G-Works CMS.
AI service development.
Web server environment setup and management.`,
    qualifications: `Backend: Java (Spring Boot, Spring MVC, Liferay, Hibernate, RESTful API, Apache Tomcat, JBoss).
Frontend: JavaScript (jQuery), HTML, CSS, JSON, JSP.
Database: MySQL, PostgreSQL, Oracle, SQL Server.`,
    preferred: `Korean language proficiency.
English language proficiency.
Web server setup and management experience.`,
  },

  OQ901: {
    company: "ONSQUARE",
    position: "Full-stack Developer",
    experience: "5 years",
    hires: 2,
    salary: "30M – 35M VND",
    responsibilities: `In-house SaaS products and B2B workflow management tools for immigration automation.
Fintech payment platforms handling remittance, payments, and KYC processes.
AI Agent-based user tools.
Front-end: React and TypeScript web applications with responsive UI and real-time data interfaces.
Back-end: Node.js and NestJS with PostgreSQL and Redis.
AWS deployment and cross-timezone collaboration with teams in Canada, Korea, and Vietnam.`,
    qualifications: `5+ years full-stack web development experience.
Professional React and TypeScript expertise.
Node.js, NestJS, or similar back-end frameworks.
PostgreSQL data modeling and query optimization.
Git/GitHub collaboration.
AWS or equivalent cloud deployment.
Technical English documentation ability.`,
    preferred: `Fintech, B2B SaaS, or AI product development experience.
Payment system integration (Stripe, Airwallex).
LLM API integration experience.
Real-time data processing (WebSocket, SSE).
Fintech security and regulatory knowledge (KYC, AML).`,
  },

  OQ902: {
    company: "ONSQUARE",
    position: "Senior SafePay Backend Developer",
    experience: "5+ years",
    hires: 1,
    salary: "30M – 35M VND",
    responsibilities: `Design and develop international payment and remittance infrastructure.
Implement escrow payment systems with milestone-based settlements.
Build KYC/AML systems.
Integrate payment gateways (Stripe, Toss Payments, Airwallex, etc.).
Handle compliance for international remittance services.
Manage payment security and fraud/anomaly detection systems.`,
    qualifications: `5+ years senior backend development experience.
Node.js / NestJS or equivalent backend frameworks.
PostgreSQL-based data modeling.
AWS-based infrastructure experience.
Fintech/payment system development (mandatory).
English technical documentation proficiency.`,
    preferred: `Payment gateway integration expertise (Stripe, Toss Payments, Airwallex).
Security certifications (PCI DSS, ISO 27001).
AML/KYC system development.
International remittance systems background.`,
  },

  LM1001: {
    company: "Lumicraft",
    position: "Full-stack Developer",
    experience: "1 year",
    hires: 1,
    salary: "18M – 27M VND",
    responsibilities: `Development and maintenance of Next.js-based web platforms.
Database management using Postgres, Supabase, and Drizzle ORM.
Implementing Frontend-Backend communication via tRPC and React Query.
Future participation in mobile app development using React Native.
Collaboration through Git.`,
    qualifications: `Front End: TypeScript, React.js, Next.js, TailwindCSS.
Back End: Node.js, tRPC, Supabase, Drizzle ORM.
Database: PostgreSQL.
Mobile: React Native (optional).`,
    preferred: `Experience with React Query and tRPC.
Experience in messaging services or performance optimization.
Interest or experience in UI/UX design.`,
  },

  SHU1101: {
    company: "Shupia",
    position: "Full Stack Developer",
    experience: "3 years",
    hires: 1,
    salary: "22M – 27M VND",
    responsibilities: `Improve and maintain the existing Joi app (Expo / React Native environment).
Push updates via GitHub and manage version control.
Debug issues and implement fast, practical solutions.
Support app releases on Google Play and Apple App Store.
Work closely with design and product to ship updates quickly.`,
    qualifications: `Experience in full stack or strong frontend with backend understanding.
Familiarity with Expo / React Native.
Comfortable with Git workflows (GitHub).
Experience using AI coding tools such as Claude, Cursor.
Strong communication skills (KOR/ENG).`,
    preferred: `Desire to build and grow with a product, not just complete tasks.
Preference for ownership, speed, and visible impact.`,
  },

  SHU1102: {
    company: "Shupia",
    position: "UX/UI Developer",
    experience: "3 years",
    hires: 1,
    salary: "22M – 27M VND",
    responsibilities: `Improve and refine the current Joi app experience.
Enhance UI clarity, usability, and emotional engagement.
Produce marketing assets including ads, landing pages, and app store visuals.
Design product description pages, landing pages, brochures, and presentation slides.
Edit short-form and promotional videos.
Manage user communication channels and support onboarding.
Build user relationships and feedback systems.`,
    qualifications: `Strong modern UI/UX sense (mobile-first).
Fluent in Korean and English.
Proficient with Figma, PowerPoint, and web/app asset creation.
Contribute to both product and marketing design work.
Focus on user understanding and engagement beyond aesthetics.
Think strategically about impact and conversion metrics.`,
    preferred: `Comfortable with autonomy, speed, and measurable outcomes.`,
  },

  MNF1201: {
    company: "MNF Solution",
    position: "Full-stack Developer",
    experience: "2-4 years",
    hires: 2,
    salary: "18M – 22M VND",
    responsibilities: `Database design.
Back-end and front-end programming.
Project duration: 5 months.
End-to-end management system for used car purchasing, inventory, merchandising, and sales.`,
    qualifications: `Front-End: HTML5, CSS3, JavaScript (ES6+), TypeScript, React.js, Vue.js, Webpack/Vite, Flutter Framework (1+ year), Dart.
Back-End: Java, Spring/Spring Boot, JSP/Thymeleaf, RESTful APIs, security knowledge (XSS, CSRF, SQL Injection), Oracle Database, PostgreSQL, Redis.
System Engineering: Linux (Red Hat, Debian), TCP/IP, AWS/Azure/NCP, Docker, GitHub Actions, Jenkins.`,
    preferred: `TypeScript experience. Native app development (Android/iOS). Flutter deployment expertise.
WebView/hybrid app development. Batch programs, JPA, high-traffic systems. Kubernetes/Kafka.
Korean language proficiency.`,
  },

  META1302: {
    company: "Metainnotech",
    position: "HR & Accounting Coordinator",
    experience: "2+ years",
    hires: 1,
    salary: "15M – 25M VND",
    responsibilities: `Labor contract management, attendance tracking, employee onboarding.
SHUI/work permit/visa administration, office management.
DPI reporting, MISA accounting entry, e-VAT invoice handling.
Bank reconciliation, financial statement preparation.
Tax filing (VAT/PIT/CIT), payroll processing, monthly reporting, audit support.`,
    qualifications: `Basic or above proficiency in MISA.
VAT filing experience via eTax or willingness to learn.
Excel/Google Sheets competency.
Vietnamese labor law and social insurance knowledge.
Multi-tasking capability.`,
    preferred: `Basic-intermediate Korean communication ability.
2+ years Korean company experience.
Independent eTax filing capability. Accounting background.`,
  },

  META1303: {
    company: "Metainnotech",
    position: "IT Interpreter & Admin Assistant",
    experience: "1+ year",
    hires: 1,
    salary: "15M – 25M VND",
    responsibilities: `Interpret meetings between Korean HQ and Vietnamese developers.
Provide on-site and online interpretation via Zoom/Teams.
Translate IT technical documents, UI/UX content, emails, and reports.
Support communication for Korean employees.
Assist interpretation during client meetings and contract negotiations.
Administrative and meeting preparation support.`,
    qualifications: `Intermediate Korean proficiency or above.
Real-time interpretation capability.
Basic IT/software terminology understanding.
Strong quick-response and accurate communication skills.`,
    preferred: `Interpreter experience in IT/software companies.
TOPIK level 4–6 certification.
Basic English communication skills.
Knowledge of Software, IoT, or AI. Trilingual capabilities.`,
  },
};

export function matchJobCode(appliedJob: string): string | null {
  if (!appliedJob) return null;

  const codePatterns: Record<string, RegExp> = {
    FPT401: /FPT401|FPT.*Embedded/i,
    SL201: /SL201|Performance.*Growth/i,
    SL202: /SL202|Content.*Conversion/i,
    JN301: /JN301|Jinosys|Mobile.*App.*Web/i,
    NX501: /NX501|Nexacode/i,
    WP601: /WP601|TikTok.*Ads.*Market/i,
    WP602: /WP602|TikTok.*Shop.*Shopify/i,
    MT701: /MT701|MT701.*UI|MT701.*UX/i,
    MT702: /MT702|Website.*Developer/i,
    AW801: /AW801|Andwise/i,
    OQ901: /OQ901(?!.*Safe).*Full/i,
    OQ902: /OQ902|SafePay/i,
    LM1001: /LM1001|Lumicraft/i,
    SHU1101: /SHU1101|Shupia.*Full/i,
    SHU1102: /SHU1102|Shupia.*UI|Shupia.*UX/i,
    MNF1201: /MNF1201|MNF.*Full/i,
    META1302: /META1302|HR.*Account/i,
    META1303: /META1303|IT.*Interpreter/i,
  };

  for (const [code, pattern] of Object.entries(codePatterns)) {
    if (pattern.test(appliedJob)) return code;
  }

  return null;
}

export function buildJDText(jd: JobDescription): string {
  return `Company: ${jd.company}
Position: ${jd.position}
Required Experience: ${jd.experience}
Salary: ${jd.salary}
Headcount: ${jd.hires}

Key Responsibilities:
${jd.responsibilities}

Qualifications:
${jd.qualifications}

Preferred:
${jd.preferred}`;
}
