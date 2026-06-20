import { loadSettingsData, getFolderMappings } from './actions';
import MappingsManager from './MappingsManager';
import Link from 'next/link';

interface SettingsPageProps {
  searchParams: { token?: string };
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';
  const backHref = token ? `/internal?token=${token}` : '/internal';

  const [{ folders, companies, clients }, mappings] = await Promise.all([
    loadSettingsData(),
    getFolderMappings(),
  ]);

  const entities = [
    ...companies.map((c) => ({ id: c.id, name: c.name, type: 'company' as const })),
    ...clients.map((c) => ({ id: c.id, name: c.name, type: 'client' as const })),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href={backHref}
            className="text-sm text-[#174887] hover:underline font-medium"
          >
            ← Back to Dashboard
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-semibold text-gray-800">Folder Mappings</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-600 mb-6">
          Manually link an Assembly company or client to a ClickUp folder. Overrides take
          priority over automatic name matching.
        </p>
        <MappingsManager
          folders={folders}
          entities={entities}
          initialMappings={mappings}
        />
      </div>
    </div>
  );
}
