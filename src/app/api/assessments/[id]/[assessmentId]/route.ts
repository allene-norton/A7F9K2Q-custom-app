import { deleteAssessment, getAssessmentById, getWorkOrderRefs, redis } from '@/lib/store';
import { APPROVAL_NEEDED_FIELD_ID, CUSTOMER_SELECTION_FIELD_ID } from '@/lib/constants';

const CLICKUP_BASE = 'https://api.clickup.com/api/v2';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; assessmentId: string }> },
) {
  const { id, assessmentId } = await params;

  const assessment = await getAssessmentById(id, assessmentId);

  // If the assessment was submitted, reverse the ClickUp changes:
  // re-parent work order tasks back as subtasks, restore fields, reset statuses.
  if (assessment?.submittedAt) {
    const key = process.env.CLICKUP_KEY;
    if (key) {
      // assessmentId format: assess_{companyId}_{parentClickUpTaskId}
      const prefix = `assess_${id}_`;
      const parentClickUpTaskId = assessmentId.startsWith(prefix)
        ? assessmentId.slice(prefix.length)
        : null;

      const authHeaders = { Authorization: key, 'Content-Type': 'application/json' };

      // Find work order refs that belong to this assessment by name match
      const allRefs = await getWorkOrderRefs(id);
      const assessmentRefs = allRefs.filter(
        (r) => r.assessmentName === assessment.assessmentName,
      );

      await Promise.allSettled([
        // Restore each work order task back to a subtask
        ...assessmentRefs.map((ref) =>
          Promise.allSettled([
            // Re-parent under original parent assessment task
            ...(parentClickUpTaskId
              ? [
                  fetch(`${CLICKUP_BASE}/task/${ref.taskId}`, {
                    method: 'PUT',
                    headers: authHeaders,
                    body: JSON.stringify({ parent: parentClickUpTaskId, status: 'open' }),
                  }),
                ]
              : []),
            // Restore Approval Needed = true
            fetch(`${CLICKUP_BASE}/task/${ref.taskId}/field/${APPROVAL_NEEDED_FIELD_ID}`, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({ value: true }),
            }),
            // Clear Customer Selection field
            fetch(`${CLICKUP_BASE}/task/${ref.taskId}/field/${CUSTOMER_SELECTION_FIELD_ID}`, {
              method: 'DELETE',
              headers: { Authorization: key },
            }),
          ]),
        ),
        // Reset parent assessment task status back to open
        ...(parentClickUpTaskId
          ? [
              fetch(`${CLICKUP_BASE}/task/${parentClickUpTaskId}`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({ status: 'open' }),
              }),
            ]
          : []),
      ]);

      // Remove the work order refs from Redis for this assessment
      const remainingRefs = allRefs.filter(
        (r) => r.assessmentName !== assessment.assessmentName,
      );
      await redis.set(`workorders:${id}`, remainingRefs);
    }
  }

  await deleteAssessment(id, assessmentId);
  return Response.json({ success: true });
}
