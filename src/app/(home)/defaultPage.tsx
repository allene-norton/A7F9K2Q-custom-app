'use client';

import { useBreadcrumbs } from '@/bridge/header';
import { Body, Heading, Icon } from 'copilot-design-system';

/**
 * The revalidate property determine's the cache TTL for this page and
 * all fetches that occur within it. This value is in seconds.
 */
export const revalidate = 180;

export function DefaultPage({ portalUrl }: { portalUrl?: string }) {
  useBreadcrumbs(
    [
      {
        label: 'Home',
      },
    ],
    { portalUrl },
  );

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-2xl">CT</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            Access Restricted
          </h1>
          <p className="text-gray-600 leading-relaxed">
            It appears you don't currently have access to this application.
            Please contact your portal administrator to verify your permissions
            or report any technical issues.
          </p>
          <div className="mt-8 text-sm text-gray-500">
            ClearTech Background Services
          </div>
        </div>
      </div>
    </>
  );
}
