import { POST as reportEncounter } from '@/app/api/encounter/report/route';

export async function POST(request) {
  return reportEncounter(request);
}
