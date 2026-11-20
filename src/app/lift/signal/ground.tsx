/**
 * The ground the app stands on: black, with a yellow figure. (The design lab also drew yellow and white grounds;
 * the stylesheet still knows them, behind `data-signal-ground`, and nothing here switches to them.)
 */
type Tone = 'ink' | 'yellow';

/**
 * The figure has two tones and takes the one that stands out from what is behind it.
 * `figure`: on the ground. `disc`: in the 52 px disc. `event`: on the big moments and the sheets, which are yellow with ink.
 */
const TONES: { figure: Tone; disc: Tone; event: Tone } = { figure: 'yellow', disc: 'ink', event: 'ink' };

export const useTones = () => TONES;
