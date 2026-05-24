import type { ProjectListItem, Projection, WritingEvent } from '../types';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api/planning/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${res.status}`);
  }
  return res.json();
}

export async function createProject(
  username: string,
  title: string,
  templateId: string,
): Promise<{ projectId: string }> {
  return apiFetch(`users/${username}/projects`, {
    method: 'POST',
    body: JSON.stringify({ title, templateId }),
  });
}

export async function listProjects(username: string): Promise<ProjectListItem[]> {
  const data = await apiFetch(`users/${username}/projects`);
  return data.projects ?? [];
}

export async function appendEvent(
  projectId: string,
  event: WritingEvent & { note?: string },
): Promise<void> {
  await apiFetch(`projects/${projectId}/events`, {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export async function getProjection(projectId: string): Promise<Projection> {
  return apiFetch(`projects/${projectId}/projection`);
}
