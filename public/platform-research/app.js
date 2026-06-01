const { useState, useEffect, useMemo } = React;

const LS_KEY = 'skelar-research-v4';
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    if (s && typeof s === 'object') return s;
  } catch {}
  return null;
}

function defaultState() {
  const status = {}, kr1 = {}, kr2 = {}, sprint = {}, notes = {};
  window.TEAMS.forEach(t => {
    status[t.id] = [...t.status];
    kr1[t.id]    = window.DEFAULT_KR1.includes(t.id);
    kr2[t.id]    = window.DEFAULT_KR2.includes(t.id);
    sprint[t.id] = window.DEFAULT_SPRINT.includes(t.id);
    notes[t.id]  = '';
  });
  return { status, kr1, kr2, sprint, notes };
}

function defaultMetrics() {
  return { metrics: {}, extras: [], positions: {}, deps: null, customDims: [], teamBlocks: {} };
}

// --- user info injected by server ------------------------------
const CU = window.CURRENT_USER || {};
const userName     = CU.name  || CU.email || 'You';
const userRole     = (CU.role  || 'member').toUpperCase();
const userInitials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

// ===============================================================
// GUIDE TAB
// ===============================================================
function GuideTab() {
  return (
    <div className="guide-tab">
      <div className="guide-hero">
        <div className="guide-hero-eyebrow">Technical documentation . Platform Research v2</div>
        <h1 className="guide-hero-title">How this workspace works</h1>
        <p className="guide-hero-sub">
          A self-contained research tool built on top of SKELAR Vault.
          This guide covers the architecture, data model, and how to extend or update the tool.
        </p>
      </div>

      <div className="guide-section">
        <h2 className="guide-section-title">Stack overview</h2>
        <p className="guide-body">
          Platform Research runs as an <b>iframe srcdoc</b> embedded inside a Next.js 15 server component.
          The outer shell (<code>/platform-dashboard/part2</code>) handles Supabase auth and injects
          the current user into <code>window.CURRENT_USER</code> before the app scripts load.
          Inside the iframe, a standalone <b>React 18 UMD</b> app renders the full workspace --
          no bundler, no build step for the inner app.
        </p>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'12px 0'}}>
          <span className="guide-tag guide-tag-next">Next.js 15</span>
          <span className="guide-tag guide-tag-react">React 18 UMD</span>
          <span className="guide-tag guide-tag-supabase">Supabase Auth</span>
          <span className="guide-tag guide-tag-vercel">Vercel</span>
        </div>
        <div className="guide-code">{`apps/hub/
+-- app/platform-dashboard/
|   +-- layout.tsx                      <- Inter font scoping
|   +-- part2/
|       +-- page.tsx                    <- Server: auth check + user injection
|       +-- PlatformResearchClient.tsx  <- iframe srcdoc renderer
+-- public/platform-research/
    +-- style.css      <- All CSS (~50 kB)
    +-- data.js        <- Teams, zones, people, metrics (15 kB)
    +-- components.js  <- SummaryStrip, HeatmapTable, SprintAside (22 kB)
    +-- tabs.js        <- FieldMap v2, TeamsDirectory, GuideTab (24 kB)
    +-- app.js         <- App root + ReactDOM.createRoot (this file)`}</div>
      </div>

      <div className="guide-section">
        <h2 className="guide-section-title">Authentication + user profile</h2>
        <p className="guide-body">
          <b>page.tsx</b> (server component) calls <code>supabase.auth.getUser()</code>.
          No session -> redirect to <code>/login</code>. Authenticated user's name,
          email and role are read from the <code>profiles</code> table and embedded
          into the iframe's srcdoc HTML as a script tag before app.js loads.
          The topbar reads <code>window.CURRENT_USER</code> -- no API call needed inside the iframe.
        </p>
        <div className="guide-code">{`// PlatformResearchClient.tsx -- simplified
const userScript = \`<script>
  window.CURRENT_USER = {
    name:  \${JSON.stringify(profile?.full_name ?? user.email)},
    email: \${JSON.stringify(user.email)},
    role:  \${JSON.stringify(profile?.role ?? 'member')},
  }
<\/script>\`

// injected into srcdoc before all other scripts`}</div>
      </div>

      <div className="guide-section">
        <h2 className="guide-section-title">Data model</h2>
        <p className="guide-body">
          All research data lives in <b>public/platform-research/data.js</b> as
          <code>window.*</code> globals. State (statuses, notes, sprint flags) is persisted
          in <code>localStorage</code> under key <code>skelar-research-v4</code>.
          This is per-browser. For multi-user sync the next step is a Supabase table.
        </p>
        <table className="guide-table">
          <thead><tr><th>Global</th><th>Shape</th><th>Description</th></tr></thead>
          <tbody>
            {[
              ['ZONES',          'Zone[6]',     '6 zones -- id, label, color'],
              ['PEOPLE',         'Person[12]',  '12 contacts with name + initials'],
              ['TEAMS',          'Team[25]',    '25 teams -- zone, person, status[5]'],
              ['DIMENSIONS',     'Dim[5]',      'Outcome / Output / Solutions / Loading / Satisfaction'],
              ['METRICS_DEFAULT','Metric[24]',  '24 built-in metrics across 5 dims'],
              ['DIM_DEPS',       'Dep[7]',      '7 default dim->dim relationships'],
              ['DIM_POS',        'Record',      'Default canvas positions (%)'],
              ['TEAM_DESC',      'Record',      'Mandate + KPIs per team (25 entries)'],
              ['CURRENT_USER',   'User',        'Injected by server -- name, email, role'],
            ].map(([g,t,d]) => (
              <tr key={g}><td>{g}</td><td style={{fontFamily:'Geist Mono,monospace',fontSize:11,color:'var(--ink-3)'}}>{t}</td><td>{d}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="guide-section">
        <h2 className="guide-section-title">Field Map -- arrows to metrics</h2>
        <p className="guide-body">
          Arrows are SVG cubic bezier paths. When a connection targets a <b>specific metric</b>
          (not just a block header), the anchor Y is calculated from the metric's
          position inside the block: <code>headerHeight + index × rowHeight + rowHeight/2</code>.
          Block heights are tracked after each render via a <code>useRef</code> map and used on the next paint.
        </p>
        <p className="guide-body">
          To connect: click <b>+ Connect</b>, then click a metric bullet or a block header as source,
          then click the target. Press <b>Escape</b> to cancel.
          Hover the arrow label to reveal the × remove button.
        </p>
        <div className="guide-code">{`// Anchor calculation (tabs.js)
const getAnchor = (nodeId, metricId, side) => {
  const p   = pxPos(nodeId)
  const idx = byDim[nodeId].findIndex(m => m.id === metricId)
  const y   = idx >= 0
    ? p.y + HEADER_H + idx * METRIC_H + METRIC_H / 2
    : p.y + (blockHeights.current[nodeId] || 220) / 2
  return side === 'left' ? { x: p.x, y } : { x: p.x + BLOCK_W, y }
}`}</div>
      </div>

      <div className="guide-section">
        <h2 className="guide-section-title">How to update content</h2>
        <p className="guide-body">
          Edit files in <code>public/platform-research/</code>, commit, push -- Vercel redeploys.
          The iframe fetches files fresh on each page load (no service worker caching).
        </p>
        <table className="guide-table">
          <thead><tr><th>Task</th><th>File to edit</th></tr></thead>
          <tbody>
            {[
              ['Add a team',               'data.js -> TEAMS + TEAM_DESC'],
              ['Add a metric',             'data.js -> METRICS_DEFAULT (or use + add metric in UI)'],
              ['Change dimension colors',  'data.js -> DIM_INFO'],
              ['Change default positions', 'data.js -> DIM_POS'],
              ['Add CSS',                  'style.css'],
              ['Change UI behaviour',      'components.js or tabs.js'],
              ['Multi-user state sync',    'app.js -> replace localStorage with supabase.upsert'],
            ].map(([task, file]) => (
              <tr key={task}><td>{task}</td><td>{file}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===============================================================
// APP ROOT
// ===============================================================
function App() {
  const [state, setState] = useState(() => loadState() || defaultState());
  const [metricsState, setMetricsState] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY + '-map'));
      if (s && typeof s === 'object') return s;
    } catch {}
    return defaultMetrics();
  });

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => { localStorage.setItem(LS_KEY + '-map', JSON.stringify(metricsState)); }, [metricsState]);

  const [tab, setTab] = useState(() => localStorage.getItem('skelar-research-tab') || 'survey');
  useEffect(() => { localStorage.setItem('skelar-research-tab', tab); }, [tab]);

  const [colorOn, setColorOn] = useState(() => localStorage.getItem('skelar-research-color') !== 'off');
  useEffect(() => { localStorage.setItem('skelar-research-color', colorOn ? 'on' : 'off'); }, [colorOn]);

  const [zoneFilter, setZoneFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch]             = useState('');
  const [sprintOnly, setSprintOnly]     = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [expandedRow, setExpandedRow]   = useState(null);

  const filteredTeams = useMemo(() => {
    return window.TEAMS.filter(t => {
      if (zoneFilter !== 'all' && t.zone !== zoneFilter) return false;
      if (sprintOnly && !state.sprint[t.id]) return false;
      if (statusFilter !== 'all' && window.calcStage(state.status[t.id] || t.status) !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const person = window.PEOPLE.find(p => p.id === t.person);
        if (!t.name.toLowerCase().includes(q) && !person.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [state, zoneFilter, statusFilter, sprintOnly, search]);

  const grouped = useMemo(() => {
    const map = {};
    filteredTeams.forEach(t => { (map[t.person] = map[t.person] || []).push(t); });
    return window.PEOPLE.filter(p => map[p.id]).map(p => ({ person: p, teams: map[p.id] }));
  }, [filteredTeams]);

  const stats = useMemo(() => {
    let ready = 0, deep = 0, empty = 0;
    window.TEAMS.forEach(t => {
      const st = state.status[t.id] || t.status;
      st.forEach(v => { if (v === 2) ready++; else if (v === 1) deep++; else empty++; });
    });
    const stages = { finalizing: 0, 'deep-dive': 0, 'not-started': 0 };
    window.TEAMS.forEach(t => { stages[window.calcStage(state.status[t.id] || t.status)]++; });
    const sprintCount = Object.values(state.sprint).filter(Boolean).length;
    const total = window.TEAMS.length * 5;
    return { ready, deep, empty, stages, sprintCount, total, coverage: Math.round(ready / total * 100), statusMap: state.status };
  }, [state]);

  const zoneCounts = useMemo(() => {
    const map = { all: window.TEAMS.length };
    window.ZONES.forEach(z => map[z.id] = 0);
    window.TEAMS.forEach(t => map[t.zone]++);
    return map;
  }, []);

  const onSprintToggle = () => { const n = !sprintOnly; setSprintOnly(n); setSidebarOpen(n); };

  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 's' && !e.metaKey && !e.ctrlKey) onSprintToggle();
      if (e.key === 'Escape') { setSidebarOpen(false); setExpandedRow(null); }
      if (e.key === '/') { e.preventDefault(); document.querySelector('.rail-search input')?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [sprintOnly]);

  const weekLabel = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  return (
    <div className={`page ${sidebarOpen ? 'with-aside' : ''}`}>

      {/* -- TOP BAR -- */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div className="brand-name">SKELAR</div>
          <div className="brand-section">RESEARCH</div>
        </div>
        <div className="topbar-pill"><span className="topbar-pill-dot"/> Sprint 08 . {weekLabel}</div>
        <div className="topbar-spacer"/>
        <div className="navtabs">
          {[['survey','▤','Survey'],['map','⤧','Field map'],['teams','⊞','Roster'],['next','->','Next steps']].map(([id,g,label]) => (
            <button key={id} className={`navtab ${tab===id?'navtab-on':''}`} onClick={()=>setTab(id)}>
              <span className="navtab-glyph">{g}</span> {label}
            </button>
          ))}
        </div>
        <button className="topbar-action" onClick={()=>setTab('guide')}>📖 Guide</button>
        <div className="topbar-user">
          <div className="topbar-user-avatar">{userInitials}</div>
          <div><div className="topbar-user-name">{userName.split(' ')[0]}</div></div>
          <span className="topbar-user-role">{userRole}</span>
        </div>
        <button className="topbar-tool" title="Language">EN</button>
      </header>

      {tab === 'survey' && <>
        <window.SummaryStrip stats={stats} sprintNumber="08" weekLabel={weekLabel}
          zoneFilter={zoneFilter} setZoneFilter={setZoneFilter} zoneCounts={zoneCounts}
          sprintOnly={sprintOnly} onSprintToggle={onSprintToggle}/>
        {stats.stages['not-started'] > 0 && (
          <div className="banner">
            <span className="banner-tag">⚠ OPEN ITEMS</span>
            <span><b>{stats.stages['not-started']} team{stats.stages['not-started']===1?'':'s'}</b> not engaged yet. Tag with <b>SPR</b> to queue outreach.</span>
            <button className="banner-link" onClick={()=>setStatusFilter('not-started')}>Filter to open -></button>
          </div>
        )}
        <window.FilterRail
          zoneFilter={zoneFilter} setZoneFilter={setZoneFilter} zoneCounts={zoneCounts}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter} statusStats={stats.stages}
          search={search} setSearch={setSearch} sprintOnly={sprintOnly}
          onSprintToggle={onSprintToggle} sprintCount={stats.sprintCount}
          colorOn={colorOn} setColorOn={setColorOn} weekLabel={weekLabel}/>
        <div className="heatmap-wrap">
          <window.HeatmapTable grouped={grouped} state={state} setState={setState}
            expandedRow={expandedRow} setExpandedRow={setExpandedRow} colorOn={colorOn}/>
        </div>
      </>}

      {tab === 'map' && <window.FieldMap metricsState={metricsState} setMetricsState={setMetricsState}/>}
      {tab === 'teams' && <window.TeamsDirectory state={state} setState={setState} search={search}/>}
      {tab === 'guide' && <GuideTab/>}
      {tab === 'next' && <window.NextTab state={state} setState={setState}/>}

      <window.SprintAside open={sidebarOpen}
        onClose={()=>{setSidebarOpen(false);setSprintOnly(false);}}
        state={state} setState={setState}/>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('platform-research-root')).render(<App/>);
