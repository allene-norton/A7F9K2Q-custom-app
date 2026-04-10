'use server';

import {
  listClientsByCompany,
  listAllInternalUsers,
  createNotification,
  createNotificationServerSide,
} from './assembly/client';
import { addUnreadNotification, appendInternalNotification, InternalNotificationEntry } from './store';

interface NotificationContent {
  inProduct: { title: string; body?: string };
}

/**
 * Notify all clients of a company (e.g. assessment sent, internal comment posted).
 * Resolves senderId from the first internal user found in the workspace.
 */
export async function notifyClientsAbout(
  token: string,
  companyId: string,
  content: NotificationContent,
  taskId?: string,
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
        createNotification(token, {
          senderId,
          recipientClientId: c.id!,
          recipientCompanyId: companyId,
          deliveryTargets: { inProduct: content.inProduct },
        }),
      ),
  );

  // Store notification IDs so customers can mark them as read
  if (taskId) {
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        await addUnreadNotification(companyId, taskId, result.value);
      }
    }
  }

  const failed = results.filter((r) => r.status === 'rejected').length;
  console.log(`[notify] notifyClientsAbout: sent=${results.length - failed} failed=${failed}`);
}

/**
 * Notify all clients of a company using only the API key (no user token).
 * Use this from webhook handlers and other server-side contexts without a session.
 */
export async function notifyClientsServerSide(
  companyId: string,
  content: NotificationContent,
  taskId?: string,
): Promise<void> {
  const [clients, internalUsers] = await Promise.all([
    listClientsByCompany(companyId),
    listAllInternalUsers(),
  ]);

  const senderId = internalUsers[0]?.id;
  if (!senderId || clients.length === 0) {
    console.error(`[notify] notifyClientsServerSide: no senderId or clients for companyId=${companyId}`);
    return;
  }

  const results = await Promise.allSettled(
    clients
      .filter((c) => c.id)
      .map((c) =>
        createNotificationServerSide({
          senderId,
          recipientClientId: c.id!,
          recipientCompanyId: companyId,
          deliveryTargets: { inProduct: content.inProduct },
        }),
      ),
  );

  if (taskId) {
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        await addUnreadNotification(companyId, taskId, result.value);
      }
    }
  }

  const failed = results.filter((r) => r.status === 'rejected').length;
  console.log(`[notify] notifyClientsServerSide: sent=${results.length - failed} failed=${failed}`);
}

/**
 * Notify all internal users (e.g. assessment submitted, customer comment posted).
 * Requires a senderId — the Assembly client ID of whoever triggered the action.
 */
export async function notifyInternalUsersAbout(
  token: string,
  senderId: string,
  content: NotificationContent,
  context?: Omit<InternalNotificationEntry, 'createdAt'>,
): Promise<void> {
  const users = await listAllInternalUsers();

  console.log(`[notify] notifyInternalUsersAbout senderId=${senderId} users=${users.length}`);

  if (users.length === 0) {
    console.error('[notify] notifyInternalUsersAbout: no internal users found');
    return;
  }

  const results = await Promise.allSettled(
    users
      .filter((u) => u.id)
      .map((u) =>
        createNotification(token, {
          senderId,
          recipientInternalUserId: u.id,
          deliveryTargets: { inProduct: content.inProduct },
        }),
      ),
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  console.log(`[notify] notifyInternalUsersAbout: sent=${results.length - failed} failed=${failed}`);

  if (context) {
    await appendInternalNotification({ ...context, createdAt: new Date().toISOString() });
  }
}
