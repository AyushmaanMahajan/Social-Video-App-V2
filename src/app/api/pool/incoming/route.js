export async function GET() {
  return Response.json({ error: 'Incoming matches removed.' }, { status: 410 });
}
