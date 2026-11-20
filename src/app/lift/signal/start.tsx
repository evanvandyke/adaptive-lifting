'use client';
import { useSoundPreference } from '../visit/feedback';
import { GUARD_MS, type Visit } from '../visit/use-visit';
import type { Setting } from '../visit/visit-data';
import { useArmed } from './hooks';
import { FigureDisc, Markers, Slab, type MarkerState } from './parts';
import { blockWords, firstStartWords } from './words';
import s from './signal.module.css';

/**
 * The start: what today is, in a few rows, and one place to press. One small word swaps the gym for the home
 * workout, and the phone remembers it. A first visit says so, with one sentence in place of the numbers.
 */
export function Start({ visit, setting, onSetting, onSignOut }: { visit: Visit; setting: Setting; onSetting: (setting: Setting) => void; onSignOut: () => void }) {
  // Start sits where the finish's Done was: the second tap of a double tap there must not start a new visit.
  const armed = useArmed(GUARD_MS);
  const [soundOn, setSoundOn] = useSoundPreference();
  const { plan } = visit;
  const home = setting === 'home';
  const first = plan.first !== null;
  const week: MarkerState[] = Array.from({ length: plan.week.of }, (_, index) => (
    index + 1 < plan.week.visit ? 'logged' : index + 1 === plan.week.visit ? 'current' : 'ahead'
  ));

  return (
    <div className={s.screen} data-screen="start" data-plan={plan.template}>
      <h1 className={s.big}>{plan.name}</h1>
      {first
        ? firstStartWords(plan).map(sentence => <p key={sentence} className={s.fact}>{sentence}</p>)
        : <p className={s.fact}>About {plan.minutes} minutes, {plan.totalSets} sets</p>}

      <ol className={s.blocks}>
        {plan.blocks.map(block => {
          const words = blockWords(block, plan);
          return (
            <li key={block.index} className={s.block}>
              <FigureDisc move={block.exerciseIds[0]} />
              <p><span className={s.blockName}>{words.name}</span>{words.line && <span className={s.blockLine}>{words.line}</span>}</p>
            </li>
          );
        })}
      </ol>
      {plan.note && <p className={s.planNote}>{plan.note}</p>}

      <p className={s.sets}>
        <Markers states={week} />
        <span>Visit {plan.week.visit} of {plan.week.of} this week</span>
      </p>
      <button type="button" className={`${s.word} ${s.planWord}`} onClick={() => { if (armed) onSetting(home ? 'gym' : 'home'); }}>
        {home ? 'Do the gym workout' : 'Do the home workout'}
      </button>

      <div className={s.spacer} />
      <div className={s.slot}>
        <Slab onClick={() => { if (armed) visit.start(); }}>Start</Slab>
      </div>
      <div className={s.foot}>
        <button type="button" className={s.word} onClick={() => { if (armed) onSignOut(); }}>Sign out</button>
        <button type="button" className={`${s.word} ${s.wordRight}`} aria-pressed={soundOn} aria-label="Sound" onClick={() => setSoundOn(!soundOn)}>
          {soundOn ? 'Sound on' : 'Sound off'}
        </button>
      </div>
    </div>
  );
}
