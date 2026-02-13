/// <reference types="vite/client" />

declare module 'react-leaflet-markercluster' {
  import { ComponentType } from 'react';
  const MarkerClusterGroup: ComponentType<{ children?: React.ReactNode }>;
  export default MarkerClusterGroup;
}
