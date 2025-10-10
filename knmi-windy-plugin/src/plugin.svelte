<script>
  import { onMount, onDestroy } from 'svelte';
  import { map as windyMap } from '@windy/map';

  const DATA_URL = 'https://raw.githubusercontent.com/artis-byte/NL-solar/main/qg_regions.geojson';
  const REFRESH_MS = 600_000;
  const COLORS = ['#800026', '#BD0026', '#E31A1C', '#FC4E2A', '#FD8D3C', '#FEB24C', '#FED976', '#FFEDA0'];
  const METRIC_LABELS = {
    qg_mean: 'Mean global irradiance (qg)',
    estimated_output_mw: 'Estimated PV output',
    solar_capacity_mw: 'Installed solar capacity'
  };
  const METRIC_UNITS = {
    qg_mean: 'W/m^2',
    estimated_output_mw: 'MW',
    solar_capacity_mw: 'MW'
  };
  const DEFAULT_METRIC = 'qg_mean';

  let map = null;
  let leafletLib = null;
  let overlayLayer = null;
  let refreshTimer = null;
  let mapPollTimer = null;

  let loading = false;
  let errorMessage = '';
  let lastUpdated = '';
  let selectedMetric = DEFAULT_METRIC;
  let metrics = {};
  let metricKeys = [];
  let legendStops = [];
  let legendUnits = '';
  let latestGeoJSON = null;

  function getWindyMap() {
    return windyMap;
  }

  function ensureMapAvailable() {
    const current = getWindyMap();
    if (!current) {
      return false;
    }
    map = current;
    return typeof map.addLayer === 'function';
  }

  function ensureLeaflet() {
    if (!leafletLib && typeof window !== 'undefined') {
      leafletLib = window.L || null;
    }
    return leafletLib;
  }

  function formatNumber(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 'n/a';
    }
    const abs = Math.abs(value);
    if (abs >= 1000) {
      return value.toFixed(0);
    }
    if (abs >= 100) {
      return value.toFixed(0);
    }
    if (abs >= 10) {
      return value.toFixed(1);
    }
    if (abs >= 1) {
      return value.toFixed(2);
    }
    if (abs === 0) {
      return '0';
    }
    return value.toPrecision(2);
  }

  function thresholdsFor(key, stats) {
    if (key === 'qg_mean') {
      return [800, 600, 400, 200, 100, 50, 10];
    }
    const steps = COLORS.length - 1;
    const min = stats.min;
    const max = stats.max;
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
      return [];
    }
    const span = max - min;
    const thresholds = [];
    for (let i = steps; i >= 1; i -= 1) {
      thresholds.push(min + (span * i) / steps);
    }
    return thresholds;
  }

  function buildLegend(thresholds, metricKey) {
    const items = [];
    const units = METRIC_UNITS[metricKey] || '';
    for (let i = 0; i < COLORS.length; i += 1) {
      let label;
      if (!thresholds.length) {
        label = i === 0 ? 'Higher values' : i === COLORS.length - 1 ? 'Lower values' : '';
      } else if (i === 0) {
        label = `>= ${formatNumber(thresholds[0])}`;
      } else if (i === COLORS.length - 1) {
        label = `< ${formatNumber(thresholds[thresholds.length - 1])}`;
      } else {
        label = `${formatNumber(thresholds[i - 1])} - ${formatNumber(thresholds[i])}`;
      }
      if (units && label && label !== 'Higher values' && label !== 'Lower values') {
        label = `${label} ${units}`;
      }
      items.push({ color: COLORS[i], label });
    }
    return items;
  }

  function computeMetrics(geojson) {
    const features = Array.isArray(geojson?.features) ? geojson.features : [];
    const store = {};
    for (const feature of features) {
      const props = feature && feature.properties;
      if (!props) {
        continue;
      }
      for (const [key, value] of Object.entries(props)) {
        if (typeof value === 'number' && Number.isFinite(value) && key !== 'level') {
          if (!store[key]) {
            store[key] = [];
          }
          store[key].push(value);
        }
      }
    }

    const result = {};
    for (const [key, values] of Object.entries(store)) {
      if (!values.length) {
        continue;
      }
      const min = values.reduce((acc, val) => Math.min(acc, val), values[0]);
      const max = values.reduce((acc, val) => Math.max(acc, val), values[0]);
      result[key] = {
        key,
        label: METRIC_LABELS[key] || key,
        units: METRIC_UNITS[key] || '',
        min,
        max,
        thresholds: thresholdsFor(key, { min, max })
      };
    }
    return result;
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

  function popupContent(feature) {
    const props = feature?.properties || {};
    const parts = [];
    const title = props.name || props.station || 'Region';
    parts.push(`<strong>${title}</strong>`);
    const metricInfo = metrics[selectedMetric];
    if (metricInfo) {
      const value = props[selectedMetric];
      const unit = metricInfo.units ? ` ${metricInfo.units}` : '';
      parts.push(`${metricInfo.label}: ${formatNumber(value)}${unit}`);
    }
    const secondary = ['estimated_output_mw', 'solar_capacity_mw'];
    for (const key of secondary) {
      if (key === selectedMetric) {
        continue;
      }
      const val = props[key];
      if (typeof val === 'number' && Number.isFinite(val)) {
        const unit = METRIC_UNITS[key] ? ` ${METRIC_UNITS[key]}` : '';
        const label = METRIC_LABELS[key] || key;
        parts.push(`${label}: ${formatNumber(val)}${unit}`);
      }
    }
    return parts.join('<br>');
  }

  function removeLayer() {
    if (!overlayLayer || !ensureLeaflet()) {
      return;
    }
    if (typeof overlayLayer.remove === 'function') {
      overlayLayer.remove();
    } else if (map && typeof map.removeLayer === 'function') {
      map.removeLayer(overlayLayer);
    }
    overlayLayer = null;
  }

  function renderLayer(geojson) {
    if (!geojson) {
      removeLayer();
      return;
    }
    const metricInfo = metrics[selectedMetric];
    if (!metricInfo) {
      errorMessage = 'No numeric metric found in dataset.';
      removeLayer();
      return;
    }

    const L = ensureLeaflet();
    if (!L) {
      errorMessage = 'Leaflet library is not available in Windy.';
      removeLayer();
      return;
    }
    if (!ensureMapAvailable()) {
      return;
    }

    removeLayer();
    legendStops = buildLegend(metricInfo.thresholds, selectedMetric);
    legendUnits = metricInfo.units || '';

    overlayLayer = L.geoJSON(geojson, {
      style: feature => {
        const props = feature?.properties || {};
        const value = props[selectedMetric];
        return {
          fillColor: colorForValue(value, metricInfo.thresholds),
          fillOpacity: 0.6,
          weight: 1,
          color: '#333333'
        };
      },
      onEachFeature: (feature, layer) => {
        const html = popupContent(feature);
        if (html) {
          layer.bindPopup(html);
        }
      }
    });

    if (typeof overlayLayer.addTo === 'function') {
      overlayLayer.addTo(map);
    } else if (typeof map.addLayer === 'function') {
      map.addLayer(overlayLayer);
    } else {
      errorMessage = 'Unable to attach layer to Windy map.';
      overlayLayer = null;
    }
  }

  async function fetchData() {
    loading = true;
    errorMessage = '';
    try {
      const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const geojson = await response.json();
      latestGeoJSON = geojson;
      metrics = computeMetrics(geojson);
      metricKeys = Object.keys(metrics);
      if (!metricKeys.length) {
        throw new Error('GeoJSON does not contain numeric metrics.');
      }
      if (!metrics[selectedMetric]) {
        selectedMetric = metrics[DEFAULT_METRIC] ? DEFAULT_METRIC : metricKeys[0];
      }
      renderLayer(geojson);
      lastUpdated = new Date().toISOString();
    } catch (err) {
      console.error('Failed to load KNMI data', err);
      errorMessage = err?.message || String(err);
      latestGeoJSON = null;
      metrics = {};
      metricKeys = [];
      legendStops = [];
      legendUnits = '';
      removeLayer();
    } finally {
      loading = false;
    }
  }

  function handleMetricChange(event) {
    selectedMetric = event.currentTarget.value;
    renderLayer(latestGeoJSON);
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
    fetchData();
    refreshTimer = setInterval(fetchData, REFRESH_MS);
    if (!mapPollTimer) {
      mapPollTimer = setInterval(() => {
        if (!map && ensureMapAvailable() && latestGeoJSON) {
          renderLayer(latestGeoJSON);
          clearInterval(mapPollTimer);
          mapPollTimer = null;
        }
      }, 1000);
    }
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
    removeLayer();
  });
</script>

<style>
  section {
    padding: 0.75em;
    max-width: 320px;
    font-family: sans-serif;
    font-size: 0.9em;
    line-height: 1.4;
  }

  h1 {
    font-size: 1.2em;
    margin: 0 0 0.4em;
  }

  p.intro {
    margin: 0 0 0.75em;
  }

  label {
    display: block;
    margin: 0.75em 0 0.25em;
    font-weight: 600;
  }

  select {
    width: 100%;
    padding: 0.3em;
    margin-top: 0.25em;
  }

  .status {
    margin: 0.75em 0 0;
  }

  .status.error {
    color: #b03a2e;
  }

  .legend {
    margin-top: 1em;
    border-top: 1px solid #dddddd;
    padding-top: 0.75em;
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
    color: #555555;
  }

  a {
    color: #0066cc;
  }
</style>

<section>
  <h1>KNMI Solar Radiation</h1>
  <p class="intro">Overlay KNMI 10 minute irradiance averaged per Dutch region.</p>

  {#if metricKeys.length}
    <label for="metric-select">Metric</label>
    <select id="metric-select" on:change={handleMetricChange} bind:value={selectedMetric}>
      {#each metricKeys as key}
        <option value={key}>{metrics[key].label}</option>
      {/each}
    </select>
  {/if}

  {#if loading}
    <p class="status">Loading latest data...</p>
  {:else if errorMessage}
    <p class="status error">Failed to load data: {errorMessage}</p>
  {:else if lastUpdated}
    <p class="status">Last refreshed: {formatTimestamp(lastUpdated)}</p>
  {/if}

  {#if legendStops.length}
    <div class="legend">
      <div class="legend-title">Legend{legendUnits ? ' (' + legendUnits + ')' : ''}</div>
      {#each legendStops as item}
        {#if item.label}
          <div class="legend-row">
            <span class="legend-swatch" style={`background:${item.color}`}></span>
            <span>{item.label}</span>
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  <p class="footer">
    Source: <a href={DATA_URL} target="_blank" rel="noopener">GeoJSON feed</a>. Data refreshes every 10 minutes.
  </p>
</section>
