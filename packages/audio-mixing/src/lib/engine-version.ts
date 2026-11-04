/**
 * Version of the shaping and mixing code that produces and renders a
 * recording's mix (rehearsal-recording design Decision 9). Bump it whenever a
 * change would make the same inputs render a different mix, so a stored
 * recording can say its mix was made by other algorithms than the ones in use.
 */
/**
 * 2: the mix render limits the sum (a peak limiter and a ceiling) before it
 * converts to 16-bit, where version 1 clipped hard.
 */
export const MIX_ENGINE_VERSION = 2;
