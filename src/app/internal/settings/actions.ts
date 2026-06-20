'use server';

import { getFolderMappings, addFolderMapping, deleteFolderMapping, FolderMapping } from '@/lib/store';
import { getCommercialFolders, getHourlyFolders, getResidentialFolders } from '@/lib/clickup/clickup_actions';
import { listAllCompaniesServerSide, listAllClientsServerSide } from '@/lib/assembly/client';

export { getFolderMappings };

export async function saveMapping(mapping: FolderMapping) {
  await addFolderMapping(mapping.assemblyId, mapping);
}

export async function removeMapping(assemblyId: string, clickupFolderId: string) {
  await deleteFolderMapping(assemblyId, clickupFolderId);
}

export async function loadSettingsData() {
  const [commercial, hourly, residential, companies, clients] = await Promise.all([
    getCommercialFolders(),
    getHourlyFolders(),
    getResidentialFolders(),
    listAllCompaniesServerSide(),
    listAllClientsServerSide(),
  ]);

  return {
    folders: {
      commercial: commercial.map((f) => ({ id: f.id, name: f.name })),
      hourly: hourly.map((f) => ({ id: f.id, name: f.name })),
      residential: residential.map((f) => ({ id: f.id, name: f.name })),
    },
    companies: companies
      .map((c) => ({ id: c.id ?? '', name: c.name ?? '' }))
      .filter((c) => c.id && c.name),
    clients: clients
      .map((c) => ({
        id: c.id ?? '',
        name: `${c.givenName ?? ''} ${c.familyName ?? ''}`.trim(),
        companyId: c.companyId,
      }))
      .filter((c) => c.id && c.name),
  };
}
