<script>
  import { onMount, onDestroy } from 'svelte';
  import { map as windyMap } from '@windy/map';

  const REGION_URL = 'https://raw.githubusercontent.com/artis-byte/NL-solar/main/qg_regions.geojson';
  const STATION_URL = 'https://raw.githubusercontent.com/artis-byte/NL-solar/main/stations_live.geojson';
  const REFRESH_MS = 600_000;
  const COLORS = ['#800026', '#BD0026', '#E31A1C', '#FC4E2A', '#FD8D3C', '#FEB24C', '#FED976', '#FFEDA0'];
  const WIND_THRESHOLDS = [20, 15, 10, 7, 5, 3, 1];

  const MODES = [
    { id: 'region-qg', label: 'Region irradiance', type: 'region', metric: 'qg_mean', units: 'W/m^2', legend: 'qg' },
    { id: 'region-wind', label: 'Region wind', type: 'region', metric: 'ff_mean', units: 'm/s', legend: 'wind' },
    { id: 'stations-qg', label: 'Stations irradiance', type: 'stations', metric: 'qg', units: 'W/m^2', legend: 'qg' },
    { id: 'stations-wind', label: 'Stations wind', type: 'stations', metric: 'ff', units: 'm/s', legend: 'wind' }
  ];

  let map = null;
  let leafletLib = null;
  let regionLayer = null;
  let stationLayer = null;
  let refreshTimer = null;
  let mapPollTimer = null;

  let loading = false;
  let errorMessage = '';
  let lastUpdated = '';
  let legendStops = [];
  let legendUnits = '';
  let selectedMode = MODES[0].id;

  let regionData = null;
  let stationData = null;
  let metricStats = {};

  function getMode(id) {
    return MODES.find((mode) => mode.id === id);
  }

  function ensureLeaflet() {
    if (!leafletLib && typeof window !== 'undefined') {
      leafletLib = window.L || null;
    }
    return leafletLib;
  }

  function ensureMapAvailable() {
    const current = windyMap;
    if (!current) {
      return false;
    }
    map = current;
    return typeof map.addLayer === 'function';
  }

  function formatNumber(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 'n/a';
    }
    const abs = Math.abs(value);
    if (abs >= 1000) return value.toFixed(0);
    if (abs >= 100) return value.toFixed(0);
    if (abs >= 10) return value.toFixed(1);
    if (abs >= 1) return value.toFixed(2);
    if (abs === 0) return '0';
    return value.toPrecision(2);
  }

  function recomputeStats(regions, stations) {
    metricStats = {};
    [regions, stations].forEach((geojson) => {
      const features = Array.isArray(geojson?.features) ? geojson.features : [];
      for (const feature of features) {
        const props = feature?.properties;
        if (!props) continue;
        for (const [key, value] of Object.entries(props)) {
          if (typeof value === 'number' && Number.isFinite(value)) {
            const stats = metricStats[key] || { min: value, max: value };
            stats.min = Math.min(stats.min, value);
            stats.max = Math.max(stats.max, value);
            metricStats[key] = stats;
          }
        }
      }
    });
  }

  function getThresholds(mode, stats) {
    if (mode.legend === 'qg') {
      return [800, 600, 400, 200, 100, 50, 10];
    }
    if (mode.legend === 'wind') {
      return WIND_THRESHOLDS;
    }
    if (stats && Number.isFinite(stats.min) && Number.isFinite(stats.max)) {
      const steps = COLORS.length - 1;
      const span = stats.max - stats.min;
      if (span <= 0) return [];
      const items = [];
      for (let i = steps; i >= 1; i -= 1) {
        items.push(stats.min + (span * i) / steps);
      }
      return items;
    }
    return [];
  }

  function colorForValue(value, thresholds) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '#7f7f7f';
    }
    if (!thresholds.length) {
      return COLORS[Math.floor(COLORS.length / 2)];
    }
    for (let i = 0; i < thresholds.length; i += 1) {
      if (value >= thresholds[i]) {
        return COLORS[i];
      }
    }
    return COLORS[COLORS.length - 1];
  }

  function buildLegend(thresholds, mode) {
    const items = [];
    for (let i = 0; i < COLORS.length; i += 1) {
      let label = '';
      if (!thresholds.length) {
        label = i === 0 ? 'Higher values' : i === COLORS.length - 1 ? 'Lower values' : '';
      } else if (i === 0) {
        label = `>= ${formatNumber(thresholds[0])}`;
      } else if (i === COLORS.length - 1) {
        label = `< ${formatNumber(thresholds[thresholds.length - 1])}`;
      } else {
        label = `${formatNumber(thresholds[i - 1])} - ${formatNumber(thresholds[i])}`;
      }
      if (label) {
        items.push({ color: COLORS[i], label: mode.units ? `${label} ${mode.units}` : label });
      }
    }
    return items;
  }

  function clearRegionLayer() {
    if (regionLayer && ensureLeaflet()) {
      if (map && typeof map.removeLayer === 'function') {
        map.removeLayer(regionLayer);
      }
      regionLayer = null;
    }
  }

  function clearStationLayer() {
    if (stationLayer && ensureLeaflet()) {
      if (map && typeof map.removeLayer === 'function') {
        map.removeLayer(stationLayer);
      }
      stationLayer = null;
    }
  }

  function clearAllLayers() {
    clearRegionLayer();
    clearStationLayer();
  }

  function renderRegion(mode) {
    const L = ensureLeaflet();
    if (!L || !ensureMapAvailable() || !regionData) {
      return;
    }
    const stats = metricStats[mode.metric];
    if (!stats) {
      errorMessage = 'Selected region metric is not available in the dataset.';
      clearAllLayers();
      legendStops = [];
      return;
    }
    const thresholds = getThresholds(mode, stats);
    legendUnits = mode.units;
    legendStops = buildLegend(thresholds, mode);

    clearAllLayers();
    regionLayer = L.geoJSON(regionData, {
      style: (feature) => {
        const value = feature?.properties?.[mode.metric];
        return {
          fillColor: colorForValue(value, thresholds),
          fillOpacity: 0.6,
          weight: 1,
          color: '#333333'
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature?.properties || {};
        const lines = [];
        const name = props.name || 'Region';
        lines.push(`<strong>${name}</strong>`);
        const irradiance = props.qg_mean;
        if (Number.isFinite(irradiance)) {
          lines.push(`Irradiance: ${formatNumber(irradiance)} W/m^2`);
        }
        const wind = props.ff_mean;
        if (Number.isFinite(wind)) {
          lines.push(`Wind: ${formatNumber(wind)} m/s`);
        }
        if (Number.isFinite(props.estimated_output_mw)) {
          lines.push(`Estimated PV output: ${formatNumber(props.estimated_output_mw)} MW`);
        }
        layer.bindPopup(lines.join('<br>'));
      }
    }).addTo(map);
  }

  function renderStations(mode) {
    const L = ensureLeaflet();
    if (!L || !ensureMapAvailable() || !stationData) {
      return;
    }
    const stats = metricStats[mode.metric];
    if (!stats) {
      errorMessage = 'Station dataset does not include the selected metric.';
      clearAllLayers();
      legendStops = [];
      return;
    }
    const thresholds = getThresholds(mode, stats);
    legendUnits = mode.units;
    legendStops = buildLegend(thresholds, mode);

    clearAllLayers();
    stationLayer = L.layerGroup();
    const features = Array.isArray(stationData?.features) ? stationData.features : [];
    for (const feature of features) {
      const props = feature?.properties || {};
      const coords = feature?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) {
        continue;
      }
      const lat = coords[1];
      const lon = coords[0];
      const value = props[mode.metric];
      const color = colorForValue(value, thresholds);
      const marker = L.circleMarker([lat, lon], {
        radius: 6,
        color: '#1c1c1c',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.85
      });
      const tooltip = [
        `<strong>Station ${props.station ?? ''}</strong>`,
        `Irradiance: ${formatNumber(props.qg)} W/m^2`,
        `Wind: ${formatNumber(props.ff)} m/s`
      ].join('<br>');
      marker.bindTooltip(tooltip, { permanent: true, direction: 'top', className: 'station-tooltip' });
      marker.addTo(stationLayer);
    }
    stationLayer.addTo(map);
  }

  function renderCurrentMode() {
    const mode = getMode(selectedMode);
    if (!mode) {
      return;
    }
    errorMessage = '';
    if (mode.type === 'region') {
      renderRegion(mode);
    } else {
      renderStations(mode);
    }
  }

  async function refreshData() {
    loading = true;
    errorMessage = '';
    try {
      const [regionResp, stationResp] = await Promise.all([
        fetch(`${REGION_URL}?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`${STATION_URL}?t=${Date.now()}`, { cache: 'no-store' })
      ]);
      if (!regionResp.ok) {
        throw new Error(`Failed to fetch region data (${regionResp.status})`);
      }
      if (!stationResp.ok) {
        throw new Error(`Failed to fetch station data (${stationResp.status})`);
      }
      regionData = await regionResp.json();
      stationData = await stationResp.json();
      recomputeStats(regionData, stationData);
      lastUpdated = new Date().toISOString();
      renderCurrentMode();
    } catch (err) {
      console.error('Failed to refresh KNMI data', err);
      errorMessage = err?.message || String(err);
      clearAllLayers();
      legendStops = [];
    } finally {
      loading = false;
    }
  }

  function handleModeClick(id) {
    if (selectedMode === id) {
      return;
    }
    selectedMode = id;
    renderCurrentMode();
  }

  function formatTimestamp(ts) {
    if (!ts) {
      return '';
    }
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) {
      return ts;
    }
    return date.toLocaleString();
  }

  onMount(() => {
    ensureLeaflet();
    ensureMapAvailable();
    refreshData();
    refreshTimer = setInterval(refreshData, REFRESH_MS);
    mapPollTimer = setInterval(() => {
      if (!map && ensureMapAvailable()) {
        renderCurrentMode();
      }
    }, 1000);
  });

  onDestroy(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    if (mapPollTimer) {
      clearInterval(mapPollTimer);
      mapPollTimer = null;
    }
    clearAllLayers();
  });
</script>

<style>
  section {
    padding: 0.75em;
    max-width: 360px;
    font-family: sans-serif;
    font-size: 0.9em;
    line-height: 1.4;
    color: #1c1c1c;
  }

  h1 {
    font-size: 1.2em;
    margin: 0 0 0.4em;
  }

  p.intro {
    margin: 0 0 0.75em;
  }

  .mode-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.35em;
    margin-bottom: 0.5em;
  }

  .mode-button {
    border: 1px solid rgba(35, 35, 35, 0.6);
    border-radius: 6px;
    padding: 0.35em 0.5em;
    background: rgba(255, 255, 255, 0.85);
    color: #222;
    cursor: pointer;
    font-size: 0.85em;
    text-align: center;
    transition: background 0.15s ease, color 0.15s ease, border 0.15s ease;
  }

  .mode-button:hover {
    background: rgba(40, 120, 180, 0.12);
  }

  .mode-button.selected {
    background: #1f6fb2;
    color: #fff;
    border-color: #1f6fb2;
  }

  .status {
    margin: 0.75em 0 0;
  }

  .status.error {
    color: #b03a2e;
  }

  .legend {
    margin-top: 1em;
    border-top: 1px solid #bcbcbc;
    padding-top: 0.75em;
    color: #111;
  }

  .legend-title {
    font-weight: 600;
    margin-bottom: 0.4em;
  }

  .legend-row {
    display: flex;
    align-items: center;
    margin-bottom: 0.25em;
  }

  .legend-swatch {
    width: 18px;
    height: 12px;
    margin-right: 0.5em;
    border: 1px solid #333333;
    box-sizing: border-box;
  }

  .footer {
    margin-top: 1em;
    font-size: 0.8em;
    color: #444;
  }

  a {
    color: #0b63c1;
  }

  .station-tooltip {
    background: rgba(20, 20, 20, 0.85);
    color: #f1f1f1;
    border: none;
    padding: 2px 6px;
    border-radius: 3px;
    box-shadow: none;
  }
</style>

<section>
  <h1>KNMI Solar & Wind</h1>
  <p class="intro">Live KNMI 10 minute metrics. Toggle between regional averages and individual stations.</p>

  <div class="mode-buttons">
    {#each MODES as mode}
      <button
        type="button"
        class="mode-button" class:selected={selectedMode === mode.id}
        on:click={() => handleModeClick(mode.id)}>
        {mode.label}
      </button>
    {/each}
  </div>

  {#if loading}
    <p class="status">Loading latest data...</p>
  {:else if errorMessage}
    <p class="status error">{errorMessage}</p>
  {:else if lastUpdated}
    <p class="status">Last refreshed: {formatTimestamp(lastUpdated)}</p>
  {/if}

  {#if legendStops.length}
    <div class="legend">
      <div class="legend-title">Legend{legendUnits ? ` (${legendUnits})` : ''}</div>
      {#each legendStops as item}
        <div class="legend-row">
          <span class="legend-swatch" style={`background:${item.color}`}></span>
          <span>{item.label}</span>
        </div>
      {/each}
    </div>
  {/if}

  <p class="footer">
    Sources: <a href={REGION_URL} target="_blank" rel="noopener">region feed</a> &middot;
    <a href={STATION_URL} target="_blank" rel="noopener">station feed</a>. Data refreshes every 10 minutes.
  </p>
</section>
