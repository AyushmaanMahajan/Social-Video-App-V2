export async function GET() {
  return Response.json({ error: 'Pools have been removed.' }, { status: 410 });
}
