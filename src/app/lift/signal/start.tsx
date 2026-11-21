'use client';
import { GUARD_MS, type Visit } from '../visit/use-visit';
import type { Setting } from '../visit/visit-data';
import { useArmed } from './hooks';
import { FigureDisc, Markers, Slab, SoundButton, type MarkerState } from './parts';
import { blockWords, firstStartWords, SETTING_CHOICES, SETTING_QUESTION, settingHintWords, settingSwitchWords, SIGN_OUT } from './words';
import s from './signal.module.css';

/** Two equal choices, before the first plan. The normal start has its own guard against a second tap. */
export function SettingChoice({ onSetting }: { onSetting: (setting: Setting) => void }) {
  const armed = useArmed(GUARD_MS);
  return (
    <div className={s.screen} data-screen="setting">
      <h1 className={s.big}>{SETTING_QUESTION}</h1>
      <div className={s.settingChoices}>
        {SETTING_CHOICES.map(choice => (
          <Slab key={choice.setting} className={s.settingChoice} onClick={() => { if (armed) onSetting(choice.setting); }}>
            <span>{choice.name}</span>
            <span className={s.settingDescription}>{choice.line}</span>
          </Slab>
        ))}
      </div>
    </div>
  );
}

/**
 * The start: what today is, in a few rows, and one place to press. One small word swaps the gym for the home
 * workout, and the phone remembers it. A first visit says so, with one sentence in place of the numbers.
 */
export function Start({ visit, setting, settingHint, onSetting, onSignOut }: { visit: Visit; setting: Setting; settingHint: boolean; onSetting: (setting: Setting) => void; onSignOut: (from: HTMLElement) => void }) {
  // Start sits where the finish's Done was: the second tap of a double tap there must not start a new visit.
  const armed = useArmed(GUARD_MS);
  const { plan } = visit;
  const home = setting === 'home';
  const first = plan.first !== null;
  const week: MarkerState[] = Array.from({ length: plan.week.of }, (_, index) => (
    index + 1 < plan.week.visit ? 'logged' : index + 1 === plan.week.visit ? 'current' : 'ahead'
  ));

  return (
    <div className={s.screen} data-screen="start" data-plan={plan.template}>
      <div className={s.startControls}>
        <button type="button" className={`${s.word} ${s.accountWord}`} onClick={event => { if (armed) onSignOut(event.currentTarget); }}>{SIGN_OUT.action}</button>
        <SoundButton />
      </div>
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
        {settingSwitchWords(setting)}
      </button>
      {settingHint && <p className={s.fact}>{settingHintWords(setting)}</p>}

      <div className={s.spacer} />
      <div className={s.slot}>
        <Slab onClick={() => { if (armed) visit.start(); }}>Start</Slab>
      </div>
    </div>
  );
}
