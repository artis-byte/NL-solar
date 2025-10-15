<script>
  import { onMount, onDestroy } from 'svelte';
  import { map as windyMap } from '@windy/map';

  const REGION_HISTORY_URL =
    'https://raw.githubusercontent.com/artis-byte/NL-solar/main/qg_regions_history.geojson';
  const STATION_HISTORY_URL =
    'https://raw.githubusercontent.com/artis-byte/NL-solar/main/knmi_station_data/station_metrics_history.geojson';
  const REFRESH_INTERVAL = 600_000;
  const DELTA_OPTIONS = [10, 30, 60];
  const VIEW_OPTIONS = [
    { value: 'regions', label: 'Regions' },
    { value: 'stations', label: 'Stations' },
  ];
  const METRIC_OPTIONS = [
    { value: 'radiation', label: 'Radiation (W/m^2)' },
    { value: 'wind', label: 'Wind Speed (m/s)' },
  ];
  const NO_VALUE = '--';
  const REGION_HISTORY_COLUMNS = [
    { key: 'qg_mean', label: 'Radiation (W/m^2)', decimals: 0, suffix: ' W/m^2' },
    { key: 'wind_speed_mean', label: 'Wind (m/s)', decimals: 1, suffix: ' m/s' },
    { key: 'wind_direction_mean', label: 'Direction (deg)', decimals: 0, suffix: ' deg' },
  ];
  const STATION_HISTORY_COLUMNS = [
    { key: 'qg', label: 'Radiation (W/m^2)', decimals: 0, suffix: ' W/m^2' },
    { key: 'ff', label: 'Wind (m/s)', decimals: 1, suffix: ' m/s' },
    { key: 'dd', label: 'Direction (deg)', decimals: 0, suffix: ' deg' },
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
    if (mapInstance) {
      return true;
    }
    const candidate = windyMap;
    if (!candidate) {
      return false;
    }
    mapInstance = candidate;
    return typeof mapInstance.addLayer === 'function';
  };

  const scheduleMapPoll = () => {
    if (mapPollTimer) {
      return;
    }
    mapPollTimer = setInterval(() => {
      if (ensureMap()) {
        clearInterval(mapPollTimer);
        mapPollTimer = null;
        updateMap();
      }
    }, 500);
  };

  const fetchJSON = async (url) => {
    const response = await fetch(`${url}?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return response.json();
  };

  const getRadiationColor = (value) => {
    if (value == null) return '#f7f7f7';
    return value > 800 ? '#800026'
      : value > 600 ? '#BD0026'
      : value > 400 ? '#E31A1C'
      : value > 200 ? '#FC4E2A'
      : value > 100 ? '#FD8D3C'
      : value > 50 ? '#FEB24C'
      : value > 10 ? '#FED976'
      : '#FFEDA0';
  };

  const getWindColor = (value) => {
    if (value == null) return '#f7fbff';
    return value > 20 ? '#084081'
      : value > 15 ? '#0868ac'
      : value > 12 ? '#2b8cbe'
      : value > 9 ? '#4eb3d3'
      : value > 6 ? '#7bccc4'
      : value > 4 ? '#a8ddb5'
      : value > 2 ? '#ccebc5'
      : value > 1 ? '#e0f3db'
      : '#f7fcfd';
  };

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
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    }) : NO_VALUE;

  const formatShortTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }) : NO_VALUE;

  const getRecentHistoryEntries = (historyMap, limit = 5) => {
    if (!historyMap || !historyMap.size) return [];
    const entries = Array.from(historyMap.values());
    return entries.slice(-limit).reverse();
  };

  const renderHistoryTable = (historyMap, columns, limit = 5) => {
    const entries = getRecentHistoryEntries(historyMap, limit);
    if (!entries.length) return '';
    const header = columns.map((column) => `<th>${column.label}</th>`).join('');
    const rows = entries.map((entry) => {
      const cells = columns.map((column) => formatNumber(
        entry?.[column.key],
        column.decimals ?? 1,
        column.suffix ?? '',
      ));
      const cellHtml = cells.map((cell) => `<td>${cell}</td>`).join('');
      return `<tr><td>${formatLongTime(entry?.observation_time)}</td>${cellHtml}</tr>`;
    }).join('');
    return `
      <div class="history-block">
        <h4>Last ${entries.length} observations</h4>
        <table class="history-table">
          <thead>
            <tr>
              <th>Observed</th>${header}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  };

  const buildRegionTooltip = (name, entry) => `
    <div class="map-tooltip">
      <div class="map-tooltip-title">${name || 'Region'}</div>
      <div>Rad: ${formatNumber(entry?.qg_mean, 0, ' W/m^2')}</div>
      <div>Wind: ${formatNumber(entry?.wind_speed_mean, 1, ' m/s')}</div>
      <div class="map-tooltip-time">${formatShortTime(entry?.observation_time)}</div>
    </div>
  `;

  const buildStationTooltip = (stationId, entry) => `
    <div class="map-tooltip">
      <div class="map-tooltip-title">Station ${stationId}</div>
      <div>Rad: ${formatNumber(entry?.qg, 0, ' W/m^2')}</div>
      <div>Wind: ${formatNumber(entry?.ff, 1, ' m/s')}</div>
      <div class="map-tooltip-time">${formatShortTime(entry?.observation_time)}</div>
    </div>
  `;

  const prepareIndex = (collection, keyProp) => {
    const index = new Map();
    if (!collection?.features) {
      return index;
    }
    for (const feature of collection.features) {
      const key = feature?.properties?.[keyProp];
      if (!key) continue;
      const history = new Map();
      const entries = feature.properties.history || [];
      for (const entry of entries) {
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
    const times = new Set();
    regionsIndex.forEach(({ history }) => history.forEach((_, t) => times.add(t)));
    stationsIndex.forEach(({ history }) => history.forEach((_, t) => times.add(t)));
    const sorted = Array.from(times).sort((a, b) => new Date(a) - new Date(b));
    timeline = sorted;
    timelineDates = timeline.map((t) => new Date(t));
    timelineIndex = new Map(timeline.map((t, idx) => [t, idx]));
    currentIndex = timeline.length ? timeline.length - 1 : 0;
  };

  const findPreviousTime = (currentTime, minutes) => {
    if (!currentTime || !timelineIndex.has(currentTime)) return null;
    const currentIdx = timelineIndex.get(currentTime);
    const currentDate = timelineDates[currentIdx];
    for (let i = currentIdx - 1; i >= 0; i -= 1) {
      const diffMins = (currentDate - timelineDates[i]) / 60000;
      if (diffMins >= minutes - 0.01) {
        return timeline[i];
      }
    }
    return null;
  };

  const computeDelta = (historyMap, currentTime, metricKey, minutes) => {
    if (!historyMap || !currentTime) return null;
    const previousTime = findPreviousTime(currentTime, minutes);
    if (!previousTime) return null;
    const current = historyMap.get(currentTime);
    const previous = historyMap.get(previousTime);
    if (!current || !previous) return null;
    const currentValue = current[metricKey];
    const previousValue = previous[metricKey];
    if (currentValue == null || previousValue == null) return null;
    return {
      delta: currentValue - previousValue,
      previousTime,
      previousValue,
    };
  };

  const buildRegionPopup = (name, entry, historyMap, currentTime) => {
    const deltaMinutes = selectedDelta;
    const radiationDelta = computeDelta(historyMap, currentTime, 'qg_mean', deltaMinutes);
    const windDelta = computeDelta(historyMap, currentTime, 'wind_speed_mean', deltaMinutes);
    const radiationChange = radiationDelta
      ? `${formatSignedNumber(radiationDelta.delta, 0, ' W/m^2')}${radiationDelta.previousTime ? ' (vs ' + formatShortTime(radiationDelta.previousTime) + ')' : ''}`
      : NO_VALUE;
    const windChange = windDelta
      ? `${formatSignedNumber(windDelta.delta, 1, ' m/s')}${windDelta.previousTime ? ' (vs ' + formatShortTime(windDelta.previousTime) + ')' : ''}`
      : NO_VALUE;
    const historyTable = renderHistoryTable(historyMap, REGION_HISTORY_COLUMNS);
    const stationsLine = entry?.stations_count != null
      ? `<p>Stations contributing: ${entry.stations_count}</p>`
      : '';
    const outputLine = entry?.estimated_output_mw != null
      ? `<p>Est. PV output: ${formatNumber(entry.estimated_output_mw, 1, ' MW')}</p>`
      : '';

    return `
      <div class="popup">
        <h3>${name}</h3>
        <p><strong>Radiation</strong>: ${formatNumber(entry?.qg_mean, 0, ' W/m^2')}<br>
           &#916;${deltaMinutes} min: ${radiationChange}</p>
        <p><strong>Wind</strong>: ${formatNumber(entry?.wind_speed_mean, 1, ' m/s')} @ ${formatNumber(entry?.wind_direction_mean, 0, ' deg')}<br>
           &#916;${deltaMinutes} min: ${windChange}</p>
        ${stationsLine}
        ${outputLine}
        ${historyTable}
      </div>
    `;
  };

  const buildStationPopup = (stationId, entry, historyMap, currentTime) => {
    const deltaMinutes = selectedDelta;
    const radiationDelta = computeDelta(historyMap, currentTime, 'qg', deltaMinutes);
    const windDelta = computeDelta(historyMap, currentTime, 'ff', deltaMinutes);
    const radiationChange = radiationDelta
      ? `${formatSignedNumber(radiationDelta.delta, 0, ' W/m^2')}${radiationDelta.previousTime ? ' (vs ' + formatShortTime(radiationDelta.previousTime) + ')' : ''}`
      : NO_VALUE;
    const windChange = windDelta
      ? `${formatSignedNumber(windDelta.delta, 1, ' m/s')}${windDelta.previousTime ? ' (vs ' + formatShortTime(windDelta.previousTime) + ')' : ''}`
      : NO_VALUE;
    const historyTable = renderHistoryTable(historyMap, STATION_HISTORY_COLUMNS);
    const sourceLine = entry?.source_filename
      ? `<p>Source: ${entry.source_filename}</p>`
      : '';

    return `
      <div class="popup">
        <h3>Station ${stationId}</h3>
        <p><strong>Radiation</strong>: ${formatNumber(entry?.qg, 0, ' W/m^2')}<br>
           &#916;${deltaMinutes} min: ${radiationChange}</p>
        <p><strong>Wind</strong>: ${formatNumber(entry?.ff, 1, ' m/s')} @ ${formatNumber(entry?.dd, 0, ' deg')}<br>
           &#916;${deltaMinutes} min: ${windChange}</p>
        ${sourceLine}
        ${historyTable}
      </div>
    `;
  };

  const clearLayer = (layerRef) => {
    if (!layerRef || !ensureMap()) {
      return null;
    }
    if (mapInstance.hasLayer(layerRef)) {
      mapInstance.removeLayer(layerRef);
    }
    return null;
  };

  const drawRegionLayer = (currentTime) => {
    if (!ensureMap() || !currentTime) {
      scheduleMapPoll();
      return;
    }
    const L = getLeaflet();
    if (!L) return;
    const features = [];
    regionsIndex.forEach(({ geometry, history }, name) => {
      const entry = history.get(currentTime);
      if (!entry || !geometry) return;
      features.push({
        type: 'Feature',
        geometry,
        properties: { name, ...entry },
        history,
      });
    });
    if (!features.length) {
      regionLayer = clearLayer(regionLayer);
      return;
    }
    const collection = { type: 'FeatureCollection', features };
    regionLayer = clearLayer(regionLayer);
    regionLayer = L.geoJSON(collection, {
      style: (feature) => {
        const entry = feature.properties;
        const value = selectedMetric === 'wind'
          ? entry?.wind_speed_mean
          : entry?.qg_mean;
        const color = selectedMetric === 'wind'
          ? getWindColor(value)
          : getRadiationColor(value);
        return {
          fillColor: color,
          fillOpacity: 0.65,
          weight: 1,
          color: '#333',
        };
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(buildRegionPopup(
          feature.properties?.name,
          feature.properties,
          feature.history,
          currentTime,
        ));
        layer.bindTooltip(
          buildRegionTooltip(feature.properties?.name, feature.properties),
          {
            permanent: true,
            direction: 'center',
            className: 'region-label',
            sticky: false,
          },
        );
      },
    }).addTo(mapInstance);
  };

  const drawStationLayer = (currentTime) => {
    if (!ensureMap() || !currentTime) {
      scheduleMapPoll();
      return;
    }
    const L = getLeaflet();
    if (!L) return;
    stationLayer = clearLayer(stationLayer);
    stationLayer = L.layerGroup().addTo(mapInstance);
    stationsIndex.forEach(({ geometry, history }, stationId) => {
      if (!geometry || geometry.type !== 'Point') return;
      const entry = history.get(currentTime);
      if (!entry) return;
      const [lon, lat] = geometry.coordinates;
      const value = selectedMetric === 'wind' ? entry.ff : entry.qg;
      const color = selectedMetric === 'wind'
        ? getWindColor(value)
        : getRadiationColor(value);
      const marker = L.circleMarker([lat, lon], {
        radius: 5,
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: 1,
      });
      marker.bindPopup(buildStationPopup(stationId, entry, history, currentTime));
      marker.bindTooltip(
        buildStationTooltip(stationId, entry),
        {
          permanent: true,
          direction: 'top',
          className: 'station-label',
          offset: [0, -8],
        },
      );
      marker.addTo(stationLayer);
    });
  };

  const updateMap = () => {
    if (loading || !timeline.length) {
      return;
    }
    if (!ensureMap()) {
      scheduleMapPoll();
      return;
    }
    const currentTime = timeline[currentIndex];
    if (!currentTime) {
      return;
    }

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
      buildTimeline();
    } catch (err) {
      console.error(err);
      errorMessage = err?.message || 'Failed to load KNMI history.';
    } finally {
      loading = false;
      updateMap();
    }
  };

  onMount(() => {
    loadData();
    refreshTimer = setInterval(loadData, REFRESH_INTERVAL);
    if (!ensureMap()) {
      scheduleMapPoll();
    }
  });

  onDestroy(() => {
    if (refreshTimer) clearInterval(refreshTimer);
    if (mapPollTimer) clearInterval(mapPollTimer);
    regionLayer = clearLayer(regionLayer);
    stationLayer = clearLayer(stationLayer);
  });

  $: {
    if (!loading && timeline.length) {
      const _view = selectedView;
      const _metric = selectedMetric;
      const _delta = selectedDelta;
      const _index = currentIndex;
      const _current = timeline[currentIndex];
      void (_view, _metric, _delta, _index, _current);
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
</style>

<section>
  <h1>KNMI Wind & Radiation Timeline</h1>

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
              {option} minutes
            </option>
          {/each}
        </select>
        <span class="hint">Comparing to {previousTimeISO ? formatShortTime(previousTimeISO) : 'n/a'}</span>
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
      Drag the slider to explore the last {timespanMinutes} minutes of KNMI observations.
    </p>
  {/if}
</section>
