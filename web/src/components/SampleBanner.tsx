type Props = { sampleData: boolean; mock: boolean };

/** Always visible while sample data is in use. */
export function SampleBanner({ sampleData, mock }: Props) {
  if (mock) return <div className="banner" role="status">Mock mode: not connected to the backend</div>;
  if (!sampleData) return null;
  return <div className="banner" role="status">Sample data in Careem's format, via the Careem MCP sandbox</div>;
}
