import handler from '../../../api/orders';
import { runLegacyApi } from '../../../src/lib/server/legacy-api-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return runLegacyApi(request, handler);
}
