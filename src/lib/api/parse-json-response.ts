export async function parseJsonResponse<T = Record<string, unknown>>(
  response: Response
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const snippet = (await response.text()).slice(0, 120);
    const looksLikeHtml = snippet.trimStart().startsWith('<!');
    return {
      ok: false,
      status: response.status,
      data: null,
      error: looksLikeHtml
        ? `Сервер вернул HTML вместо JSON (${response.status}). Обновите приложение или попробуйте позже.`
        : `Неверный ответ сервера (${response.status})`,
    };
  }

  try {
    const data = (await response.json()) as T;
    const bodyError =
      !response.ok && data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null;
    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? null : bodyError || 'Request failed',
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      data: null,
      error: 'Не удалось разобрать ответ сервера',
    };
  }
}
