import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-knmi-qg-regions',
    version: '0.2.5',
    icon: '\u2600',
    title: 'KNMI Solar Radiation',
    description: 'Overlay KNMI 10 minute irradiance and wind metrics for Dutch regions and stations.',
    author: 'Artis Byte',
    repository: 'https://github.com/artis-byte/NL-solar',
    desktopUI: 'rhpane',
    mobileUI: 'fullscreen',
    routerPath: '/knmi-solar',
    private: false,
};

export default config;
