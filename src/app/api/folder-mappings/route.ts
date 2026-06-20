import { NextResponse } from 'next/server';
import { getFolderMappings, addFolderMapping, deleteFolderMapping, FolderMapping } from '@/lib/store';

export async function GET() {
  const mappings = await getFolderMappings();
  return NextResponse.json(mappings);
}

export async function POST(request: Request) {
  const mapping: FolderMapping = await request.json();
  await addFolderMapping(mapping.assemblyId, mapping);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { assemblyId, clickupFolderId } = await request.json();
  await deleteFolderMapping(assemblyId, clickupFolderId);
  return NextResponse.json({ ok: true });
}
