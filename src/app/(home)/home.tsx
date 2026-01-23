import { copilotApi } from 'copilot-node-sdk';

import { DefaultPage } from '@/app/(home)/defaultPage';
import { TokenGate } from '@/components/TokenGate';
import { Container } from '@/components/Container';

/**
 * The revalidate property determine's the cache TTL for this page and
 * all fetches that occur within it. This value is in seconds.
 */
export const revalidate = 180;

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const { token } = searchParams;
  const copilot = copilotApi({
    apiKey: process.env.COPILOT_API_KEY ?? '',
    token: typeof token === 'string' ? token : undefined,
  });
  const workspace = await copilot.retrieveWorkspace();
  const session = await copilot.getTokenPayload?.();
  console.log({ workspace, session });
  return (
    // <Container>
      <DefaultPage portalUrl={workspace.portalUrl} />
    // </Container>
  );
}

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <TokenGate searchParams={searchParams}>
      <Content searchParams={searchParams} />
    </TokenGate>
  );
}
