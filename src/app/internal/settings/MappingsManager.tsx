'use client';

import { useState, useTransition } from 'react';
import { FolderMapping } from '@/lib/store';
import { saveMapping, removeMapping } from './actions';

type Space = 'commercial' | 'hourly' | 'residential';

interface FolderOption {
  id: string;
  name: string;
}

interface AssemblyEntity {
  id: string;
  name: string;
  type: 'company' | 'client';
}

interface Props {
  folders: Record<Space, FolderOption[]>;
  entities: AssemblyEntity[];
  initialMappings: Record<string, FolderMapping>;
}

const SPACE_LABELS: Record<Space, string> = {
  commercial: 'Commercial',
  hourly: 'Hourly',
  residential: 'Residential',
};

export default function MappingsManager({ folders, entities, initialMappings }: Props) {
  const [mappings, setMappings] = useState(initialMappings);
  const [selectedAssemblyId, setSelectedAssemblyId] = useState('');
  const [selectedFolderKey, setSelectedFolderKey] = useState(''); // "space::folderId"
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleLink = () => {
    if (!selectedAssemblyId || !selectedFolderKey) return;
    const [space, folderId] = selectedFolderKey.split('::') as [Space, string];
    const folder = folders[space].find((f) => f.id === folderId);
    const entity = entities.find((e) => e.id === selectedAssemblyId);
    if (!folder || !entity) return;

    const mapping: FolderMapping = {
      assemblyId: entity.id,
      assemblyType: entity.type,
      assemblyName: entity.name,
      clickupFolderId: folder.id,
      clickupFolderName: folder.name,
      clickupSpace: space,
    };

    startTransition(async () => {
      try {
        await saveMapping(mapping);
        setMappings((prev) => ({ ...prev, [entity.id]: mapping }));
        setSelectedAssemblyId('');
        setSelectedFolderKey('');
        setError(null);
      } catch {
        setError('Failed to save mapping. Please try again.');
      }
    });
  };

  const handleRemove = (assemblyId: string) => {
    startTransition(async () => {
      try {
        await removeMapping(assemblyId);
        setMappings((prev) => {
          const next = { ...prev };
          delete next[assemblyId];
          return next;
        });
        setError(null);
      } catch {
        setError('Failed to remove mapping. Please try again.');
      }
    });
  };

  const mappingList = Object.values(mappings);

  const selectClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#174887] focus:border-[#174887]';

  return (
    <div className="space-y-8">
      {/* Existing mappings */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Current Mappings</h2>
        {mappingList.length === 0 ? (
          <p className="text-sm text-gray-500">No manual mappings configured yet.</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Assembly</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">ClickUp Folder</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Space</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mappingList.map((m) => (
                  <tr key={m.assemblyId} className="bg-white hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">
                      {m.assemblyName}
                      <span className="ml-2 text-xs text-gray-400 capitalize">({m.assemblyType})</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{m.clickupFolderName}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{m.clickupSpace}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(m.assemblyId)}
                        disabled={isPending}
                        className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add new mapping */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Add New Mapping</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assembly Company or Client</label>
            <select
              value={selectedAssemblyId}
              onChange={(e) => setSelectedAssemblyId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select…</option>
              <optgroup label="Companies">
                {entities
                  .filter((e) => e.type === 'company')
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Clients">
                {entities
                  .filter((e) => e.type === 'client')
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ClickUp Folder</label>
            <select
              value={selectedFolderKey}
              onChange={(e) => setSelectedFolderKey(e.target.value)}
              className={selectClass}
            >
              <option value="">Select…</option>
              {(['commercial', 'hourly', 'residential'] as Space[]).map((space) => (
                <optgroup key={space} label={SPACE_LABELS[space]}>
                  {folders[space]
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((f) => (
                      <option key={f.id} value={`${space}::${f.id}`}>
                        {f.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleLink}
          disabled={!selectedAssemblyId || !selectedFolderKey || isPending}
          className="mt-4 px-5 py-2 bg-[#174887] text-white text-sm font-semibold rounded-lg
                     hover:bg-[#0f3661] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Saving…' : 'Link'}
        </button>
      </section>
    </div>
  );
}
