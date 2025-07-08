<script>
  import { onMount } from 'svelte';
  import * as L from 'leaflet';

  // 1) Point this at your raw GitHub URL:
  const GEOJSON_URL =
    'https://raw.githubusercontent.com/artis-byte/NL-solar/main/qg_regions.geojson';

  let qgLayer;

  // 2) Colour ramp for irradiance (W/m²)
  function getColor(irr) {
    return irr > 800 ? '#800026' :
           irr > 600 ? '#BD0026' :
           irr > 400 ? '#E31A1C' :
           irr > 200 ? '#FC4E2A' :
           irr > 100 ? '#FD8D3C' :
           irr >  50 ? '#FEB24C' :
           irr >  10 ? '#FED976' :
                       '#FFEDA0';
  }

  // 3) Fetch & draw
  async function loadQG() {
    const res = await fetch(GEOJSON_URL + '?t=' + Date.now());
    const gj  = await res.json();

    // Remove previous layer if present
    if (qgLayer) {
      W.map.removeLayer(qgLayer);
    }

    // Add new GeoJSON layer
    qgLayer = L.geoJSON(gj, {
      style: feature => ({
        fillColor: getColor(feature.properties.qg_mean),
        fillOpacity: 0.6,
        weight: 1,
        color: '#333'
      }),
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`
          <strong>${feature.properties.name}</strong><br>
          Irradiance: ${feature.properties.qg_mean.toFixed(0)} W/m²<br>
          Est. Output: ${(feature.properties.estimated_output_mw||0).toFixed(1)} MW
        `);
      }
    }).addTo(W.map);
  }

  // 4) Run on mount and every 10 min
  onMount(() => {
    loadQG();
    setInterval(loadQG, 600_000);
  });
</script>

<style>
  /* You can style your plugin pane here */
  section {
    padding: 0.5em;
  }
  h1 {
    font-size: 1.2em;
    margin: 0 0 0.5em;
  }
</style>

<section>
  <h1>KNMI QG Regions</h1>
  <p>Live 10-minute global irradiance overlay.</p>
</section>
