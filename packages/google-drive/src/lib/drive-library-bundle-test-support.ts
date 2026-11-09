import type { DriveBundleFetch } from './drive-library-bundle-files';
import type { ResumableFetch } from './drive-resumable-upload';

export type Call = { url: string; method: string; body?: string };
export type Reply = {
  status: number;
  body?: unknown;
  text?: string;
  headers?: Record<string, string>;
};

/** A fake Drive: `route` picks a reply for each request and every call is kept. */
export const fakeDrive = (route: (call: Call) => Reply) => {
  const calls: Call[] = [];
  const respond = (call: Call) => {
    calls.push(call);
    const reply = route(call);

    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      json: async () => reply.body ?? {},
      text: async () => reply.text ?? '',
      headers: { get: (name: string) => reply.headers?.[name] ?? null },
    };
  };
  const fetch: DriveBundleFetch = async (url, init) =>
    respond({ url, method: init.method, body: init.body });
  const resumable: ResumableFetch = async (url, init) =>
    respond({
      url,
      method: init.method,
      body: typeof init.body === 'string' ? init.body : undefined,
    });

  return { calls, fetch, resumable };
};
