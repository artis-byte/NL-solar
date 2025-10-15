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
    if (value == null || Number.isNaN(value)) return '—';
    return `${Number(value).toFixed(decimals)}${suffix}`;
  };

  const formatSignedNumber = (value, decimals = 1, suffix = '') => {
    if (value == null || Number.isNaN(value)) return '—';
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${Math.abs(Number(value)).toFixed(decimals)}${suffix}`;
  };

  const formatLongTime = (iso) =>
    iso ? new Date(iso).toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    }) : '—';

  const formatShortTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }) : '—';

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

    return `
      <div class="popup">
        <h3>${name}</h3>
        <p><strong>Radiation</strong>: ${formatNumber(entry?.qg_mean, 0, ' W/m^2')}<br>
           Δ${deltaMinutes} min: ${radiationDelta ? formatSignedNumber(radiationDelta.delta, 0, ' W/m^2') : '—'}${radiationDelta?.previousTime ? ` (vs ${formatShortTime(radiationDelta.previousTime)})` : ''}</p>
        <p><strong>Wind</strong>: ${formatNumber(entry?.wind_speed_mean, 1, ' m/s')} @ ${formatNumber(entry?.wind_direction_mean, 0, '°')}<br>
           Δ${deltaMinutes} min: ${windDelta ? formatSignedNumber(windDelta.delta, 1, ' m/s') : '—'}${windDelta?.previousTime ? ` (vs ${formatShortTime(windDelta.previousTime)})` : ''}</p>
        ${entry?.stations_count != null ? `<p>Stations contributing: ${entry.stations_count}</p>` : ''}
        ${entry?.estimated_output_mw != null ? `<p>Est. PV output: ${formatNumber(entry.estimated_output_mw, 1, ' MW')}</p>` : ''}
      </div>
    `;
  };

  const buildStationPopup = (stationId, entry, historyMap, currentTime) => {
    const deltaMinutes = selectedDelta;
    const radiationDelta = computeDelta(historyMap, currentTime, 'qg', deltaMinutes);
    const windDelta = computeDelta(historyMap, currentTime, 'ff', deltaMinutes);

    return `
      <div class="popup">
        <h3>Station ${stationId}</h3>
        <p><strong>Radiation</strong>: ${formatNumber(entry?.qg, 0, ' W/m^2')}<br>
           Δ${deltaMinutes} min: ${radiationDelta ? formatSignedNumber(radiationDelta.delta, 0, ' W/m^2') : '—'}${radiationDelta?.previousTime ? ` (vs ${formatShortTime(radiationDelta.previousTime)})` : ''}</p>
        <p><strong>Wind</strong>: ${formatNumber(entry?.ff, 1, ' m/s')} @ ${formatNumber(entry?.dd, 0, '°')}<br>
           Δ${deltaMinutes} min: ${windDelta ? formatSignedNumber(windDelta.delta, 1, ' m/s') : '—'}${windDelta?.previousTime ? ` (vs ${formatShortTime(windDelta.previousTime)})` : ''}</p>
        ${entry?.source_filename ? `<p>Source: ${entry.source_filename}</p>` : ''}
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

  $: if (!loading) {
    updateMap();
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
  .popup p {
    margin: 0.25em 0;
    font-size: 0.85em;
  }
</style>

<section>
  <h1>KNMI Wind & Radiation Timeline</h1>

  {#if loading}
    <p class="status">Loading observations…</p>
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
