'use server';

import {
  listClientsByCompany,
  listAllInternalUsers,
  createNotification,
} from './assembly/client';

interface NotificationContent {
  inProduct: { title: string; body?: string };
  email?: { subject?: string; body?: string };
}

/**
 * Notify all clients of a company (e.g. assessment sent, internal comment posted).
 * Resolves senderId from the first internal user found in the workspace.
 */
export async function notifyClientsAbout(
  companyId: string,
  content: NotificationContent,
): Promise<void> {
  const [clients, internalUsers] = await Promise.all([
    listClientsByCompany(companyId),
    listAllInternalUsers(),
  ]);

  console.log(`[notify] notifyClientsAbout companyId=${companyId} clients=${clients.length} internalUsers=${internalUsers.length}`);

  const senderId = internalUsers[0]?.id;
  if (!senderId) {
    console.error('[notify] notifyClientsAbout: no internal users found to use as senderId');
    return;
  }
  if (clients.length === 0) {
    console.error(`[notify] notifyClientsAbout: no clients found for companyId=${companyId}`);
    return;
  }

  const results = await Promise.allSettled(
    clients
      .filter((c) => c.id)
      .map((c) =>
        createNotification({
          senderId,
          recipientClientId: c.id!,
          recipientCompanyId: companyId,
          deliveryTargets: {
            inProduct: content.inProduct,
            ...(content.email ? { email: content.email } : {}),
          },
        }),
      ),
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  console.log(`[notify] notifyClientsAbout: sent=${results.length - failed} failed=${failed}`);
}

/**
 * Notify all internal users (e.g. assessment submitted, customer comment posted).
 * Requires a senderId — the Assembly client ID of whoever triggered the action.
 */
export async function notifyInternalUsersAbout(
  senderId: string,
  senderCompanyId: string,
  content: NotificationContent,
): Promise<void> {
  const users = await listAllInternalUsers();

  console.log(`[notify] notifyInternalUsersAbout senderId=${senderId} senderCompanyId=${senderCompanyId} users=${users.length}`);

  if (users.length === 0) {
    console.error('[notify] notifyInternalUsersAbout: no internal users found');
    return;
  }

  const results = await Promise.allSettled(
    users
      .filter((u) => u.id)
      .map((u) =>
        createNotification({
          senderId,
          senderCompanyId,
          recipientInternalUserId: u.id,
          deliveryTargets: {
            inProduct: content.inProduct,
            ...(content.email ? { email: content.email } : {}),
          },
        }),
      ),
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  console.log(`[notify] notifyInternalUsersAbout: sent=${results.length - failed} failed=${failed}`);
}
