// @ts-check
// The docs.snappingtrail.com site: the manual in English (the default, at the root) and in
// Portuguese (/pt/), plus the legacy pages kept at their addresses (see plugins/legacy-pages.js).

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'SnappingTrail',
  tagline: 'User manual',
  url: 'https://docs.snappingtrail.com',
  baseUrl: '/',
  trailingSlash: true,
  favicon: 'img/snappingtrail-icon.svg',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt'],
    localeConfigs: {
      en: {label: 'English', htmlLang: 'en'},
      pt: {label: 'Português', htmlLang: 'pt-BR'},
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: 'manual',
          sidebarPath: './sidebars.js',
        },
        blog: false,
        pages: false,
        theme: {},
      }),
    ],
  ],

  plugins: ['./plugins/legacy-pages.js'],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      /** @type {import('@easyops-cn/docusaurus-search-local').PluginOptions} */
      ({
        hashed: true,
        language: ['en', 'pt'],
        docsRouteBasePath: 'manual',
        indexBlog: false,
        indexPages: false,
        highlightSearchTermsOnTargetPage: true,
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'SnappingTrail',
        // The manual's home in the page's language (/manual/, /pt/manual/): '/' is the old index.
        logo: {alt: 'SnappingTrail', src: 'img/snappingtrail-icon.svg', href: '/manual/'},
        items: [
          {type: 'docSidebar', sidebarId: 'manual', position: 'left', label: 'Manual'},
          {type: 'localeDropdown', position: 'right'},
        ],
      },
      footer: {
        style: 'light',
        copyright: 'SnappingTrail · Navaho Consultoria',
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
