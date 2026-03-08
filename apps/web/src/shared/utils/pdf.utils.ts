import { apiClient } from '../../core/api/client';

/**
 * Download a PDF from the API and trigger browser download.
 */
export async function downloadPdf(
  endpoint: string,
  filename: string,
): Promise<void> {
  const response = await apiClient.get(endpoint, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadHelpdeskProtocol(ticketId: string, ticketNumber: number): Promise<void> {
  return downloadPdf(`/pdf/helpdesk/${ticketId}/protocol`, `tiket-${ticketNumber}-protokol.pdf`);
}

export function downloadReminderPdf(reminderId: string): Promise<void> {
  return downloadPdf(`/pdf/reminder/${reminderId}`, `upominka-${reminderId.slice(0, 8)}.pdf`);
}
