import Plot from 'react-plotly.js';
import { Data, Layout } from 'plotly.js';

interface PlotlyWrapperProps {
  data: Data[];
  layout?: Partial<Layout>;
  title?: string;
}

/**
 * Reusable Plotly chart wrapper with consistent theming
 */
export function PlotlyWrapper({ data, layout = {}, title }: PlotlyWrapperProps) {
  const defaultLayout: Partial<Layout> = {
    title: title ? { text: title } : undefined,
    autosize: true,
    paper_bgcolor: 'white',
    plot_bgcolor: 'white',
    font: {
      family: 'Inter, system-ui, sans-serif',
    },
    margin: {
      l: 60,
      r: 40,
      t: title ? 60 : 40,
      b: 60,
    },
    ...layout,
  };

  return (
    <Plot
      data={data}
      layout={defaultLayout}
      config={{
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      }}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
