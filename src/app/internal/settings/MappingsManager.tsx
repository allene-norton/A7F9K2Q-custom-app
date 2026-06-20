'use client';

import { useState, useTransition } from 'react';
import { FolderMapping } from '@/lib/store';
import { saveMapping, removeMapping } from './actions';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  initialMappings: Record<string, FolderMapping[]>;
}

const SPACE_LABELS: Record<Space, string> = {
  commercial: 'Commercial',
  hourly: 'Hourly',
  residential: 'Residential',
};

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  groups: { label: string; items: { value: string; label: string }[] }[];
}

function SearchableSelect({ value, onChange, placeholder, groups }: ComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = groups
    .flatMap((g) => g.items)
    .find((i) => i.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg
                     bg-white text-sm text-left focus:outline-none focus:ring-2 focus:ring-[#174887]
                     focus:border-[#174887] hover:border-gray-400 transition-colors"
        >
          <span className={selectedLabel ? 'text-gray-900' : 'text-gray-400'}>
            {selectedLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search…" className="h-9" />
          <CommandList className="max-h-64">
            <CommandEmpty>No results found.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.label}
                    onSelect={() => {
                      onChange(item.value === value ? '' : item.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', value === item.value ? 'opacity-100' : 'opacity-0')}
                    />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function MappingsManager({ folders, entities, initialMappings }: Props) {
  const [mappings, setMappings] = useState(initialMappings);
  const [selectedAssemblyId, setSelectedAssemblyId] = useState('');
  const [selectedFolderKey, setSelectedFolderKey] = useState(''); // "space::folderId"
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const assemblyGroups = [
    {
      label: 'Companies',
      items: entities
        .filter((e) => e.type === 'company')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((e) => ({ value: e.id, label: e.name })),
    },
    {
      label: 'Clients',
      items: entities
        .filter((e) => e.type === 'client')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((e) => ({ value: e.id, label: e.name })),
    },
  ];

  const folderGroups = (['commercial', 'hourly', 'residential'] as Space[]).map((space) => ({
    label: SPACE_LABELS[space],
    items: folders[space]
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => ({ value: `${space}::${f.id}`, label: f.name })),
  }));

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
        setMappings((prev) => {
          const current = prev[entity.id] ?? [];
          const without = current.filter((m) => m.clickupFolderId !== folder.id);
          return { ...prev, [entity.id]: [...without, mapping] };
        });
        setSelectedFolderKey('');
        setError(null);
      } catch {
        setError('Failed to save mapping. Please try again.');
      }
    });
  };

  const handleRemove = (assemblyId: string, clickupFolderId: string) => {
    startTransition(async () => {
      try {
        await removeMapping(assemblyId, clickupFolderId);
        setMappings((prev) => {
          const filtered = (prev[assemblyId] ?? []).filter(
            (m) => m.clickupFolderId !== clickupFolderId,
          );
          const next = { ...prev };
          if (filtered.length === 0) delete next[assemblyId];
          else next[assemblyId] = filtered;
          return next;
        });
        setError(null);
      } catch {
        setError('Failed to remove mapping. Please try again.');
      }
    });
  };

  const rows = Object.values(mappings).flat();

  return (
    <div className="space-y-8">
      {/* Existing mappings */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Current Mappings</h2>
        {rows.length === 0 ? (
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
                {rows.map((m) => (
                  <tr key={`${m.assemblyId}::${m.clickupFolderId}`} className="bg-white hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">
                      {m.assemblyName}
                      <span className="ml-2 text-xs text-gray-400 capitalize">({m.assemblyType})</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{m.clickupFolderName}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{m.clickupSpace}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(m.assemblyId, m.clickupFolderId)}
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
        <h2 className="text-base font-semibold text-gray-800 mb-3">Add Mapping</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assembly Company or Client</label>
            <SearchableSelect
              value={selectedAssemblyId}
              onChange={setSelectedAssemblyId}
              placeholder="Select…"
              groups={assemblyGroups}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ClickUp Folder</label>
            <SearchableSelect
              value={selectedFolderKey}
              onChange={setSelectedFolderKey}
              placeholder="Select…"
              groups={folderGroups}
            />
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
