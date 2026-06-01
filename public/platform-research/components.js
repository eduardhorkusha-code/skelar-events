/* SKELAR Platform Research — Survey heatmap edition */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ─── helpers ───────────────────────────────────────────────────────
function calcStage(status) {
  const ready = status.filter(s => s === 2).length;
  const some  = status.filter(s => s !== 0).length;
  if (some === 0) return 'not-started';
  if (ready >= 4) return 'finalizing';
  return 'deep-dive';
}
const STAGE_LABEL = {
  'finalizing':  'Ready',
  'deep-dive':   'WIP',
  'not-started': 'Open',
};

const STATUS_LABEL = ['Open','WIP','Ready'];
const STATUS_GLYPH = ['—','◐','✓'];
const STATUS_KEY   = ['empty','deep','ready'];

function teamScore(status) {
  return status.filter(s => s===2).length;
}

function buildMessage(person, teams, statusMap) {
  const first = person.name.split(' ')[0];
  const lines = [];
  lines.push(`${first}, I'd love 30 minutes this week.`);
  lines.push(``);
  lines.push(`Closing out the platform research for sprint 08; want to make sure I've`);
  lines.push(`got your view captured on:`);
  lines.push(``);
  teams.forEach(t => {
    const st = statusMap[t.id] || t.status;
    const missing = window.DIMENSIONS
      .map((d,i) => st[i] !== 2 ? d.short : null)
      .filter(Boolean);
    if (missing.length === 0) lines.push(`  ${t.name.toLowerCase()} — final read only`);
    else lines.push(`  ${t.name.toLowerCase()} — ${missing.join(' · ').toLowerCase()}`);
  });
  lines.push(``);
  lines.push(`I'll bring a one-pager so you can react rather than dig.`);
  lines.push(`— Pavlo`);
  return lines.join('\n');
}

// ─── score chip ────────────────────────────────────────────────────
function ScoreChip({ value, max = 5, size = 'md' }) {
  // value out of max → bucket
  const pct = max ? value / max : 0;
  let tone = 'empty';
  if (pct >= 0.8) tone = 'ready';
  else if (pct >= 0.4) tone = 'deep';
  return (
    <span className={`chip chip-score chip-${tone} chip-${size}`}>
      {value}<small>/{max}</small>
    </span>
  );
}

function StagePill({ stage }) {
  return (
    <span className={`pill pill-${stage}`}>
      <span className="pill-dot"/>
      {STAGE_LABEL[stage]}
    </span>
  );
}

function DimCell({ value, onClick, label, colorOn }) {
  const tone = STATUS_KEY[value];
  return (
    <button
      className={`cell cell-${tone} ${colorOn?'cell-colored':'cell-mono'}`}
      onClick={onClick}
      title={`${label}: ${STATUS_LABEL[value]}`}
    >
      <span className="cell-glyph">{STATUS_GLYPH[value]}</span>
    </button>
  );
}

function TagChip({ on, onClick, label, kind }) {
  return (
    <button
      className={`tag tag-${kind} ${on?'tag-on':''}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >{label}</button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUMMARY STRIP — portfolio callout + filters + movers + stats
// ═══════════════════════════════════════════════════════════════════

function SummaryStrip({ stats, sprintNumber, weekLabel, zoneFilter, setZoneFilter, zoneCounts, sprintOnly, onSprintToggle }) {
  const coveragePct = stats.coverage;
  const tone = coveragePct >= 70 ? 'ready' : coveragePct >= 40 ? 'deep' : 'open';
  const verdict =
    coveragePct >= 80 ? 'On Track' :
    coveragePct >= 60 ? 'Neutral' :
    coveragePct >= 40 ? 'Watch' : 'Behind';

  // movers — pick 4 teams currently in motion (mixed states) as "this week"
  const movers = useMemo(() => {
    const inMotion = window.TEAMS
      .filter(t => {
        const st = stats.statusMap[t.id] || t.status;
        const r = st.filter(s=>s===2).length;
        const w = st.filter(s=>s===1).length;
        return w >= 1 && r >= 1 && r < 5;
      })
      .map(t => {
        const st = stats.statusMap[t.id] || t.status;
        const r = st.filter(s=>s===2).length;
        const delta = +(((r / 5) - 0.5) * 2).toFixed(1); // synthetic delta
        return { team: t, ready: r, delta };
      })
      .sort((a,b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 5);
    return inMotion;
  }, [stats.statusMap]);

  const improving = window.TEAMS.filter(t => {
    const st = stats.statusMap[t.id] || t.status;
    const r = st.filter(s=>s===2).length;
    return r >= 1;
  }).length;
  const declining = window.TEAMS.filter(t => {
    const st = stats.statusMap[t.id] || t.status;
    const some = st.filter(s=>s!==0).length;
    return some === 0;
  }).length;

  return (
    <div className="strip">
      <div className="strip-filters">
        <div className="strip-filter">
          <span className="strip-filter-label">SPRINT</span>
          <button className="strip-filter-pick">
            <span className="strip-filter-dot"/>{sprintNumber}
            <svg width="9" height="6" viewBox="0 0 9 6"><path d="M1 1 L4.5 5 L8 1" stroke="currentColor" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        <div className="strip-filter">
          <span className="strip-filter-label">WEEK</span>
          <button className="strip-filter-pick">
            {weekLabel}
            <svg width="9" height="6" viewBox="0 0 9 6"><path d="M1 1 L4.5 5 L8 1" stroke="currentColor" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      <div className={`callout callout-${tone}`}>
        <div className="callout-eyebrow">COVERAGE</div>
        <div className="callout-num">{coveragePct}<small>%</small></div>
        <div className="callout-meta">
          <span className="callout-delta callout-delta-up">▲ {Math.round(stats.ready/2)}</span>
          <div className="callout-bar">
            <div className="callout-bar-fill" style={{width:`${coveragePct}%`}}/>
          </div>
        </div>
        <div className={`callout-verdict callout-verdict-${tone}`}>{verdict}</div>
      </div>

      <div className="strip-movers">
        <span className="strip-movers-arrow">↑</span>
        {movers.map((m, i) => {
          const dir = m.delta >= 0 ? 'up' : 'down';
          return (
            <span key={m.team.id} className={`mover mover-${dir}`}>
              <span className="mover-name">{m.team.name.length > 14 ? m.team.name.slice(0,12)+'…' : m.team.name}</span>
              <span className="mover-delta">{m.delta>=0?'▲+':'▼'}{Math.abs(m.delta)}</span>
              <span className="mover-score">{m.ready}.0</span>
            </span>
          );
        })}
      </div>

      <div className="strip-stats">
        <div className="strip-stat strip-stat-up">
          <div className="strip-stat-num">↑{stats.stages.finalizing + Math.floor(improving/4)}</div>
          <div className="strip-stat-label">Progressing</div>
        </div>
        <div className="strip-stat strip-stat-down">
          <div className="strip-stat-num">↓{stats.stages['not-started']}</div>
          <div className="strip-stat-label">Stalled</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FILTER RAIL — section header + status tabs + search + sprint
// ═══════════════════════════════════════════════════════════════════

function FilterRail({
  zoneFilter, setZoneFilter, zoneCounts,
  statusFilter, setStatusFilter, statusStats,
  search, setSearch,
  sprintOnly, onSprintToggle, sprintCount,
  colorOn, setColorOn,
  weekLabel,
}) {
  return (
    <>
    <div className="section">
      <h2 className="section-title">
        <span className="section-bar"/>
        Research Heatmap
      </h2>
      <div className="section-meta">
        <span>{zoneFilter==='all' ? 'ALL ZONES' : window.ZONES.find(z=>z.id===zoneFilter)?.label.toUpperCase()}</span>
        <span className="dot-sep">·</span>
        <span>ALL STAKEHOLDERS</span>
        <span className="dot-sep">·</span>
        <span>{weekLabel}</span>
      </div>
      <div className="section-actions">
        <button className={`mini-tool ${colorOn?'on':''}`} onClick={() => setColorOn(!colorOn)}>
          <span className="mini-tool-dot"/>
          Color: {colorOn ? 'ON' : 'OFF'}
        </button>
        <button className="mini-tool">
          <span>ⓘ</span> How to use
        </button>
      </div>
    </div>

    <div className="rail">
      <div className="rail-group">
        <span className="rail-eyebrow">Zone</span>
        <button className={`rail-link ${zoneFilter==='all'?'on':''}`} onClick={()=>setZoneFilter('all')}>
          All<span className="rail-link-count">{zoneCounts.all}</span>
        </button>
        {window.ZONES.map(z => (
          <button key={z.id}
            className={`rail-link ${zoneFilter===z.id?'on':''}`}
            onClick={()=>setZoneFilter(z.id)}
            style={zoneFilter===z.id ? {color: z.color, borderColor: z.color} : null}
          >
            {z.label}<span className="rail-link-count">{zoneCounts[z.id]}</span>
          </button>
        ))}
      </div>

      <div className="rail-group">
        <span className="rail-eyebrow">Stage</span>
        <button className={`rail-link ${statusFilter==='all'?'on':''}`} onClick={()=>setStatusFilter('all')}>All</button>
        <button className={`rail-link ${statusFilter==='finalizing'?'on':''}`} onClick={()=>setStatusFilter('finalizing')}>
          Ready<span className="rail-link-count">{statusStats.finalizing}</span>
        </button>
        <button className={`rail-link ${statusFilter==='deep-dive'?'on':''}`} onClick={()=>setStatusFilter('deep-dive')}>
          WIP<span className="rail-link-count">{statusStats['deep-dive']}</span>
        </button>
        <button className={`rail-link ${statusFilter==='not-started'?'on':''}`} onClick={()=>setStatusFilter('not-started')}>
          Open<span className="rail-link-count">{statusStats['not-started']}</span>
        </button>
      </div>

      <div className="rail-spacer"/>

      <div className="rail-search">
        <span className="rail-search-icon">
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M9.5 9.5 L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </span>
        <input placeholder="Search team or person…" value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      <button className={`sprint-button ${sprintOnly?'on':''}`} onClick={onSprintToggle} title="Show this sprint only (S)">
        <span className="sprint-dot"/>
        Sprint focus
        <span className="sprint-button-num">{sprintCount}</span>
      </button>
    </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HEATMAP TABLE
// ═══════════════════════════════════════════════════════════════════

function HeatmapTable({ grouped, state, setState, expandedRow, setExpandedRow, colorOn }) {
  return (
    <div className="heatmap">
      <header className="heatmap-head">
        <div className="hh-team">BUSINESS</div>
        <div className="hh-score">SCORE</div>
        <div className="hh-stage">STAGE</div>
        <div className="hh-dims">
          <div className="hh-group-label">RESEARCH DIMENSIONS</div>
          <div className="hh-dim-cols">
            {window.DIMENSIONS.map(d => (
              <div key={d.id} className="hh-dim">{d.short}</div>
            ))}
          </div>
        </div>
        <div className="hh-tags">
          <div className="hh-group-label">TAGS</div>
          <div className="hh-tag-cols">
            <div className="hh-tag">KR1</div>
            <div className="hh-tag">KR2</div>
            <div className="hh-tag">SPR</div>
          </div>
        </div>
        <div className="hh-trend">TREND</div>
        <div className="hh-detail">DETAIL</div>
      </header>

      {grouped.length === 0 && (
        <div className="heatmap-empty">
          <div className="heatmap-empty-mark">∅</div>
          No teams match the current filters.
        </div>
      )}

      {grouped.map(({person, teams}) => (
        <PersonGroup
          key={person.id}
          person={person}
          teams={teams}
          state={state}
          setState={setState}
          expandedRow={expandedRow}
          setExpandedRow={setExpandedRow}
          colorOn={colorOn}
        />
      ))}
    </div>
  );
}

function PersonGroup({ person, teams, state, setState, expandedRow, setExpandedRow, colorOn }) {
  const allStatus = teams.flatMap(t => state.status[t.id] || t.status);
  const ready = allStatus.filter(s => s===2).length;
  const pct   = Math.round((ready/allStatus.length)*100);
  const zones = [...new Set(teams.map(t => t.zone))]
    .map(zid => window.ZONES.find(z => z.id === zid));
  const target = teams.length * 5;

  return (
    <section className="pgroup">
      <header className="pgroup-row">
        <div className="pgroup-name">
          <span className="pgroup-initials">{person.initials}</span>
          <span className="pgroup-fullname">{person.name}</span>
          <span className="pgroup-zones">
            {zones.map((z, i) => (
              <span key={z.id} className="pgroup-zone">
                <span className="pgroup-zone-bar" style={{background: z.color}}/>
                {z.label}{i<zones.length-1 ? ',' : ''}
              </span>
            ))}
          </span>
        </div>
        <div className="pgroup-stats">
          <span>TARGET <b>{target}</b></span>
          <span className="dot-sep">·</span>
          <span><b>{ready}</b>/{target} READY</span>
          <span className="dot-sep">·</span>
          <span className={`pgroup-pct pgroup-pct-${pct>=70?'ready':pct>=40?'deep':'open'}`}>{pct}%</span>
        </div>
      </header>
      {teams.map(t => (
        <TeamRow
          key={t.id}
          team={t}
          state={state}
          setState={setState}
          expanded={expandedRow === t.id}
          onToggleExpand={() => setExpandedRow(expandedRow === t.id ? null : t.id)}
          colorOn={colorOn}
        />
      ))}
    </section>
  );
}

function TeamRow({ team, state, setState, expanded, onToggleExpand, colorOn }) {
  const status = state.status[team.id] || team.status;
  const notes  = state.notes[team.id] || '';
  const score  = teamScore(status);
  const stage  = calcStage(status);
  const kr1    = !!state.kr1[team.id];
  const kr2    = !!state.kr2[team.id];
  const sprint = !!state.sprint[team.id];
  const zone   = window.ZONES.find(z => z.id === team.zone);

  // which dim is open for detail editing (null = none)
  const [openDim, setOpenDim] = React.useState(null);

  const cycle = (i) => {
    const next = [...status];
    next[i] = (next[i] + 1) % 3;
    setState(s => ({...s, status: {...s.status, [team.id]: next}}));
  };
  const setNote = (v) => {
    setState(s => ({...s, notes: {...s.notes, [team.id]: v}}));
  };
  const setDimDetail = (dimId, v) => {
    setState(s => ({
      ...s,
      dimDetails: {
        ...(s.dimDetails || {}),
        [team.id]: {
          ...((s.dimDetails || {})[team.id] || {}),
          [dimId]: v,
        },
      },
    }));
  };
  const getDimDetail = (dimId) => {
    return ((state.dimDetails || {})[team.id] || {})[dimId] || '';
  };
  const flip = (key) => () => {
    setState(s => ({...s, [key]: {...s[key], [team.id]: !s[key][team.id]}}));
  };

  const DIM_PLACEHOLDER = {
    outcome:      'What outcome does this team actually drive? What would break without them?',
    output:       'What do they ship? What SLA exists — and is it met? Any numbers?',
    solutions:    'How do they solve the core problem? What tools, processes, automations?',
    loading:      'How many requests / tasks / people do they handle? Peaks? Bottlenecks?',
    satisfaction: 'How do stakeholders rate the team? NPS, CSAT, informal signals?',
  };

  return (
    <>
    <div className={`trow ${expanded?'trow-open':''} ${sprint?'trow-sprint':''}`}>
      <div className="trow-team">
        <div className="trow-name">{team.name}</div>
        <div className="trow-zone">
          <span className="trow-zone-bar" style={{background: zone.color}}/>
          {zone.label}
        </div>
      </div>
      <div className="trow-score"><ScoreChip value={score} max={5}/></div>
      <div className="trow-stage"><StagePill stage={stage}/></div>
      <div className="trow-dims">
        {status.map((v,i) => (
          <DimCell
            key={i}
            value={v}
            colorOn={colorOn}
            label={window.DIMENSIONS[i].full}
            onClick={() => cycle(i)}
          />
        ))}
      </div>
      <div className="trow-tags">
        <TagChip kind="kr1" on={kr1} onClick={flip('kr1')} label="KR1"/>
        <TagChip kind="kr2" on={kr2} onClick={flip('kr2')} label="KR2"/>
        <TagChip kind="sprint" on={sprint} onClick={flip('sprint')} label="SPR"/>
      </div>
      <div className="trow-trend">
        <TrendBar status={status}/>
        <span className={`trow-trend-delta trow-trend-delta-${score>=3?'up':'down'}`}>
          {score>=3?'+':'·'}{score>=3?score-2:0}
        </span>
      </div>
      <div className="trow-detail">
        <button className="deepdive" onClick={onToggleExpand}>
          {expanded ? '— Close' : 'Deep dive →'}
        </button>
      </div>
    </div>

    {expanded && (
      <div className="trow-expand">
        <div className="trow-expand-inner">
          <div className="trow-expand-cols">

            {/* LEFT — dimension list with per-dim detail panel */}
            <div className="trow-expand-dims">
              <div className="trow-expand-label">DIMENSIONS — click status to add detail</div>
              {window.DIMENSIONS.map((d, i) => {
                const detail   = getDimDetail(d.id);
                const isOpen   = openDim === d.id;
                const hasDetail = detail.trim().length > 0;
                return (
                  <div key={d.id} className="trow-dim-wrap">
                    <div className={`trow-expand-dim trow-expand-dim-${STATUS_KEY[status[i]]} ${isOpen ? 'trow-expand-dim-active' : ''}`}>
                      {/* cycle status on glyph click */}
                      <button
                        className="dim-cycle-btn"
                        onClick={() => cycle(i)}
                        title="Click to cycle status"
                      >
                        <span className="trow-expand-dim-glyph">{STATUS_GLYPH[status[i]]}</span>
                      </button>
                      <span className="trow-expand-dim-name">{d.full}</span>
                      {/* open detail panel on status pill click */}
                      <button
                        className={`trow-expand-dim-state dim-detail-trigger ${hasDetail ? 'dim-detail-has' : ''}`}
                        onClick={() => setOpenDim(isOpen ? null : d.id)}
                        title={isOpen ? 'Close detail' : 'Add what is under the hood'}
                      >
                        {STATUS_LABEL[status[i]]}
                        <span className="dim-detail-arrow">{isOpen ? '▲' : '▼'}</span>
                      </button>
                    </div>

                    {/* inline detail panel */}
                    {isOpen && (
                      <div className="dim-detail-panel">
                        <div className="dim-detail-header">
                          <span className="dim-detail-eyebrow">WHAT'S UNDER THE HOOD</span>
                          <span className="dim-detail-counter">{detail.length} chars</span>
                        </div>
                        <textarea
                          className="dim-detail-area"
                          value={detail}
                          onChange={e => setDimDetail(d.id, e.target.value)}
                          placeholder={DIM_PLACEHOLDER[d.id] || 'Describe what data, tools or signals confirm this status…'}
                          rows={4}
                          autoFocus
                        />
                        {detail.trim().length > 0 && (
                          <div className="dim-detail-preview">
                            <span className="dim-detail-preview-dot"/>
                            {detail.trim().split('\n').filter(Boolean).map((line, j) => (
                              <div key={j} className="dim-detail-preview-line">{line}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* collapsed preview — show first line if has content and closed */}
                    {!isOpen && hasDetail && (
                      <div className="dim-detail-collapsed" onClick={() => setOpenDim(d.id)}>
                        <span className="dim-detail-collapsed-dot"/>
                        <span className="dim-detail-collapsed-text">
                          {detail.trim().split('\n')[0].slice(0, 80)}{detail.trim().split('\n')[0].length > 80 ? '…' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* RIGHT — general field notes */}
            <div className="trow-expand-notes">
              <div className="trow-expand-label">FIELD NOTES <span className="trow-expand-counter">{notes.length} chars</span></div>
              <textarea
                value={notes}
                onChange={e => setNote(e.target.value)}
                placeholder="What did they say? What's the open question? Where to push next?"
                rows={6}
              />
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}


function TrendBar({ status }) {
  return (
    <span className="trendbar">
      {status.map((v,i) => (
        <span key={i} className={`trendbar-seg trendbar-seg-${STATUS_KEY[v]}`}/>
      ))}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SPRINT ASIDE (sidebar)
// ═══════════════════════════════════════════════════════════════════

function SprintAside({ open, onClose, state, setState }) {
  const sprintTeams = window.TEAMS.filter(t => state.sprint[t.id]);
  const byPerson = useMemo(() => {
    const map = {};
    sprintTeams.forEach(t => { (map[t.person] = map[t.person] || []).push(t); });
    return map;
  }, [sprintTeams]);

  const [copiedId, setCopiedId] = useState(null);
  const copy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1400);
  };

  const totalReady = sprintTeams.reduce((acc,t) => {
    const st = state.status[t.id] || t.status;
    return acc + st.filter(s=>s===2).length;
  }, 0);
  const totalDims = sprintTeams.length * 5;
  const pct = totalDims ? Math.round(totalReady/totalDims*100) : 0;

  return (
    <aside className={`aside ${open ? 'aside-open' : ''}`}>
      <header className="aside-head">
        <div className="aside-eyebrow">Sprint 08 · Outreach queue</div>
        <h2 className="aside-title">This week's<br/>conversations</h2>
        <p className="aside-desc">
          {sprintTeams.length === 0
            ? <>Nothing queued yet. Tag a row with <b>SPR</b> to add it.</>
            : <>{sprintTeams.length} team{sprintTeams.length===1?'':'s'} across {Object.keys(byPerson).length} stakeholder{Object.keys(byPerson).length===1?'':'s'} · {pct}% captured.</>}
        </p>
        <button className="aside-close" onClick={onClose} aria-label="close">
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </button>
      </header>

      <div className="aside-body">
        {Object.keys(byPerson).length === 0 && (
          <div className="aside-empty">
            <div className="aside-empty-mark">○</div>
            <p>The queue is empty.</p>
            <p className="aside-empty-sub">Tag any team's <b>SPR</b> chip to queue a conversation here.</p>
          </div>
        )}
        {Object.entries(byPerson).map(([pid, teams]) => {
          const person = window.PEOPLE.find(p => p.id === pid);
          const msg = buildMessage(person, teams, state.status);
          return (
            <div key={pid} className="aside-entry">
              <header className="aside-entry-head">
                <span className="aside-entry-initials">{person.initials}</span>
                <div>
                  <div className="aside-entry-name">{person.name}</div>
                  <div className="aside-entry-meta">{teams.length} item{teams.length===1?'':'s'} to close</div>
                </div>
              </header>
              <ul className="aside-teams">
                {teams.map(t => {
                  const st = state.status[t.id] || t.status;
                  const missing = window.DIMENSIONS.map((d,i)=> st[i]!==2 ? d.short : null).filter(Boolean);
                  return (
                    <li key={t.id}>
                      <div className="aside-team-name">{t.name}</div>
                      <div className="aside-team-need">
                        {missing.length === 0 ? 'final read only' : 'need ' + missing.join(' · ').toLowerCase()}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <pre className="aside-msg">{msg}</pre>
              <button
                className={`aside-copy ${copiedId===pid?'aside-copy-ok':''}`}
                onClick={() => copy(pid, msg)}
              >
                {copiedId===pid ? 'Copied to clipboard' : 'Copy message'}
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

Object.assign(window, {
  SummaryStrip, FilterRail, HeatmapTable, PersonGroup, TeamRow,
  SprintAside, calcStage, STAGE_LABEL, STATUS_LABEL, STATUS_GLYPH, STATUS_KEY,
  ScoreChip, StagePill,
});
