/* SKELAR Platform Research -- Field Map v2 + Teams Directory */
const { useState: useStateT, useEffect: useEffectT, useMemo: useMemoT, useRef: useRefT, useCallback: useCallbackT } = React;

function dimColor(dim) {
  if (window.DIM_INFO[dim]) return window.DIM_INFO[dim].color;
  // custom blocks get a neutral color
  return '#5a6475';
}

// --- unique id helper -------------------------------------------
function uid() { return Math.random().toString(36).slice(2, 8); }

// ================================================================
// FIELD MAP TAB
// ================================================================

function FieldMap({ metricsState, setMetricsState }) {
  const allMetrics = useMemoT(() => {
    const defs = window.METRICS_DEFAULT;
    const merged = defs.map(m => ({
      ...m,
      active: metricsState.metrics[m.id]?.active ?? m.active,
      custom: false,
    }));
    const extras = (metricsState.extras || []).map(m => ({ ...m, custom: true }));
    return [...merged, ...extras];
  }, [metricsState]);

  const byDim = useMemoT(() => {
    const map = {};
    // built-in dims
    Object.keys(window.DIM_INFO).forEach(d => map[d] = []);
    // custom dims
    (metricsState.customDims || []).forEach(d => map[d.id] = []);
    allMetrics.forEach(m => { (map[m.dim] = map[m.dim] || []).push(m); });
    return map;
  }, [allMetrics, metricsState.customDims]);

  // all dim ids = built-in + custom
  const allDimIds = useMemoT(() => {
    const builtIn = Object.keys(window.DIM_INFO);
    const custom  = (metricsState.customDims || []).map(d => d.id);
    return [...builtIn, ...custom];
  }, [metricsState.customDims]);

  // all dim info map
  const allDimInfo = useMemoT(() => {
    const map = { ...window.DIM_INFO };
    (metricsState.customDims || []).forEach(d => { map[d.id] = d; });
    return map;
  }, [metricsState.customDims]);

  // team blocks
  const teamBlocks = metricsState.teamBlocks || {};
  const setTeamBlocks = (updater) => {
    setMetricsState(s => ({
      ...s,
      teamBlocks: typeof updater === 'function' ? updater(s.teamBlocks || {}) : updater,
    }));
  };

  const toggleMetric = (id) => {
    setMetricsState(s => ({
      ...s,
      metrics: {
        ...s.metrics,
        [id]: { active: !(s.metrics[id]?.active ?? (window.METRICS_DEFAULT.find(m => m.id === id)?.active ?? false)) }
      }
    }));
  };

  const addMetric = (dim, name, unit) => {
    if (!name.trim()) return;
    const id = 'm-c-' + uid();
    setMetricsState(s => ({
      ...s,
      extras: [...(s.extras || []), { id, dim, name: name.trim(), unit: (unit || '').trim() || '--', scope: 'Custom', active: true }]
    }));
  };

  const removeCustom = (id) => {
    setMetricsState(s => ({ ...s, extras: (s.extras || []).filter(m => m.id !== id) }));
  };

  // positions for ALL dims (built-in + custom)
  const positions = useMemoT(() => {
    const p = {};
    allDimIds.forEach(d => {
      p[d] = (metricsState.positions && metricsState.positions[d]) || window.DIM_POS[d] || { x: 20, y: 20 };
    });
    // team block positions
    Object.keys(teamBlocks).forEach(tid => {
      p['team-' + tid] = teamBlocks[tid].pos || { x: 60, y: 60 };
    });
    return p;
  }, [metricsState.positions, metricsState.customDims, teamBlocks]);

  const setPosition = (id, pos) => {
    if (id.startsWith('team-')) {
      const tid = id.replace('team-', '');
      setTeamBlocks(prev => ({ ...prev, [tid]: { ...prev[tid], pos } }));
    } else {
      setMetricsState(s => ({ ...s, positions: { ...(s.positions || {}), [id]: pos } }));
    }
  };

  // deps with optional metric anchor
  const deps = metricsState.deps || window.DIM_DEPS;
  const removeDep  = (idx) => setMetricsState(s => ({ ...s, deps: (s.deps || window.DIM_DEPS).filter((_, i) => i !== idx) }));
  const addDep = (from, fromMetric, to, toMetric) => {
    if (from === to) return;
    const list = metricsState.deps || window.DIM_DEPS;
    setMetricsState(s => ({
      ...s,
      deps: [...(s.deps || window.DIM_DEPS), { from, fromMetric: fromMetric || null, to, toMetric: toMetric || null, label: 'influences' }]
    }));
  };

  // connect mode -- now stores { id, metricId } for source
  const [connectMode, setConnectMode] = useStateT(false);
  const [connectFrom, setConnectFrom] = useStateT(null); // { id, metricId }

  const onBlockClick   = (id) => {
    if (!connectMode) return;
    if (!connectFrom) { setConnectFrom({ id, metricId: null }); return; }
    if (connectFrom.id !== id) addDep(connectFrom.id, connectFrom.metricId, id, null);
    setConnectFrom(null); setConnectMode(false);
  };
  const onMetricClick  = (dimId, metricId) => {
    if (!connectMode) return;
    if (!connectFrom) { setConnectFrom({ id: dimId, metricId }); return; }
    if (connectFrom.id !== dimId || connectFrom.metricId !== metricId) {
      addDep(connectFrom.id, connectFrom.metricId, dimId, metricId);
    }
    setConnectFrom(null); setConnectMode(false);
  };

  useEffectT(() => {
    if (!connectMode) return;
    const h = (e) => { if (e.key === 'Escape') { setConnectMode(false); setConnectFrom(null); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [connectMode]);

  // add custom dimension block
  const addCustomDim = () => {
    const id = 'cdim-' + uid();
    const newDim = { id, color: '#5a6475', question: 'What does this dimension measure?', isCustom: true };
    setMetricsState(s => ({
      ...s,
      customDims: [...(s.customDims || []), newDim],
      positions: { ...(s.positions || {}), [id]: { x: 30 + Math.random() * 40, y: 30 + Math.random() * 40 } }
    }));
  };
  const removeCustomDim = (id) => {
    setMetricsState(s => ({
      ...s,
      customDims: (s.customDims || []).filter(d => d.id !== id),
      extras: (s.extras || []).filter(m => m.dim !== id),
      deps: (s.deps || window.DIM_DEPS).filter(d => d.from !== id && d.to !== id),
    }));
  };
  const updateCustomDimLabel = (id, label) => {
    setMetricsState(s => ({
      ...s,
      customDims: (s.customDims || []).map(d => d.id === id ? { ...d, label, question: label } : d)
    }));
  };

  // add team block
  const [showTeamPicker, setShowTeamPicker] = useStateT(false);
  const addTeamBlock = (team) => {
    setTeamBlocks(prev => ({
      ...prev,
      [team.id]: { teamId: team.id, pos: { x: 25 + Math.random() * 40, y: 25 + Math.random() * 40 } }
    }));
    setShowTeamPicker(false);
  };
  const removeTeamBlock = (tid) => {
    setTeamBlocks(prev => {
      const next = { ...prev };
      delete next[tid];
      return next;
    });
    // remove deps that involve this team block
    setMetricsState(s => ({
      ...s,
      deps: (s.deps || window.DIM_DEPS).filter(d => d.from !== 'team-' + tid && d.to !== 'team-' + tid),
    }));
  };

  const resetLayout = () => {
    setMetricsState(s => { const c = { ...s }; delete c.positions; delete c.deps; return c; });
  };

  const positionsModified = !!(metricsState.positions && Object.keys(metricsState.positions).length);
  const depsModified = !!metricsState.deps;
  const activeCount = allMetrics.filter(m => m.active).length;
  const totalCount  = allMetrics.length;

  return (
    <div className="map-tab">
      <div className="map-intro">
        <p className="map-intro-lede">
          Drag <b>dimension blocks</b> and <b>team blocks</b> freely. Click a metric dot or block header to start a connection -- arrows snap to the specific metric. Add custom dimensions or team nodes with the toolbar.
        </p>
        <div className="map-intro-meta">
          <div className="map-intro-fig"><div className="map-intro-fig-num">{activeCount}<small>/{totalCount}</small></div><div className="map-intro-fig-label">Metrics active</div></div>
          <div className="map-intro-fig"><div className="map-intro-fig-num">{allDimIds.length}</div><div className="map-intro-fig-label">Dimensions</div></div>
          <div className="map-intro-fig"><div className="map-intro-fig-num">{deps.length}</div><div className="map-intro-fig-label">Links</div></div>
          <div className="map-intro-fig"><div className="map-intro-fig-num">{Object.keys(teamBlocks).length}</div><div className="map-intro-fig-label">Team nodes</div></div>
        </div>
      </div>

      <div className="map-toolbar">
        {!connectMode ? (
          <>
            <button className="map-tool map-tool-primary" onClick={() => setConnectMode(true)}>
              <span className="map-tool-plus">+</span> Connect
            </button>
            <button className="map-tool" onClick={addCustomDim}>
              <span className="map-tool-plus">+</span> New dimension
            </button>
            <button className="map-tool" onClick={() => setShowTeamPicker(v => !v)} style={showTeamPicker ? { background: '#1c1916', color: '#fff' } : {}}>
              <span className="map-tool-plus">+</span> Add team
            </button>
            <button className="map-tool" onClick={resetLayout} disabled={!positionsModified && !depsModified}>Reset layout</button>
            <span className="map-toolbar-hint">Drag to move . click metric dot to connect . hover arrow label to remove</span>
          </>
        ) : (
          <div className="map-connect-banner">
            {!connectFrom
              ? <><span className="banner-dot"/> Click a <b>block</b> or a specific <b>metric dot</b> as the source</>
              : <><span className="banner-dot"/> Source: <em>{connectFrom.metricId || connectFrom.id}</em> -- now click the <b>target</b></>
            }
            <button className="banner-cancel" onClick={() => { setConnectMode(false); setConnectFrom(null); }}>esc . cancel</button>
          </div>
        )}
      </div>

      {showTeamPicker && (
        <div className="team-picker">
          <div className="team-picker-label">Pick a team to add as a node:</div>
          <div className="team-picker-list">
            {window.TEAMS.filter(t => !teamBlocks[t.id]).map(t => {
              const zone = window.ZONES.find(z => z.id === t.zone);
              return (
                <button key={t.id} className="team-picker-item" onClick={() => addTeamBlock(t)}>
                  <span className="team-picker-bar" style={{ background: zone.color }}/>
                  {t.name}
                  <span className="team-picker-zone">{zone.label}</span>
                </button>
              );
            })}
            {window.TEAMS.filter(t => !teamBlocks[t.id]).length === 0 && (
              <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>All teams already added.</span>
            )}
          </div>
        </div>
      )}

      <FieldMapCanvas
        positions={positions}
        setPosition={setPosition}
        deps={deps}
        byDim={byDim}
        allDimIds={allDimIds}
        allDimInfo={allDimInfo}
        teamBlocks={teamBlocks}
        removeTeamBlock={removeTeamBlock}
        connectMode={connectMode}
        connectFrom={connectFrom}
        onBlockClick={onBlockClick}
        onMetricClick={onMetricClick}
        toggleMetric={toggleMetric}
        addMetric={addMetric}
        removeCustom={removeCustom}
        removeDep={removeDep}
        removeCustomDim={removeCustomDim}
        updateCustomDimLabel={updateCustomDimLabel}
      />
    </div>
  );
}

// --- canvas ----------------------------------------------------
function FieldMapCanvas({
  positions, setPosition, deps, byDim,
  allDimIds, allDimInfo, teamBlocks, removeTeamBlock,
  connectMode, connectFrom,
  onBlockClick, onMetricClick,
  toggleMetric, addMetric, removeCustom, removeDep,
  removeCustomDim, updateCustomDimLabel,
}) {
  const ref   = useRefT(null);
  const [size, setSize] = useStateT({ w: 1100, h: 860 });
  // store actual rendered block heights so arrows can anchor to metric rows
  const blockHeights = useRefT({});
  const setBlockHeight = (id, h) => { blockHeights.current[id] = h; };

  useEffectT(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const BLOCK_W = 230;
  const HEADER_H = 90;    // approx header height
  const METRIC_H = 28;    // height per metric row

  // pixel position of a node (dim or team)
  const pxPos = (id) => {
    const raw = positions[id] || { x: 20, y: 20 };
    return { x: (raw.x / 100) * size.w, y: (raw.y / 100) * size.h };
  };

  // get anchor point for a dep endpoint
  // returns { x, y } in canvas coords
  const getAnchor = (nodeId, metricId, side) => {
    const p = pxPos(nodeId);
    const bh = blockHeights.current[nodeId] || 220;
    const cx = p.x + BLOCK_W / 2;
    const cy = p.y + bh / 2;

    if (metricId && !nodeId.startsWith('team-')) {
      // find metric index in this dim's list
      const list = byDim[nodeId] || [];
      const idx  = list.findIndex(m => m.id === metricId);
      if (idx >= 0) {
        const metricY = p.y + HEADER_H + idx * METRIC_H + METRIC_H / 2;
        return side === 'left'
          ? { x: p.x,           y: metricY }
          : { x: p.x + BLOCK_W, y: metricY };
      }
    }
    // fallback: side anchor at block center-y
    return side === 'left'
      ? { x: p.x,           y: cy }
      : { x: p.x + BLOCK_W, y: cy };
  };

  const arrows = useMemoT(() => {
    return deps.map((d, idx) => {
      const fromP = pxPos(d.from);
      const toP   = pxPos(d.to);
      const fromBH = blockHeights.current[d.from] || 220;
      const toBH   = blockHeights.current[d.to]   || 220;

      // decide left/right exit
      const fromCx = fromP.x + BLOCK_W / 2;
      const toCx   = toP.x   + BLOCK_W / 2;
      const goRight = toCx > fromCx;

      const p1 = getAnchor(d.from, d.fromMetric, goRight ? 'right' : 'left');
      const p2 = getAnchor(d.to,   d.toMetric,   goRight ? 'left'  : 'right');

      const dx = p2.x - p1.x;
      const cpOff = Math.min(Math.abs(dx) * 0.45, 140);
      const cp1 = { x: p1.x + (goRight ? cpOff : -cpOff), y: p1.y };
      const cp2 = { x: p2.x + (goRight ? -cpOff : cpOff), y: p2.y };

      const path = `M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
      const mx   = (p1.x + p2.x) / 2;
      const my   = (p1.y + p2.y) / 2 - 10;

      const color = allDimInfo[d.from]?.color || '#aaa';
      const markerId = d.from.replace(/[^a-z0-9]/gi, '_');

      return { id: `${d.from}-${d.to}-${idx}`, depIdx: idx, path, mx, my, label: d.label, color, markerId };
    });
  }, [positions, deps, size, byDim]);

  // drag
  const startDrag = (id, e) => {
    if (connectMode) return;
    if (!ref.current) return;
    const startX = e.clientX, startY = e.clientY;
    const startPos = positions[id] || { x: 20, y: 20 };
    const rect = ref.current.getBoundingClientRect();
    const onMove = (ev) => {
      const dx = (ev.clientX - startX) / rect.width  * 100;
      const dy = (ev.clientY - startY) / rect.height * 100;
      setPosition(id, {
        x: Math.max(0, Math.min(90, startPos.x + dx)),
        y: Math.max(0, Math.min(90, startPos.y + dy)),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // collect unique marker colors
  const markerColors = useMemoT(() => {
    const seen = new Set();
    const out = [];
    deps.forEach(d => {
      const color = allDimInfo[d.from]?.color || '#aaa';
      const id = d.from.replace(/[^a-z0-9]/gi, '_');
      if (!seen.has(id)) { seen.add(id); out.push({ id, color }); }
    });
    return out;
  }, [deps, allDimInfo]);

  return (
    <div className={`map-canvas ${connectMode ? 'connect-mode' : ''}`} ref={ref}>
      <svg className="map-arrows" width={size.w} height={size.h} style={{ overflow: 'visible' }}>
        <defs>
          {markerColors.map(({ id, color }) => (
            <marker key={id} id={`ah-${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} opacity="0.8"/>
            </marker>
          ))}
        </defs>
        {arrows.map(a => (
          <g key={a.id} className="arrow-group">
            <path d={a.path} fill="none" stroke={a.color} strokeOpacity="0.5" strokeWidth="1.5"
              markerEnd={`url(#ah-${a.markerId})`} className="arrow-path"/>
            {/* wider invisible hit area */}
            <path d={a.path} fill="none" stroke="transparent" strokeWidth="20" className="arrow-hit"/>
            <g transform={`translate(${a.mx},${a.my})`} className="arrow-label">
              <rect x="-32" y="-9" width="64" height="18" rx="3" fill="#f3eee3" stroke={a.color} strokeOpacity="0.25"/>
              <text textAnchor="middle" dominantBaseline="middle" fontFamily="Newsreader,serif"
                fontStyle="italic" fontWeight="400" fontSize="12" fill={a.color}>
                {a.label}
              </text>
              <g className="arrow-remove" transform="translate(40,0)" onClick={() => removeDep(a.depIdx)}>
                <circle cx="0" cy="0" r="8" fill="#fff" stroke="#c92520" strokeWidth="1"/>
                <path d="M-3 -3 L3 3 M3 -3 L-3 3" stroke="#c92520" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
              </g>
            </g>
          </g>
        ))}
      </svg>

      {/* Dimension blocks */}
      {allDimIds.map((dim, i) => {
        const info = allDimInfo[dim] || { color: '#5a6475', question: '' };
        const p = pxPos(dim);
        return (
          <DimensionBlock
            key={dim}
            dim={dim}
            info={info}
            metrics={byDim[dim] || []}
            left={p.x} top={p.y}
            width={BLOCK_W}
            index={i}
            connectMode={connectMode}
            isConnectFrom={connectFrom?.id === dim}
            onBlockClick={() => onBlockClick(dim)}
            onMetricClick={(mId) => onMetricClick(dim, mId)}
            onDragStart={(e) => startDrag(dim, e)}
            onHeightChange={(h) => setBlockHeight(dim, h)}
            toggleMetric={toggleMetric}
            addMetric={addMetric}
            removeCustom={removeCustom}
            removeCustomDim={info.isCustom ? () => removeCustomDim(dim) : null}
            updateLabel={info.isCustom ? (label) => updateCustomDimLabel(dim, label) : null}
          />
        );
      })}

      {/* Team blocks */}
      {Object.values(teamBlocks).map(tb => {
        const team = window.TEAMS.find(t => t.id === tb.teamId);
        if (!team) return null;
        const zone = window.ZONES.find(z => z.id === team.zone);
        const p = pxPos('team-' + tb.teamId);
        return (
          <TeamBlock
            key={tb.teamId}
            team={team}
            zone={zone}
            left={p.x} top={p.y}
            width={BLOCK_W}
            connectMode={connectMode}
            isConnectFrom={connectFrom?.id === 'team-' + tb.teamId}
            onBlockClick={() => onBlockClick('team-' + tb.teamId)}
            onDragStart={(e) => startDrag('team-' + tb.teamId, e)}
            onHeightChange={(h) => setBlockHeight('team-' + tb.teamId, h)}
            onRemove={() => removeTeamBlock(tb.teamId)}
          />
        );
      })}
    </div>
  );
}

// --- Dimension block --------------------------------------------
function DimensionBlock({
  dim, info, metrics, left, top, width, index,
  connectMode, isConnectFrom,
  onBlockClick, onMetricClick, onDragStart, onHeightChange,
  toggleMetric, addMetric, removeCustom,
  removeCustomDim, updateLabel,
}) {
  const [adding, setAdding] = useStateT(false);
  const [name, setName]   = useStateT('');
  const [unit, setUnit]   = useStateT('');
  const [editLabel, setEditLabel] = useStateT(false);
  const [labelVal, setLabelVal]   = useStateT(info.label || dim);
  const ref = useRefT(null);

  useEffectT(() => {
    if (ref.current) onHeightChange(ref.current.offsetHeight);
  });

  const submit = () => {
    addMetric(dim, name, unit);
    setName(''); setUnit(''); setAdding(false);
  };

  const title = info.label || (dim.charAt(0).toUpperCase() + dim.slice(1));
  const activeCount = metrics.filter(m => m.active).length;

  return (
    <div
      ref={ref}
      className={`dim-block ${connectMode ? 'connectable' : ''} ${isConnectFrom ? 'is-from' : ''}`}
      style={{ left, top, width, borderColor: info.color, maxHeight: 'none', overflow: 'visible' }}
      onClick={connectMode ? onBlockClick : undefined}
    >
      <header
        className="dim-block-head"
        style={{ background: info.color, cursor: connectMode ? 'crosshair' : 'grab' }}
        onPointerDown={!connectMode ? onDragStart : undefined}
      >
        <div className="dim-block-eyebrow">
          <span className="dim-block-num">{String(index + 1).padStart(2, '0')}</span>
          <span className="dim-drag-hint">⠿</span>
          {removeCustomDim && (
            <button className="dim-remove-btn" onClick={(e) => { e.stopPropagation(); removeCustomDim(); }}
              title="Remove this block" style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.25)', border: 'none', color: '#fff', borderRadius: 3, padding: '1px 5px', cursor: 'pointer', fontSize: 11 }}>
              ×
            </button>
          )}
        </div>
        <div className="dim-block-headrow">
          {editLabel && updateLabel ? (
            <input
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontWeight: 600, fontSize: 15, borderRadius: 3, padding: '2px 4px', width: '100%' }}
              value={labelVal}
              autoFocus
              onChange={e => setLabelVal(e.target.value)}
              onBlur={() => { updateLabel(labelVal); setEditLabel(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { updateLabel(labelVal); setEditLabel(false); } }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <h3 className="dim-block-title" onDoubleClick={updateLabel ? () => setEditLabel(true) : undefined}
              title={updateLabel ? 'Double-click to rename' : ''}>{title}</h3>
          )}
          <div className="dim-block-stat"><b>{activeCount}</b><span>/{metrics.length}</span></div>
        </div>
        <p className="dim-block-q">{info.question}</p>
      </header>

      <div className="dim-block-scroll" style={{ maxHeight: 'none', overflow: 'visible' }}>
        {adding && (
          <div className="dim-add-inline">
            <input placeholder="Metric name..." value={name} onChange={e => setName(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setAdding(false); setName(''); setUnit(''); } }}/>
            <input placeholder="unit" value={unit} onChange={e => setUnit(e.target.value)} style={{ flex: '0 0 52px' }}
              onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setAdding(false); setName(''); setUnit(''); } }}/>
            <button onClick={submit} style={{ background: info.color }} title="Save">/</button>
            <button onClick={() => { setAdding(false); setName(''); setUnit(''); }} className="dim-add-cancel-btn" title="Cancel">×</button>
          </div>
        )}
        <ul className="dim-metrics">
          {metrics.map(m => (
            <li key={m.id}
              className={`dim-metric ${m.active ? 'on' : ''} ${connectMode ? 'metric-connectable' : ''}`}
              title={`${m.unit} . ${m.scope}`}
              onClick={connectMode ? (e) => { e.stopPropagation(); onMetricClick(m.id); } : undefined}
            >
              <button className="dim-metric-toggle" onClick={(e) => { e.stopPropagation(); if (!connectMode) toggleMetric(m.id); }}>
                <span className="dim-metric-bullet" style={m.active ? { background: info.color, borderColor: info.color } : {}}/>
              </button>
              <div className="dim-metric-name">{m.name}</div>
              <div className="dim-metric-unit">{m.unit}</div>
              {m.custom && (
                <button className="dim-metric-x" onClick={(e) => { e.stopPropagation(); removeCustom(m.id); }} title="Remove">×</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {!adding && (
        <button className="dim-add" onClick={(e) => { e.stopPropagation(); setAdding(true); }} style={{ color: info.color }}>
          + add metric
        </button>
      )}
    </div>
  );
}

// --- Team block -------------------------------------------------
function TeamBlock({ team, zone, left, top, width, connectMode, isConnectFrom, onBlockClick, onDragStart, onHeightChange, onRemove }) {
  const ref = useRefT(null);
  const desc = window.TEAM_DESC[team.id] || { mandate: '', kpis: [] };

  useEffectT(() => {
    if (ref.current) onHeightChange(ref.current.offsetHeight);
  });

  return (
    <div
      ref={ref}
      className={`dim-block team-block ${connectMode ? 'connectable' : ''} ${isConnectFrom ? 'is-from' : ''}`}
      style={{ left, top, width, borderColor: zone.color, borderStyle: 'dashed' }}
      onClick={connectMode ? onBlockClick : undefined}
    >
      <header
        className="dim-block-head"
        style={{ background: zone.color, cursor: connectMode ? 'crosshair' : 'grab', opacity: 0.92 }}
        onPointerDown={!connectMode ? onDragStart : undefined}
      >
        <div className="dim-block-eyebrow">
          <span className="dim-block-num" style={{ letterSpacing: '0.04em', fontSize: 9 }}>TEAM</span>
          <span className="dim-drag-hint">⠿</span>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.22)', border: 'none', color: '#fff', borderRadius: 3, padding: '1px 5px', cursor: 'pointer', fontSize: 11 }}>×</button>
        </div>
        <div className="dim-block-headrow">
          <h3 className="dim-block-title" style={{ fontSize: 14 }}>{team.name}</h3>
        </div>
        <p className="dim-block-q" style={{ fontSize: 11, opacity: 0.85, marginTop: 3 }}>{zone.label} zone</p>
      </header>
      <div style={{ padding: '10px 12px' }}>
        <p style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.45, margin: '0 0 8px' }}>{desc.mandate}</p>
        {desc.kpis.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {desc.kpis.map((k, i) => (
              <span key={i} style={{ fontSize: 10, background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 3, padding: '2px 6px', color: 'var(--ink-2)' }}>{k}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// TEAMS DIRECTORY TAB
// ================================================================

function TeamsDirectory({ state, setState, search }) {
  const [zoneFilter, setZoneFilter] = useStateT('all');

  const teams = useMemoT(() => {
    return window.TEAMS.filter(t => {
      if (zoneFilter !== 'all' && t.zone !== zoneFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const person = window.PEOPLE.find(p => p.id === t.person);
        const desc = window.TEAM_DESC[t.id]?.mandate || '';
        if (!t.name.toLowerCase().includes(q) && !person.name.toLowerCase().includes(q) && !desc.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [zoneFilter, search]);

  const grouped = useMemoT(() => {
    const map = {};
    teams.forEach(t => { (map[t.zone] = map[t.zone] || []).push(t); });
    return window.ZONES.filter(z => map[z.id]).map(z => ({ zone: z, teams: map[z.id] }));
  }, [teams]);

  const zoneCounts = useMemoT(() => {
    const map = { all: window.TEAMS.length };
    window.ZONES.forEach(z => map[z.id] = 0);
    window.TEAMS.forEach(t => map[t.zone]++);
    return map;
  }, []);

  return (
    <div className="teams-tab">
      <div className="teams-intro">
        <h2 className="teams-intro-title">The roster -- <em>twenty-five teams</em></h2>
        <p className="teams-intro-desc">Every internal team at SKELAR, what they own, who runs them, and the metrics that matter most. Use as a brief before an interview.</p>
        <div className="teams-rail">
          <span className="rail-eyebrow">Zone</span>
          <button className={`rail-link ${zoneFilter === 'all' ? 'on' : ''}`} onClick={() => setZoneFilter('all')}>All<span className="rail-link-count">{zoneCounts.all}</span></button>
          {window.ZONES.map(z => (
            <button key={z.id} className={`rail-link ${zoneFilter === z.id ? 'on' : ''}`}
              onClick={() => setZoneFilter(z.id)} style={zoneFilter === z.id ? { color: z.color } : null}>
              {z.label}<span className="rail-link-count">{zoneCounts[z.id]}</span>
            </button>
          ))}
        </div>
      </div>
      {grouped.map(({ zone, teams }) => (
        <section key={zone.id} className="teams-zone">
          <header className="teams-zone-head">
            <span className="teams-zone-bar" style={{ background: zone.color }}/>
            <h3 className="teams-zone-name">{zone.label}</h3>
            <span className="teams-zone-count">{teams.length} team{teams.length === 1 ? '' : 's'}</span>
          </header>
          <div className="teams-grid">
            {teams.map(t => {
              const person = window.PEOPLE.find(p => p.id === t.person);
              const desc = window.TEAM_DESC[t.id] || { mandate: '--', kpis: [] };
              const st = state.status[t.id] || t.status;
              const ready = st.filter(s => s === 2).length;
              const stage = window.calcStage(st);
              return (
                <article key={t.id} className="team-entry">
                  <div className="team-entry-num">{t.id.replace('t', '№ ')}</div>
                  <h4 className="team-entry-name">{t.name}</h4>
                  <p className="team-entry-mandate">{desc.mandate}</p>
                  <div className="team-entry-owner">
                    <span className="team-entry-owner-mark" style={{ borderColor: zone.color }}>{person.initials}</span>
                    <div>
                      <div className="team-entry-owner-name">{person.name}</div>
                      <div className="team-entry-owner-role">Contact . {zone.label.toLowerCase()} zone</div>
                    </div>
                  </div>
                  <div className="team-entry-kpis">
                    <span className="team-entry-kpis-label">Key KPIs</span>
                    <ul>{desc.kpis.map((k, j) => <li key={j}>{k}</li>)}</ul>
                  </div>
                  <div className="team-entry-status">
                    <span className={`team-entry-stage stage-${stage}`}><span className="stage-rule"/>{window.STAGE_LABEL[stage]}</span>
                    <span className="team-entry-frac">{ready}<small>/5</small></span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      {grouped.length === 0 && <div className="no-results"><div className="no-results-mark">O</div>No teams match this filter.</div>}
    </div>
  );
}


// -- KPI tag with note (Roster) ----------------------------------
function KpiTag({ teamId, kpi, state, setState }) {
  const [open, setOpen] = useStateT(false);
  const noteKey = teamId + ':' + kpi;
  const note = (state.kpiNotes || {})[noteKey] || '';
  const hasNote = note.trim().length > 0;
  const setNote = (v) => setState(s => ({
    ...s, kpiNotes: { ...(s.kpiNotes || {}), [noteKey]: v }
  }));
  return (
    <div className="kpi-tag-wrap">
      <button
        className={`kpi-tag-btn ${hasNote ? 'kpi-has-note' : ''}`}
        onClick={() => setOpen(v => !v)}
        title={hasNote ? 'Has context -- click to edit' : 'Add interview context'}
      >
        {hasNote && <span className="kpi-tag-dot"/>}
        {kpi}
      </button>
      {open && (
        <div className="kpi-note-panel">
          <div className="kpi-note-hint">Interview context</div>
          <textarea
            className="kpi-note-area"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={"What was said about " + kpi + "?"}
            rows={3}
            autoFocus
            onBlur={() => { if (!note.trim()) setOpen(false); }}
          />
        </div>
      )}
    </div>
  );
}

// TeamsDirectory with KpiTag support
function TeamsDirectory({ state, setState, search }) {
  const [zoneFilter, setZoneFilter] = useStateT('all');
  const teams = useMemoT(() => {
    return window.TEAMS.filter(t => {
      if (zoneFilter !== 'all' && t.zone !== zoneFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const person = window.PEOPLE.find(p => p.id === t.person);
        const desc = window.TEAM_DESC[t.id]?.mandate || '';
        if (!t.name.toLowerCase().includes(q) && !person.name.toLowerCase().includes(q) && !desc.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [zoneFilter, search]);
  const grouped = useMemoT(() => {
    const map = {};
    teams.forEach(t => { (map[t.zone] = map[t.zone] || []).push(t); });
    return window.ZONES.filter(z => map[z.id]).map(z => ({ zone: z, teams: map[z.id] }));
  }, [teams]);
  const zoneCounts = useMemoT(() => {
    const map = { all: window.TEAMS.length };
    window.ZONES.forEach(z => map[z.id] = 0);
    window.TEAMS.forEach(t => map[t.zone]++);
    return map;
  }, []);
  return (
    <div className="teams-tab">
      <div className="teams-intro">
        <h2 className="teams-intro-title">The roster -- <em>twenty-five teams</em></h2>
        <p className="teams-intro-desc">Every internal team at SKELAR. Click any <b>KPI tag</b> to add interview context -- what was said, what's the signal, what to follow up on.</p>
        <div className="teams-rail">
          <span className="rail-eyebrow">Zone</span>
          <button className={`rail-link ${zoneFilter==='all'?'on':''}`} onClick={()=>setZoneFilter('all')}>All<span className="rail-link-count">{zoneCounts.all}</span></button>
          {window.ZONES.map(z => (
            <button key={z.id} className={`rail-link ${zoneFilter===z.id?'on':''}`}
              onClick={()=>setZoneFilter(z.id)} style={zoneFilter===z.id?{color:z.color}:null}>
              {z.label}<span className="rail-link-count">{zoneCounts[z.id]}</span>
            </button>
          ))}
        </div>
      </div>
      {grouped.map(({zone, teams}) => (
        <section key={zone.id} className="teams-zone">
          <header className="teams-zone-head">
            <span className="teams-zone-bar" style={{background:zone.color}}/>
            <h3 className="teams-zone-name">{zone.label}</h3>
            <span className="teams-zone-count">{teams.length} team{teams.length===1?'':'s'}</span>
          </header>
          <div className="teams-grid">
            {teams.map(t => {
              const person = window.PEOPLE.find(p => p.id === t.person);
              const desc = window.TEAM_DESC[t.id] || { mandate: '--', kpis: [] };
              const st = state.status[t.id] || t.status;
              const ready = st.filter(s => s===2).length;
              const stage = window.calcStage(st);
              return (
                <article key={t.id} className="team-entry">
                  <div className="team-entry-num">{t.id.replace('t','№ ')}</div>
                  <h4 className="team-entry-name">{t.name}</h4>
                  <p className="team-entry-mandate">{desc.mandate}</p>
                  <div className="team-entry-owner">
                    <span className="team-entry-owner-mark" style={{borderColor:zone.color}}>{person.initials}</span>
                    <div>
                      <div className="team-entry-owner-name">{person.name}</div>
                      <div className="team-entry-owner-role">Contact . {zone.label.toLowerCase()} zone</div>
                    </div>
                  </div>
                  <div className="team-entry-kpis">
                    <span className="team-entry-kpis-label">Key KPIs</span>
                    <div style={{display:'flex',flexWrap:'wrap',gap:'0',marginTop:4}}>
                      {desc.kpis.map((k,j) => <KpiTag key={j} teamId={t.id} kpi={k} state={state} setState={setState}/>)}
                    </div>
                  </div>
                  <div className="team-entry-status">
                    <span className={`team-entry-stage stage-${stage}`}><span className="stage-rule"/>{window.STAGE_LABEL[stage]}</span>
                    <span className="team-entry-frac">{ready}<small>/5</small></span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      {grouped.length===0 && <div className="no-results"><div className="no-results-mark">O</div>No teams match.</div>}
    </div>
  );
}
Object.assign(window, { FieldMap, TeamsDirectory });

// ================================================================
// NEXT STEPS TAB
// ================================================================

function NextTab({ state, setState }) {
  const [doneChecks, setDoneChecks] = useStateT(() => {
    try { return JSON.parse(localStorage.getItem('skelar-research-checks') || '{}'); } catch { return {}; }
  });
  const toggleCheck = (key) => {
    setDoneChecks(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('skelar-research-checks', JSON.stringify(next));
      return next;
    });
  };

  // Build action lists from current state
  const meetings = useMemoT(() => {
    const out = [];
    const byPerson = {};
    window.TEAMS.forEach(t => {
      const st = state.status[t.id] || t.status;
      const stage = window.calcStage(st);
      const missing = window.DIMENSIONS.map((d,i) => st[i] !== 2 ? d.short : null).filter(Boolean);
      if (stage === 'not-started') {
        (byPerson[t.person] = byPerson[t.person] || { type: 'meet', teams: [] }).teams.push({ team: t, missing, stage });
      } else if (stage === 'deep-dive' && missing.length >= 3) {
        (byPerson[t.person] = byPerson[t.person] || { type: 'meet', teams: [] }).teams.push({ team: t, missing, stage });
      }
    });
    return Object.entries(byPerson).map(([pid, data]) => ({
      person: window.PEOPLE.find(p => p.id === pid),
      ...data,
    }));
  }, [state]);

  const slacks = useMemoT(() => {
    const out = [];
    const byPerson = {};
    window.TEAMS.forEach(t => {
      const st = state.status[t.id] || t.status;
      const stage = window.calcStage(st);
      const missing = window.DIMENSIONS.map((d,i) => st[i] !== 2 ? d.short : null).filter(Boolean);
      if (stage === 'deep-dive' && missing.length < 3 && missing.length > 0) {
        (byPerson[t.person] = byPerson[t.person] || { teams: [] }).teams.push({ team: t, missing });
      }
    });
    return Object.entries(byPerson).map(([pid, data]) => ({
      person: window.PEOPLE.find(p => p.id === pid),
      ...data,
    }));
  }, [state]);

  const finalizing = useMemoT(() => {
    return window.TEAMS.filter(t => {
      const st = state.status[t.id] || t.status;
      return window.calcStage(st) === 'finalizing';
    });
  }, [state]);

  const CHECKLIST = [
    { id: 'outcome',      label: 'Outcome', items: [
      'Що стало б неможливим без цієї команди?',
      'Яку бізнес-задачу закриває?',
      'Для кого -- Central чи бізнеси?',
    ]},
    { id: 'output',       label: 'Output / SLA', items: [
      'Що є конкретним результатом роботи?',
      'Які дедлайни або SLA задекларовані?',
      'Що відбувається при порушенні?',
    ]},
    { id: 'solutions',    label: 'Solutions', items: [
      'Де зберігаються дані?',
      'Що автоматизовано, що мануально?',
      'Хто відповідає за актуальність?',
    ]},
    { id: 'loading',      label: 'Loading', items: [
      'Скільки запитів/задач на місяць?',
      'Скільки людей у команді?',
      'Є пікові періоди?',
    ]},
    { id: 'satisfaction', label: 'Satisfaction', items: [
      'Хто внутрішній клієнт?',
      'Є формальний feedback механізм?',
      'Як зрозуміти що команда відпрацювала добре?',
    ]},
  ];

  return (
    <div style={{ padding: '32px 22px 80px', maxWidth: 960, margin: '0 auto' }}>

      {/* header */}
      <div style={{ marginBottom: 32, borderBottom: '1px solid var(--rule)', paddingBottom: 24 }}>
        <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
          Action plan . Sprint 08
        </div>
        <h1 style={{ fontFamily: "'Newsreader',serif", fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 10px', color: 'var(--ink)' }}>
          Next steps
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
          Auto-generated from current research statuses.
          <b style={{ color: 'var(--ink)' }}> {meetings.length} meetings</b> to schedule,
          <b style={{ color: 'var(--ink)' }}> {slacks.length} Slack threads</b> to open,
          <b style={{ color: 'var(--ink)' }}> {finalizing.length} teams</b> to finalize.
        </p>
      </div>

      {/* MEETINGS */}
      {meetings.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <SectionHead icon="📅" label="Schedule a meeting" count={meetings.length} color="var(--accent)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {meetings.map(({ person, teams }) => (
              <ActionCard key={person.id} type="meet" person={person} teams={teams} state={state} setState={setState} />
            ))}
          </div>
        </div>
      )}

      {/* SLACK */}
      {slacks.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <SectionHead icon="💬" label="Message async in Slack" count={slacks.length} color="var(--ready)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {slacks.map(({ person, teams }) => (
              <ActionCard key={person.id} type="slack" person={person} teams={teams} state={state} setState={setState} />
            ))}
          </div>
        </div>
      )}

      {/* FINALIZING */}
      {finalizing.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <SectionHead icon="/" label="Ready to finalize" count={finalizing.length} color="var(--ready)" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {finalizing.map(t => {
              const zone = window.ZONES.find(z => z.id === t.zone);
              return (
                <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--ready)', background: 'var(--ready-bg)', border: '1px solid var(--ready-border)', borderRadius: 3, padding: '4px 10px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: zone.color, flexShrink: 0 }}/>
                  {t.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* CHECKLIST */}
      <div style={{ marginBottom: 40 }}>
        <SectionHead icon="☑" label="Interview checklist" count={null} color="var(--ink-2)" />
        <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 16, marginTop: -4 }}>
          Use before every research conversation. Check off as you cover each topic.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {CHECKLIST.map(dim => (
            <div key={dim.id} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: 'var(--bg-2)', borderBottom: '1px solid var(--rule)', fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-2)' }}>
                {dim.label}
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: '6px 0' }}>
                {dim.items.map((item, j) => {
                  const key = dim.id + '-' + j;
                  const done = !!doneChecks[key];
                  return (
                    <li key={j}>
                      <button
                        onClick={() => toggleCheck(key)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', background: 'none', border: 'none', padding: '7px 14px', cursor: 'pointer', textAlign: 'left', transition: 'background .1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <span style={{ width: 14, height: 14, borderRadius: 2, border: `1.5px solid ${done ? 'var(--ready)' : 'var(--ink-4)'}`, background: done ? 'var(--ready)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          {done && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>/</span>}
                        </span>
                        <span style={{ fontSize: 12.5, color: done ? 'var(--ink-4)' : 'var(--ink-1)', lineHeight: 1.45, textDecoration: done ? 'line-through' : 'none', fontStyle: done ? 'italic' : 'normal' }}>
                          {item}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function SectionHead({ icon, label, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontFamily: "'Newsreader',serif", fontSize: 20, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{label}</span>
      {count !== null && (
        <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, fontWeight: 600, color, background: color === 'var(--accent)' ? 'var(--accent-bg)' : 'var(--ready-bg)', border: `1px solid ${color === 'var(--accent)' ? 'rgba(253,52,51,0.2)' : 'var(--ready-border)'}`, padding: '2px 8px', borderRadius: 3 }}>
          {count}
        </span>
      )}
    </div>
  );
}

function ActionCard({ type, person, teams, state, setState }) {
  const [copied, setCopied] = useStateT(false);
  const isMeet = type === 'meet';

  const message = useMemoT(() => {
    const first = person.name.split(' ')[0];
    const lines = [];
    if (isMeet) {
      lines.push(`${first}, can we find 30 min this week?`);
      lines.push('');
      lines.push('Building the Platform Impact Dashboard -- need your take on:');
      lines.push('');
      teams.forEach(({ team, missing }) => {
        lines.push(`  ${team.name.toLowerCase()} -- ${missing.join(' . ').toLowerCase()}`);
      });
      lines.push('');
      lines.push("I'll bring a one-pager so you can react rather than dig.");
    } else {
      lines.push(`${first}, quick async for the research doc:`);
      lines.push('');
      teams.forEach(({ team, missing }) => {
        lines.push(`${team.name}: need ${missing.join(' . ').toLowerCase()} -- do you have a number or a link I can pull from?`);
      });
    }
    return lines.join('\n');
  }, [person, teams, isMeet]);

  const copy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const borderColor = isMeet ? 'rgba(255,200,0,0.35)' : 'rgba(47,122,77,0.25)';
  const bgColor     = isMeet ? 'rgba(255,200,0,0.03)' : 'rgba(47,122,77,0.03)';
  const accentColor = isMeet ? 'var(--amber)' : 'var(--ready)';

  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 4, background: bgColor, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${borderColor}` }}>
        <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ink)', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
          {person.initials}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{person.name}</div>
          <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1 }}>
            {teams.length} team{teams.length === 1 ? '' : 's'} . {isMeet ? 'book a meeting' : 'async Slack'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {teams.map(({ team }) => {
            const zone = window.ZONES.find(z => z.id === team.zone);
            return (
              <span key={team.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-2)', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 3, padding: '2px 7px' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: zone.color }}/>
                {team.name}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ padding: '10px 14px' }}>
        <pre style={{ fontFamily: "'Geist',sans-serif", fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message}</pre>
        <button
          onClick={copy}
          style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Geist Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', background: copied ? 'var(--ready-bg)' : 'var(--surface)', border: `1px solid ${copied ? 'var(--ready-border)' : 'var(--rule)'}`, color: copied ? 'var(--ready)' : 'var(--ink-2)', padding: '5px 12px', borderRadius: 3, cursor: 'pointer' }}
        >
          {copied ? '/ Copied' : 'Copy message'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { FieldMap, TeamsDirectory, NextTab });
