// SKELAR platform teams research data
// 25 teams · 6 zones · 12 contact people

window.ZONES = [
  { id: 'people',   label: 'People',   color: '#3a6b48', hue: 145 },
  { id: 'it',       label: 'IT',       color: '#3a4f6b', hue: 215 },
  { id: 'admin',    label: 'Admin',    color: '#a87320', hue:  40 },
  { id: 'finance',  label: 'Finance',  color: '#5c4b8c', hue: 275 },
  { id: 'legal',    label: 'Legal',    color: '#8c3a3a', hue:  15 },
  { id: 'strategy', label: 'Strategy', color: '#3a6b6b', hue: 185 },
];

window.PEOPLE = [
  { id: 'p01', name: 'Anna Koval',        initials: 'AK' },
  { id: 'p02', name: 'Maria Shevchenko',  initials: 'MS' },
  { id: 'p03', name: 'Oleksandr Petrenko',initials: 'OP' },
  { id: 'p04', name: 'Yulia Romanenko',   initials: 'YR' },
  { id: 'p05', name: 'Kateryna Lysenko',  initials: 'KL' },
  { id: 'p06', name: 'Andriy Marchenko',  initials: 'AM' },
  { id: 'p07', name: 'Volodymyr Kravets', initials: 'VK' },
  { id: 'p08', name: 'Sofia Tkachenko',   initials: 'ST' },
  { id: 'p09', name: 'Roman Dovhan',      initials: 'RD' },
  { id: 'p10', name: 'Nataliia Pavlenko', initials: 'NP' },
  { id: 'p11', name: 'Pavlo Hrynchuk',    initials: 'PH' },
  { id: 'p12', name: 'Olena Fedoriv',     initials: 'OF' },
];

// status codes: 2 = Ready ✅, 1 = Needs more 🔍, 0 = Not started ⬜
// dimensions order: Outcome | Output/SLA | Solutions | Loading | Satisfaction
window.TEAMS = [
  // Anna Koval — People
  { id: 't01', name: 'Talent Acquisition',  zone: 'people',   person: 'p01', status: [2,2,1,2,1] },
  { id: 't02', name: 'People Operations',   zone: 'people',   person: 'p01', status: [2,2,2,2,2] },
  { id: 't03', name: 'People Analytics',    zone: 'people',   person: 'p01', status: [1,1,0,1,0] },

  // Maria Shevchenko — People
  { id: 't04', name: 'Learning & Dev',      zone: 'people',   person: 'p02', status: [2,1,1,0,1] },
  { id: 't05', name: 'Employer Brand',      zone: 'people',   person: 'p02', status: [0,0,0,0,0] },

  // Oleksandr Petrenko — IT
  { id: 't06', name: 'IT Infrastructure',   zone: 'it',       person: 'p03', status: [2,2,2,1,1] },
  { id: 't07', name: 'Cybersecurity',       zone: 'it',       person: 'p03', status: [2,2,1,2,2] },

  // Yulia Romanenko — IT
  { id: 't08', name: 'Internal Tools',      zone: 'it',       person: 'p04', status: [1,0,1,0,0] },
  { id: 't09', name: 'Data Platform',       zone: 'it',       person: 'p04', status: [2,1,2,1,1] },

  // Kateryna Lysenko — Admin
  { id: 't10', name: 'Office Management',   zone: 'admin',    person: 'p05', status: [2,2,2,2,1] },
  { id: 't11', name: 'Procurement',         zone: 'admin',    person: 'p05', status: [1,1,1,0,0] },
  { id: 't12', name: 'Workplace Exp.',      zone: 'admin',    person: 'p05', status: [0,1,0,0,0] },

  // Andriy Marchenko — Finance
  { id: 't13', name: 'FP&A',                zone: 'finance',  person: 'p06', status: [2,2,2,2,2] },
  { id: 't14', name: 'Accounting',          zone: 'finance',  person: 'p06', status: [2,2,1,2,1] },

  // Volodymyr Kravets — Finance
  { id: 't15', name: 'Treasury',            zone: 'finance',  person: 'p07', status: [1,2,1,1,0] },
  { id: 't16', name: 'Tax',                 zone: 'finance',  person: 'p07', status: [2,1,1,0,1] },

  // Sofia Tkachenko — Finance
  { id: 't17', name: 'Payroll',             zone: 'finance',  person: 'p08', status: [2,2,2,1,2] },

  // Roman Dovhan — Legal
  { id: 't18', name: 'Corporate Legal',     zone: 'legal',    person: 'p09', status: [1,1,0,1,0] },
  { id: 't19', name: 'IP & Compliance',     zone: 'legal',    person: 'p09', status: [0,0,1,0,0] },

  // Nataliia Pavlenko — Legal
  { id: 't20', name: 'Contracts',           zone: 'legal',    person: 'p10', status: [2,2,1,2,1] },

  // Pavlo Hrynchuk — Strategy
  { id: 't21', name: 'Strategic Finance',   zone: 'strategy', person: 'p11', status: [2,1,2,1,2] },
  { id: 't22', name: 'Market Intelligence', zone: 'strategy', person: 'p11', status: [1,0,0,0,1] },
  { id: 't23', name: 'Portfolio Ops',       zone: 'strategy', person: 'p11', status: [2,2,2,2,1] },

  // Olena Fedoriv — Strategy
  { id: 't24', name: 'M&A',                 zone: 'strategy', person: 'p12', status: [0,1,0,0,0] },
  { id: 't25', name: 'Corporate Strategy',  zone: 'strategy', person: 'p12', status: [1,1,1,1,0] },
];

window.DIMENSIONS = [
  { id: 'outcome',     short: 'Outcome',     full: 'Outcome' },
  { id: 'output',      short: 'Output',      full: 'Output / SLA' },
  { id: 'solutions',   short: 'Solutions',   full: 'Solutions' },
  { id: 'loading',     short: 'Loading',     full: 'Loading' },
  { id: 'satisfaction',short: 'Satisfaction',full: 'Satisfaction' },
];

// Default sprint set — 7 teams pre-flagged "this sprint"
window.DEFAULT_SPRINT = ['t01','t04','t08','t11','t15','t22','t24'];
// Default KR mapping
window.DEFAULT_KR1 = ['t01','t02','t06','t13','t17','t21','t23'];
window.DEFAULT_KR2 = ['t04','t08','t10','t14','t15','t20','t25'];

// ─── Field map: dimension blocks, default metrics, dependencies ──
window.DIM_INFO = {
  outcome: {
    question: 'What is the team actually trying to achieve?',
    color: '#3a6b48',
  },
  output: {
    question: 'What do they ship — and how fast, how well?',
    color: '#a87320',
  },
  solutions: {
    question: 'How do they solve their core problem?',
    color: '#5c4b8c',
  },
  loading: {
    question: 'How much capacity is used — and where is the strain?',
    color: '#3a4f6b',
  },
  satisfaction: {
    question: 'How do the stakeholders actually feel about the work?',
    color: '#8c3a3a',
  },
};

window.METRICS_DEFAULT = [
  // OUTCOME
  { id: 'm-o1', dim: 'outcome',      name: 'Strategic alignment score',     unit: '1–10',     scope: 'All 25 teams',           active: true  },
  { id: 'm-o2', dim: 'outcome',      name: 'OKR completion rate',           unit: '%',        scope: 'All 25 teams',           active: true  },
  { id: 'm-o3', dim: 'outcome',      name: 'Quarterly outcomes hit',        unit: 'count',    scope: 'All 25 teams',           active: true  },
  { id: 'm-o4', dim: 'outcome',      name: 'Stakeholder value rating',      unit: '1–10',     scope: '12 stakeholders',        active: false },

  // OUTPUT / SLA
  { id: 'm-p1', dim: 'output',       name: 'SLA met',                       unit: '%',        scope: 'Services teams (18)',    active: true  },
  { id: 'm-p2', dim: 'output',       name: 'Throughput per week',           unit: 'items',    scope: 'All teams',              active: true  },
  { id: 'm-p3', dim: 'output',       name: 'Median cycle time',             unit: 'days',     scope: 'Delivery teams (14)',    active: true  },
  { id: 'm-p4', dim: 'output',       name: 'Defect / rework rate',          unit: '%',        scope: 'IT + Finance + Legal',   active: false },
  { id: 'm-p5', dim: 'output',       name: 'First-response time',           unit: 'hrs',      scope: 'Service desks (9)',      active: false },

  // SOLUTIONS
  { id: 'm-s1', dim: 'solutions',    name: 'Process maturity',              unit: '1–5',      scope: 'All teams',              active: true  },
  { id: 'm-s2', dim: 'solutions',    name: 'Automation coverage',           unit: '%',        scope: 'IT + Ops + Finance',     active: true  },
  { id: 'm-s3', dim: 'solutions',    name: 'Self-service ratio',            unit: '%',        scope: 'People + IT + Admin',    active: false },
  { id: 'm-s4', dim: 'solutions',    name: 'Documentation coverage',        unit: '%',        scope: 'All teams',              active: true  },
  { id: 'm-s5', dim: 'solutions',    name: 'Tool stack health',             unit: '1–10',     scope: 'IT-adjacent (12)',       active: false },

  // LOADING
  { id: 'm-l1', dim: 'loading',      name: 'Utilization rate',              unit: '%',        scope: 'All teams',              active: true  },
  { id: 'm-l2', dim: 'loading',      name: 'FTE allocated',                 unit: 'count',    scope: 'All 25 teams',           active: true  },
  { id: 'm-l3', dim: 'loading',      name: 'Backlog size',                  unit: 'items',    scope: 'Services teams (18)',    active: false },
  { id: 'm-l4', dim: 'loading',      name: 'Hours per stakeholder',         unit: 'hrs/mo',   scope: 'Cross-portfolio',        active: true  },
  { id: 'm-l5', dim: 'loading',      name: 'Peak-load handling',            unit: '1–10',     scope: 'All teams',              active: false },

  // SATISFACTION
  { id: 'm-x1', dim: 'satisfaction', name: 'Stakeholder NPS',               unit: '−100 / +100', scope: '12 stakeholders',     active: true  },
  { id: 'm-x2', dim: 'satisfaction', name: 'CSAT (rolling 30d)',            unit: '%',        scope: 'All requesters',         active: true  },
  { id: 'm-x3', dim: 'satisfaction', name: 'Escalations',                   unit: 'count/qtr',scope: 'All teams',              active: true  },
  { id: 'm-x4', dim: 'satisfaction', name: 'Repeat engagement',             unit: '%',        scope: 'All teams',              active: false },
  { id: 'm-x5', dim: 'satisfaction', name: 'Time to first reply',           unit: 'hrs',      scope: 'Service desks (9)',      active: false },
];

// Dependencies between dimensions (arrows on the canvas)
window.DIM_DEPS = [
  { from: 'output',       to: 'outcome',      label: 'drives'       },
  { from: 'satisfaction', to: 'outcome',      label: 'signals'      },
  { from: 'solutions',    to: 'output',       label: 'enables'      },
  { from: 'loading',      to: 'output',       label: 'constrains'   },
  { from: 'solutions',    to: 'loading',      label: 'reduces'      },
  { from: 'output',       to: 'satisfaction', label: 'shapes'       },
  { from: 'loading',      to: 'satisfaction', label: 'erodes'       },
];

// Block positions on the field map (% of canvas)
window.DIM_POS = {
  outcome:      { x: 40, y:  2 },
  output:       { x:  6, y: 36 },
  solutions:    { x: 72, y: 36 },
  loading:      { x: 16, y: 70 },
  satisfaction: { x: 62, y: 70 },
};

// ─── Team mandates (for Teams tab) ──────────────────────────────
window.TEAM_DESC = {
  t01: { mandate: 'End-to-end sourcing and hiring for portfolio teams. Owns funnel quality from first touch to signed offer.',                              kpis: ['Time-to-hire','Offer accept rate','Pipeline health'] },
  t02: { mandate: 'Onboarding, lifecycle changes, employee data integrity and internal mobility. The connective tissue of the people function.',           kpis: ['Onboarding NPS','Data quality','Cycle time'] },
  t03: { mandate: 'Workforce dashboards, attrition modelling, comp benchmarks. Turns HR data into board-grade decisions.',                                 kpis: ['Dashboard adoption','Attrition forecast','Insight count'] },
  t04: { mandate: 'Skills frameworks, manager training, learning paths. Builds the bench three quarters out.',                                              kpis: ['L&D NPS','Hours per FTE','Skill coverage'] },
  t05: { mandate: 'Recruitment marketing, careers site, talent community. Owns how SKELAR shows up to candidates outside.',                                kpis: ['Inbound applies','Brand reach','Candidate sentiment'] },
  t06: { mandate: 'Networks, cloud accounts, identity, endpoints. Keeps the lights on across 30+ portfolio companies.',                                    kpis: ['Uptime','MTTR','Incident count'] },
  t07: { mandate: 'Threat detection, vendor security reviews, incident response and awareness programs.',                                                   kpis: ['Vulns closed','MTTD','Phishing rate'] },
  t08: { mandate: 'Bespoke automation, integrations, low-code apps for operations teams across the portfolio.',                                            kpis: ['Hours saved','Apps shipped','Adoption'] },
  t09: { mandate: 'Warehouse, pipelines, BI tooling, data governance. Source of truth for cross-team reporting.',                                          kpis: ['Pipeline freshness','Adoption','Data trust'] },
  t10: { mandate: 'Workspaces, facilities, vendor management, travel and event logistics.',                                                                 kpis: ['Workplace CSAT','Cost per seat','Incidents'] },
  t11: { mandate: 'Vendor onboarding, contract negotiation, cost control. Centralised buying power for the portfolio.',                                    kpis: ['Savings','Cycle time','Vendor NPS'] },
  t12: { mandate: 'Daily rituals, perks, internal communications. The texture of working at SKELAR.',                                                       kpis: ['eNPS','Event NPS','Participation'] },
  t13: { mandate: 'Budgets, forecasts, board reporting and scenario modelling for the holding and each portfolio company.',                                kpis: ['Forecast accuracy','Close speed','Board score'] },
  t14: { mandate: 'Books, close cycles, audit prep and financial controls. The integrity layer of the holding.',                                            kpis: ['Days to close','Audit findings','Restatements'] },
  t15: { mandate: 'Cash management, banking relationships, FX, capital allocation across portfolio companies.',                                            kpis: ['Idle cash %','FX cost','Days of runway'] },
  t16: { mandate: 'Multi-jurisdiction tax planning, compliance and transfer pricing across SKELAR entities.',                                              kpis: ['Effective tax','Filings on time','Disputes'] },
  t17: { mandate: 'Salary cycles, benefits, country-specific compliance and contractor payments.',                                                          kpis: ['On-time runs','Error rate','Compliance'] },
  t18: { mandate: 'Entity structure, governance, M&A documentation and regulatory matters.',                                                                kpis: ['Deal turnaround','Issues raised','Coverage'] },
  t19: { mandate: 'Trademarks, IP assignment, GDPR/data protection, AML/KYC procedures.',                                                                   kpis: ['IP coverage','Incidents','Audit score'] },
  t20: { mandate: 'Customer, vendor and employment templates. Negotiation support, full contract lifecycle.',                                              kpis: ['Cycle time','Standardisation','Spend at risk'] },
  t21: { mandate: 'Investment cases, unit-economics modelling, capital deployment recommendations.',                                                        kpis: ['Hit rate','IRR delta','Decisions enabled'] },
  t22: { mandate: 'Industry mapping, competitor tracking, opportunity discovery for new ventures.',                                                         kpis: ['Theses shipped','Adoption','Coverage'] },
  t23: { mandate: 'Cross-portfolio KPIs, best-practice sharing and board-level operating reviews.',                                                         kpis: ['KPI coverage','Review NPS','Actions closed'] },
  t24: { mandate: 'Target identification, deal execution and post-merger integration.',                                                                     kpis: ['Pipeline value','Time-to-close','Integration NPS'] },
  t25: { mandate: 'Five-year roadmap, thesis development and geographic expansion planning.',                                                               kpis: ['Roadmap accuracy','Decisions','Board approval'] },
};
