import type { Locator, Page } from 'playwright';

// Chromium can emulate the insets an iPhone turned sideways has (the Dynamic
// Island on one side, the home indicator below), so a scenario can check that
// controls stay clear of them. The same inset on both sides makes a check hold
// for either landscape direction.
export const LANDSCAPE = { height: 390, width: 844 };
export const INSETS = { bottom: 21, left: 59, right: 59, top: 0 };
const TOLERANCE_PX = 1;

export const emulateInsets = async (page: Page) => {
  const cdp = await page.context().newCDPSession(page);

  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: INSETS });
};

const SETTLE_POLL_MS = 100;
const SETTLE_ATTEMPTS = 30;

// Sheets and viewers slide or fade in; measuring mid-animation gives a
// position the user never sees, so wait until two reads agree.
const settledBox = async (target: Locator) => {
  let previous = await target.boundingBox();

  for (let attempt = 0; attempt < SETTLE_ATTEMPTS; attempt += 1) {
    await target.page().waitForTimeout(SETTLE_POLL_MS);
    const current = await target.boundingBox();

    if (
      previous &&
      current &&
      previous.x === current.x &&
      previous.y === current.y
    ) {
      return current;
    }

    previous = current;
  }

  return previous;
};

/** Fails when any part of the element reaches into a side or bottom inset. */
export const expectClear = async (target: Locator, name: string) => {
  const box = await settledBox(target);

  if (!box) {
    throw new Error(`${name} is not on screen`);
  }

  const leftEdge = INSETS.left - TOLERANCE_PX;
  const rightEdge = LANDSCAPE.width - INSETS.right + TOLERANCE_PX;
  const bottomEdge = LANDSCAPE.height - INSETS.bottom + TOLERANCE_PX;

  if (
    box.x < leftEdge ||
    box.x + box.width > rightEdge ||
    box.y + box.height > bottomEdge
  ) {
    throw new Error(
      `${name} (x ${Math.round(box.x)}..${Math.round(box.x + box.width)}, bottom ${Math.round(box.y + box.height)}) reaches into the safe-area insets (clear: x ${INSETS.left}..${LANDSCAPE.width - INSETS.right}, bottom ${LANDSCAPE.height - INSETS.bottom})`,
    );
  }
};
