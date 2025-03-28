/**
 * Arquivo para configuração da API do Google Maps
 */

// Chave de API do Google Maps
export const GOOGLE_MAPS_API_KEY = "AIzaSyATojw34rHgODqIh_nZTOeJxEEX90O9Nks";

// Bibliotecas que serão carregadas com a API do Google Maps
export const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry" | "drawing" | "directions")[] = [
  "places",
  "directions"
];