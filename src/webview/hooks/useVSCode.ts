import type { WebviewMessage } from '../../shared/types';

declare function acquireVsCodeApi(): {
  postMessage(msg: WebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
};

let vscodeApi: ReturnType<typeof acquireVsCodeApi> | undefined;

export function getVSCode(): ReturnType<typeof acquireVsCodeApi> {
  if (!vscodeApi) {
    vscodeApi = acquireVsCodeApi();
  }
  return vscodeApi;
}

export function postMessage(msg: WebviewMessage): void {
  getVSCode().postMessage(msg);
}
