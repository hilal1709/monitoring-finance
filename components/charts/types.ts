export type HorizontalBarDatum = { label: string; value: number; tooltip?: string };
export type BarSeries = { label: string; data: number[]; color: string; negativeColor?: string };
export type LineSeries = { label: string; data: (number | null)[]; color: string; dashed?: boolean; fill?: boolean; emphasis?: boolean };

export type HorizontalBarChartProps = {
  items: HorizontalBarDatum[];
  color: string;
  negativeColor?: string;
  format: (value: number) => string;
  rowHeight?: number;
  labelWidth?: number;
};

export type GroupedHorizontalBarChartProps = { labels: string[]; series: BarSeries[]; format: (value: number) => string; rowHeight?: number };

export type LineChartProps = { labels: string[]; series: LineSeries[]; format: (value: number) => string; height?: number };

export type DoughnutChartProps = {
  labels: string[];
  values: number[];
  colors: string[];
  centerText?: string;
  tooltips?: string[];
  size?: number;
};
