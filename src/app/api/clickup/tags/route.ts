import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const spaceId = req.nextUrl.searchParams.get('spaceId');
  if (!spaceId) return Response.json({ tags: [] }, { status: 400 });

  const key = process.env.CLICKUP_KEY;
  if (!key) return Response.json({ tags: [] }, { status: 500 });

  const res = await fetch(`https://api.clickup.com/api/v2/space/${spaceId}/tag`, {
    headers: { Authorization: key },
  });

  const data = await res.json();
  return Response.json({ tags: data.tags ?? [] });
}
