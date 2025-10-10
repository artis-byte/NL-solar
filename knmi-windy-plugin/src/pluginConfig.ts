import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-knmi-qg-regions',
    version: '0.2.4',
    icon: '\u2600',
    title: 'KNMI Solar Radiation',
    description: 'Overlay KNMI 10 minute irradiance (qg) averaged per Dutch region.',
    author: 'Artis Byte',
    repository: 'https://github.com/artis-byte/NL-solar',
    desktopUI: 'rhpane',
    mobileUI: 'fullscreen',
    routerPath: '/knmi-solar',
    private: false,
};

export default config;
