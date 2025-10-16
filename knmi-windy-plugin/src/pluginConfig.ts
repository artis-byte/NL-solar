import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-knmi-timeline',
    version: '3.5.0',
    icon: 'wind',
    title: 'KNMI Wind & Radiation Timeline',
    description: 'Explore 10-minute KNMI wind speed and irradiance changes across Dutch regions and stations.',
    author: 'Artis Byte',
    repository: 'https://github.com/artis-byte/NL-solar',
    desktopUI: 'rhpane',
    mobileUI: 'fullscreen',
    routerPath: '/knmi-timeline',
    private: false,
};

export default config;
