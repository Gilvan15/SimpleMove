/**
 * Este arquivo corrige um problema comum com os ícones do Leaflet no React
 * Os ícones não são carregados corretamente porque os caminhos relativos estão incorretos
 */

import L from 'leaflet';

// Corrige uma deficiência do Leaflet ao funcionar com bundlers como Webpack ou Vite
// Os caminhos relativos para os ícones estão incorretos
const fixLeafletIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
};

export default fixLeafletIcon;