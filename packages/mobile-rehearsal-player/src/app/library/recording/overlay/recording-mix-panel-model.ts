import { formatLevelDb } from './recording-level-model';
import { formatNudge } from './recording-sync-model';

/**
 * The collapsible `Balance and sync` row of the playback sheet
 * (rehearsal-recording tasks 14.16 and 14.18): one line while closed, with a
 * summary of where balance, level and sync stand.
 */

export const MIX_PANEL_TITLE = 'Balance and sync';
export const MIX_PANEL_STORAGE_KEY = 'choirlms.recording.mixPanelOpen';
export const MIX_PANEL_CLOSED_VALUE = 'closed';
export const MIX_PANEL_OPEN_VALUE = 'open';
const BALANCE_CENTRE = 50;
const BALANCE_MAX = 100;
const SUMMARY_SEPARATOR = ' · ';

const describeBalanceShort = (balance: number): string => {
  if (balance <= 0) {
    return 'Track only';
  }

  if (balance >= BALANCE_MAX) {
    return 'Recording only';
  }

  return balance === BALANCE_CENTRE ? 'Even' : `${balance} / ${BALANCE_MAX}`;
};

/** `Even · +4.5 dB · +12 ms`: shown while the row is closed. */
export const getMixSummary = (live: {
  balance: number;
  levelDb: number;
  nudgeMs: number;
}): string =>
  [
    describeBalanceShort(Math.round(live.balance)),
    formatLevelDb(live.levelDb),
    formatNudge(live.nudgeMs),
  ].join(SUMMARY_SEPARATOR);

/** What was remembered: open unless it was last closed, so the first time shows the controls. */
export const parseMixPanelOpen = (raw: string | null): boolean =>
  raw !== MIX_PANEL_CLOSED_VALUE;

export const serializeMixPanelOpen = (isOpen: boolean): string =>
  isOpen ? MIX_PANEL_OPEN_VALUE : MIX_PANEL_CLOSED_VALUE;
