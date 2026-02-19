export async function GET() {
  return Response.json({ error: 'Mutual match checks removed.' }, { status: 410 });
}
