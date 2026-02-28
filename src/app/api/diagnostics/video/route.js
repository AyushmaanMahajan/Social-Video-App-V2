import diagnostics from '../../../../../server/videoDiagnostics';
const { getVideoDiagnosticsReport } = diagnostics;

export async function GET() {
  try {
    const report = getVideoDiagnosticsReport();
    return Response.json(report);
  } catch (error) {
    return Response.json(
      { error: 'Failed to build diagnostics report', details: error?.message || 'unknown_error' },
      { status: 500 }
    );
  }
}
