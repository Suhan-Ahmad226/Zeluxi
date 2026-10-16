import handler from '../../../api/products';
import { runLegacyApi } from '../../../src/lib/server/legacy-api-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) { return runLegacyApi(request, handler); }
export async function POST(request: Request) { return runLegacyApi(request, handler); }
export async function PATCH(request: Request) { return runLegacyApi(request, handler); }
export async function DELETE(request: Request) { return runLegacyApi(request, handler); }
