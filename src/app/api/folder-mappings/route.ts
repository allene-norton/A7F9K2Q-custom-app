import { NextResponse } from 'next/server';
import { getFolderMappings, setFolderMapping, deleteFolderMapping, FolderMapping } from '@/lib/store';

export async function GET() {
  const mappings = await getFolderMappings();
  return NextResponse.json(mappings);
}

export async function POST(request: Request) {
  const mapping: FolderMapping = await request.json();
  await setFolderMapping(mapping.assemblyId, mapping);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { assemblyId } = await request.json();
  await deleteFolderMapping(assemblyId);
  return NextResponse.json({ ok: true });
}
