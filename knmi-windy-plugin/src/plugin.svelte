<script>
  import { onMount, onDestroy } from 'svelte';
  import { map as windyMap } from '@windy/map';

  const REGION_HISTORY_URL =
    'https://raw.githubusercontent.com/artis-byte/NL-solar/main/qg_regions_history.geojson';
  const STATION_HISTORY_URL =
    'https://raw.githubusercontent.com/artis-byte/NL-solar/main/knmi_station_data/station_metrics_history.geojson';
  const REFRESH_INTERVAL = 120_000;
  const DELTA_OPTIONS = [10, 30, 60];
  const DELTA_TOLERANCE_MINUTES = 5;
  const MAX_TIMELINE_AGE_MS = 24 * 60 * 60 * 1000;
  const VIEW_OPTIONS = [
    { value: 'regions', label: 'Regions' },
    { value: 'stations', label: 'Stations' },
  ];
  const METRIC_OPTIONS = [
    { value: 'radiation', label: 'Radiation (W/m\u00b2)' },
    { value: 'wind', label: 'Wind Speed (m/s)' },
  ];
  const NO_VALUE = '--';
  const REGION_HISTORY_COLUMNS = [
    { key: 'qg_mean', label: 'Rad (W/m\u00b2)', decimals: 0, suffix: ' W/m\u00b2', includeDelta: true },
    { key: 'wind_speed_mean', label: 'Wind (m/s)', decimals: 1, suffix: ' m/s', includeDelta: true },
    { key: 'wind_direction_mean', label: 'Dir (\u00b0)', decimals: 0, suffix: '\u00b0', includeDelta: false },
  ];
  const STATION_HISTORY_COLUMNS = [
    { key: 'qg', label: 'Rad (W/m\u00b2)', decimals: 0, suffix: ' W/m\u00b2', includeDelta: true },
    { key: 'ff', label: 'Wind (m/s)', decimals: 1, suffix: ' m/s', includeDelta: true },
    { key: 'dd', label: 'Dir (\u00b0)', decimals: 0, suffix: '\u00b0', includeDelta: false },
  ];

  let loading = true;
  let errorMessage = '';
  let refreshTimer = null;
  let mapPollTimer = null;

  let mapInstance = null;
  let leafletLib = null;
  let regionLayer = null;
  let stationLayer = null;

  let timeline = [];
  let timelineDates = [];
  let timelineIndex = new Map();
  let currentIndex = 0;

  let selectedView = 'regions';
  let selectedMetric = 'radiation';
  let selectedDelta = DELTA_OPTIONS[0];

  let regionsIndex = new Map();
  let stationsIndex = new Map();

  const getLeaflet = () => {
    if (!leafletLib && typeof window !== 'undefined') {
      leafletLib = window.L || null;
    }
    return leafletLib;
  };

  const ensureMap = () => {
    if (mapInstance) return true;
    const candidate = windyMap;
    if (!candidate) return false;
    mapInstance = candidate;
    return typeof mapInstance.addLayer === 'function';
  };

  const scheduleMapPoll = () => {
    if (mapPollTimer) return;
    mapPollTimer = setInterval(() => {
      if (ensureMap()) {
        clearInterval(mapPollTimer);
        mapPollTimer = null;
        updateMap();
      }
    }, 500);
  };

  const fetchJSON = async (url) => {
    const response = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Fetch ${url}: ${response.status}`);
    return response.json();
  };

  const getRadiationColor = (value) => {
    if (value == null) return '#FFEDA0';
    if (value > 800) return '#800026';
    if (value > 600) return '#BD0026';
    if (value > 400) return '#E31A1C';
    if (value > 200) return '#FC4E2A';
    if (value > 100) return '#FD8D3C';
    if (value > 50) return '#FEB24C';
    if (value > 10) return '#FED976';
    return '#FFEDA0';
  };

  const getWindColor = (value) => {
    if (value == null) return '#f7fcfd';
    if (value > 20) return '#084081';
    if (value > 15) return '#0868ac';
    if (value > 12) return '#2b8cbe';
    if (value > 9) return '#4eb3d3';
    if (value > 6) return '#7bccc4';
    if (value > 4) return '#a8ddb5';
    if (value > 2) return '#ccebc5';
    if (value > 1) return '#e0f3db';
    return '#f7fcfd';
  };

  const getColor = (value, metric) =>
    metric === 'wind' ? getWindColor(value) : getRadiationColor(value);

  const formatNumber = (value, decimals = 1, suffix = '') => {
    if (value == null || Number.isNaN(value)) return NO_VALUE;
    return `${Number(value).toFixed(decimals)}${suffix}`;
  };

  const formatSignedNumber = (value, decimals = 1, suffix = '') => {
    if (value == null || Number.isNaN(value)) return NO_VALUE;
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${Math.abs(Number(value)).toFixed(decimals)}${suffix}`;
  };

  const formatLongTime = (iso) =>
    iso ? new Date(iso).toLocaleString(undefined, {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
    }) : NO_VALUE;

  const formatShortTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit', minute: '2-digit',
    }) : NO_VALUE;

  const safeHistoryEntries = (historyMap, limit = 5) => {
    try {
      if (!historyMap || typeof historyMap.values !== 'function') return [];
      const entries = Array.from(historyMap.values());
      return entries.slice(-limit).reverse();
    } catch (_) { return []; }
  };

  const getTrend = (currentValue, previousValue) => {
    if (currentValue == null || previousValue == null) return null;
    const a = Number(currentValue), b = Number(previousValue);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return a - b;
  };

  const renderHistoryTable = (historyMap, columns, limit = 5) => {
    const entries = safeHistoryEntries(historyMap, limit);
    if (!entries.length) return '';
    const header = columns.map((c) => {
      const d = c.includeDelta ? '<th>&Delta;</th>' : '';
      return `<th>${c.label}</th>${d}`;
    }).join('');
    const rows = entries.map((entry, idx) => {
      const prev = entries[idx + 1] || null;
      let cells = '';
      columns.forEach((c) => {
        cells += `<td>${formatNumber(entry?.[c.key], c.decimals ?? 1, c.suffix ?? '')}</td>`;
        if (c.includeDelta) {
          const trend = prev ? getTrend(entry?.[c.key], prev?.[c.key]) : null;
          cells += `<td>${trend != null ? formatSignedNumber(trend, c.decimals ?? 1, c.suffix ?? '') : NO_VALUE}</td>`;
        }
      });
      return `<tr><td>${formatLongTime(entry?.observation_time)}</td>${cells}</tr>`;
    }).join('');
    return `<div class="history-block"><h4>Last ${entries.length} obs</h4>
      <table class="history-table"><thead><tr><th>Time</th>${header}</tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  };

  const prepareIndex = (collection, keyProp) => {
    const index = new Map();
    if (!collection?.features) return index;
    for (const feature of collection.features) {
      const key = feature?.properties?.[keyProp];
      if (!key) continue;
      const history = new Map();
      for (const entry of (feature.properties.history || [])) {
        if (entry?.observation_time) {
          history.set(entry.observation_time, entry);
        }
      }
      index.set(key, {
        geometry: feature.geometry ? JSON.parse(JSON.stringify(feature.geometry)) : null,
        history,
      });
    }
    return index;
  };

  const buildTimeline = () => {
    const now = Date.now();
    const cutoff = now - MAX_TIMELINE_AGE_MS;
    const times = new Set();
    const addTimes = (idx) => idx.forEach(({ history }) =>
      history.forEach((_, t) => {
        if (new Date(t).getTime() >= cutoff) times.add(t);
      })
    );
    addTimes(regionsIndex);
    addTimes(stationsIndex);
    const sorted = Array.from(times).sort((a, b) => new Date(a) - new Date(b));
    timeline = sorted;
    timelineDates = timeline.map((t) => new Date(t));
    timelineIndex = new Map(timeline.map((t, idx) => [t, idx]));
    currentIndex = timeline.length ? timeline.length - 1 : 0;
  };

  const findPreviousTime = (currentTime, minutes) => {
    if (!currentTime || !timelineIndex.has(currentTime)) return null;
    const idx = timelineIndex.get(currentTime);
    const cur = timelineDates[idx];
    for (let i = idx - 1; i >= 0; i--) {
      if ((cur - timelineDates[i]) / 60000 >= minutes - 0.01) return timeline[i];
    }
    return null;
  };

  const safeGet = (historyMap, key) => {
    try {
      return historyMap && typeof historyMap.get === 'function' ? historyMap.get(key) : undefined;
    } catch (_) { return undefined; }
  };

  const computeDelta = (historyMap, currentTime, metricKey, minutes) => {
    if (!historyMap || !currentTime) return null;
    const previousTime = findPreviousTime(currentTime, minutes);
    if (!previousTime) return null;
    const current = safeGet(historyMap, currentTime);
    const previous = safeGet(historyMap, previousTime);
    if (!current || !previous) return null;
    const gap = Math.abs((new Date(currentTime) - new Date(previousTime)) / 60000);
    if (gap > minutes + DELTA_TOLERANCE_MINUTES) return null;
    const cv = current[metricKey], pv = previous[metricKey];
    if (cv == null || pv == null) return null;
    return { delta: cv - pv, previousTime, previousValue: pv };
  };

  const buildRegionPopupHTML = (name, entry, historyMap, currentTime) => {
    try {
      const dm = selectedDelta;
      const rd = computeDelta(historyMap, currentTime, 'qg_mean', dm);
      const wd = computeDelta(historyMap, currentTime, 'wind_speed_mean', dm);
      const rc = rd ? `${formatSignedNumber(rd.delta, 0, ' W/m\u00b2')}` : NO_VALUE;
      const wc = wd ? `${formatSignedNumber(wd.delta, 1, ' m/s')}` : NO_VALUE;
      const ht = renderHistoryTable(historyMap, REGION_HISTORY_COLUMNS);
      return `<div class="popup"><h3>${name || 'Region'}</h3>
        <p><b>Radiation</b>: ${formatNumber(entry?.qg_mean, 0, ' W/m\u00b2')} (\u0394${dm}m: ${rc})</p>
        <p><b>Wind</b>: ${formatNumber(entry?.wind_speed_mean, 1, ' m/s')} @ ${formatNumber(entry?.wind_direction_mean, 0, '\u00b0')} (\u0394${dm}m: ${wc})</p>
        ${entry?.stations_count != null ? `<p>Stations: ${entry.stations_count}</p>` : ''}
        ${ht}</div>`;
    } catch (_) {
      return `<div class="popup"><h3>${name || 'Region'}</h3><p>Data available on click</p></div>`;
    }
  };

  const buildStationPopupHTML = (stationId, entry, historyMap, currentTime) => {
    try {
      const dm = selectedDelta;
      const rd = computeDelta(historyMap, currentTime, 'qg', dm);
      const wd = computeDelta(historyMap, currentTime, 'ff', dm);
      const rc = rd ? `${formatSignedNumber(rd.delta, 0, ' W/m\u00b2')}` : NO_VALUE;
      const wc = wd ? `${formatSignedNumber(wd.delta, 1, ' m/s')}` : NO_VALUE;
      const ht = renderHistoryTable(historyMap, STATION_HISTORY_COLUMNS);
      return `<div class="popup"><h3>Station ${stationId}</h3>
        <p><b>Radiation</b>: ${formatNumber(entry?.qg, 0, ' W/m\u00b2')} (\u0394${dm}m: ${rc})</p>
        <p><b>Wind</b>: ${formatNumber(entry?.ff, 1, ' m/s')} @ ${formatNumber(entry?.dd, 0, '\u00b0')} (\u0394${dm}m: ${wc})</p>
        ${ht}</div>`;
    } catch (_) {
      return `<div class="popup"><h3>Station ${stationId}</h3><p>Data available on click</p></div>`;
    }
  };

  const buildSimpleTooltip = (title, rad, wind) => {
    return `<div class="map-tooltip"><div class="map-tooltip-title">${title}</div>
      <div>Rad: ${formatNumber(rad, 0, ' W/m\u00b2')}</div>
      <div>Wind: ${formatNumber(wind, 1, ' m/s')}</div></div>`;
  };

  const clearLayer = (layerRef) => {
    try {
      if (layerRef && mapInstance) {
        mapInstance.removeLayer(layerRef);
      }
    } catch (_) { /* ignore */ }
    return null;
  };

  const drawRegionLayer = (currentTime) => {
    if (!ensureMap() || !currentTime) { scheduleMapPoll(); return; }
    const L = getLeaflet();
    if (!L) return;

    regionLayer = clearLayer(regionLayer);
    regionLayer = L.layerGroup().addTo(mapInstance);

    let drawn = 0;
    regionsIndex.forEach(({ geometry, history }, name) => {
      try {
        if (!geometry) return;
        const entry = history.get(currentTime);
        if (!entry) return;

        // Deep copy geometry for each render to prevent mutation
        const geomCopy = JSON.parse(JSON.stringify(geometry));
        const value = selectedMetric === 'wind' ? entry.wind_speed_mean : entry.qg_mean;

        const feature = {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: geomCopy,
            properties: { name, ...entry },
          }],
        };

        const layer = L.geoJSON(feature, {
          style: () => ({
            fillColor: getColor(value, selectedMetric),
            fillOpacity: 0.65,
            weight: 1.5,
            color: '#333',
          }),
        });

        // Tooltip
        layer.eachLayer((sub) => {
          sub.bindTooltip(
            buildSimpleTooltip(name, entry.qg_mean, entry.wind_speed_mean),
            { permanent: true, direction: 'center', className: 'region-label' },
          );
          sub.bindPopup(() => buildRegionPopupHTML(name, entry, history, currentTime));
        });

        layer.addTo(regionLayer);
        drawn += 1;
      } catch (err) {
        console.warn('Region draw error for', name, err);
      }
    });
    console.log(`[KNMI] Drew ${drawn} region(s) for ${currentTime}`);
  };

  const drawStationLayer = (currentTime) => {
    if (!ensureMap() || !currentTime) { scheduleMapPoll(); return; }
    const L = getLeaflet();
    if (!L) return;

    stationLayer = clearLayer(stationLayer);
    stationLayer = L.layerGroup().addTo(mapInstance);

    stationsIndex.forEach(({ geometry, history }, stationId) => {
      try {
        if (!geometry || geometry.type !== 'Point') return;
        const entry = history.get(currentTime);
        if (!entry) return;
        const [lon, lat] = geometry.coordinates;
        const value = selectedMetric === 'wind' ? entry.ff : entry.qg;
        const color = getColor(value, selectedMetric);
        const marker = L.circleMarker([lat, lon], {
          radius: 6,
          color: '#1c1c1c',
          fillColor: color,
          fillOpacity: 0.9,
          weight: 1,
        });
        marker.bindTooltip(
          buildSimpleTooltip(`Stn ${stationId}`, entry.qg, entry.ff),
          { permanent: false, direction: 'top', className: 'station-label', offset: [0, -8] },
        );
        marker.bindPopup(() => buildStationPopupHTML(stationId, entry, history, currentTime));
        marker.addTo(stationLayer);
      } catch (err) {
        console.warn('Station marker error:', err);
      }
    });
  };

  const updateMap = () => {
    if (loading || !timeline.length) return;
    if (!ensureMap()) { scheduleMapPoll(); return; }
    const currentTime = timeline[currentIndex];
    if (!currentTime) return;
    console.log(`[KNMI] updateMap: view=${selectedView}, time=${currentTime}, idx=${currentIndex}/${timeline.length}`);

    if (selectedView === 'regions') {
      stationLayer = clearLayer(stationLayer);
      drawRegionLayer(currentTime);
    } else {
      regionLayer = clearLayer(regionLayer);
      drawStationLayer(currentTime);
    }
  };

  const loadData = async () => {
    loading = true;
    errorMessage = '';
    try {
      const [regions, stations] = await Promise.all([
        fetchJSON(REGION_HISTORY_URL),
        fetchJSON(STATION_HISTORY_URL),
      ]);
      regionsIndex = prepareIndex(regions, 'name');
      stationsIndex = prepareIndex(stations, 'station');
      console.log(`[KNMI] Indexed ${regionsIndex.size} regions, ${stationsIndex.size} stations`);
      buildTimeline();
      console.log(`[KNMI] Timeline: ${timeline.length} points, latest=${timeline[timeline.length - 1]}`);
    } catch (err) {
      console.error('KNMI load error:', err);
      errorMessage = err?.message || 'Failed to load KNMI data.';
    } finally {
      loading = false;
      updateMap();
    }
  };

  onMount(() => {
    loadData();
    refreshTimer = setInterval(loadData, REFRESH_INTERVAL);
    if (!ensureMap()) scheduleMapPoll();
  });

  onDestroy(() => {
    if (refreshTimer) clearInterval(refreshTimer);
    if (mapPollTimer) clearInterval(mapPollTimer);
    regionLayer = clearLayer(regionLayer);
    stationLayer = clearLayer(stationLayer);
  });

  $: {
    if (!loading && timeline.length) {
      const _v = selectedView;
      const _m = selectedMetric;
      const _d = selectedDelta;
      const _i = currentIndex;
      void (_v, _m, _d, _i);
      updateMap();
    }
  }

  $: currentTimeISO = timeline.length ? timeline[currentIndex] : null;
  $: previousTimeISO = currentTimeISO ? findPreviousTime(currentTimeISO, selectedDelta) : null;
  $: timespanMinutes = timelineDates.length >= 2
    ? Math.round((timelineDates[timelineDates.length - 1] - timelineDates[0]) / 60000)
    : timeline.length ? 10 : 0;
</script>

<style>
  section {
    padding: 0.75em;
    font-family: system-ui, sans-serif;
    color: #222;
  }
  h1 {
    font-size: 1.1em;
    margin: 0 0 0.5em;
  }
  .status {
    margin: 0.5em 0;
    font-size: 0.95em;
  }
  .error {
    color: #b00020;
  }
  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    margin-bottom: 0.75em;
  }
  .control-row {
    display: flex;
    align-items: center;
    gap: 0.5em;
    flex-wrap: wrap;
  }
  .control-row label {
    font-weight: 600;
    font-size: 0.85em;
  }
  .toggle {
    display: inline-flex;
    gap: 0.35em;
  }
  .toggle button {
    padding: 0.25em 0.6em;
    border: 1px solid #888;
    border-radius: 4px;
    background: #f7f7f7;
    cursor: pointer;
    font-size: 0.85em;
  }
  .toggle button.selected {
    background: #1f78b4;
    color: #fff;
    border-color: #1f78b4;
  }
  select {
    padding: 0.25em 0.4em;
    font-size: 0.85em;
  }
  .timeline {
    margin-top: 0.5em;
  }
  .timeline input[type='range'] {
    width: 100%;
  }
  .timestamp {
    display: flex;
    justify-content: space-between;
    font-size: 0.8em;
    font-weight: 600;
    margin-top: 0.2em;
  }
  .hint {
    font-size: 0.75em;
    color: #555;
    margin-top: 0.35em;
  }
  .popup h3 {
    margin: 0 0 0.3em;
    font-size: 1em;
  }
  .popup h4 {
    margin: 0.6em 0 0.3em;
    font-size: 0.85em;
    font-weight: 600;
  }
  .popup p {
    margin: 0.25em 0;
    font-size: 0.85em;
  }
  .history-block {
    margin-top: 0.6em;
  }
  .history-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.78em;
  }
  .history-table th,
  .history-table td {
    border: 1px solid #dcdcdc;
    padding: 0.2em 0.35em;
    text-align: right;
  }
  .history-table th:first-child,
  .history-table td:first-child {
    text-align: left;
  }
  .history-table thead th {
    background: #f5f5f5;
  }
  .history-table tbody tr:nth-child(even) {
    background: #fafafa;
  }
  .leaflet-tooltip.region-label,
  .leaflet-tooltip.station-label {
    background: rgba(255, 255, 255, 0.92);
    color: #222;
    border: 1px solid rgba(0, 0, 0, 0.2);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    padding: 0.35em 0.5em;
    border-radius: 4px;
    text-align: center;
  }
  .leaflet-tooltip.station-label {
    transform: translateY(-4px);
  }
  .map-tooltip-title {
    font-weight: 600;
    display: block;
    margin-bottom: 0.1em;
  }
  .map-tooltip-time {
    font-size: 0.7em;
    color: #444;
    margin-top: 0.15em;
  }
  .delta {
    margin-left: 0.35em;
    font-weight: 600;
  }
  .delta-positive {
    color: #1b7837;
  }
  .delta-negative {
    color: #b2182b;
  }
  .delta-neutral {
    color: #555;
  }
</style>

<section>
  <h1>KNMI Solar & Wind</h1>

  {#if loading}
    <p class="status">Loading observations...</p>
  {:else if errorMessage}
    <p class="status error">{errorMessage}</p>
  {:else if !timeline.length}
    <p class="status">No historical points available.</p>
  {:else}
    <div class="controls">
      <div class="control-row">
        <label>View</label>
        <div class="toggle">
          {#each VIEW_OPTIONS as option}
            <button
              class:selected={selectedView === option.value}
              on:click={() => { selectedView = option.value; }}
            >
              {option.label}
            </button>
          {/each}
        </div>
      </div>
      <div class="control-row">
        <label>Metric</label>
        <div class="toggle">
          {#each METRIC_OPTIONS as option}
            <button
              class:selected={selectedMetric === option.value}
              on:click={() => { selectedMetric = option.value; }}
            >
              {option.label}
            </button>
          {/each}
        </div>
      </div>
      <div class="control-row">
        <label>Change window</label>
        <select on:change={(event) => { selectedDelta = Number(event.target.value); }}>
          {#each DELTA_OPTIONS as option}
            <option value={option} selected={option === selectedDelta}>
              {option} min
            </option>
          {/each}
        </select>
        <span class="hint">vs {previousTimeISO ? formatShortTime(previousTimeISO) : 'n/a'}</span>
      </div>
    </div>

    <div class="timeline">
      <input
        type="range"
        min="0"
        max={Math.max(0, timeline.length - 1)}
        bind:value={currentIndex}
      />
      <div class="timestamp">
        <span>{formatLongTime(currentTimeISO)}</span>
        <span>{timeline.length} obs</span>
      </div>
    </div>
    <p class="hint">
      Drag slider to explore last {timespanMinutes} min of KNMI data.
    </p>
  {/if}
</section>
