import type { Language, PersonaInfo, PersonaKey } from '../../../server/src/contract.ts';

const LABELS: Record<Language, string> = { en: 'EN', ar: 'العربية', hi: 'हिन्दी', ur: 'اردو', tl: 'TL' };

type Props = {
  languages: Language[];
  language: Language;
  onLanguage: (language: Language) => void;
  xrayOpen: boolean;
  onToggleXray: () => void;
  onReset: () => void;
  personas?: PersonaInfo | null;
  onPersona?: (key: PersonaKey) => void;
  personaDisabled?: boolean;
};

export function Header({ languages, language, onLanguage, xrayOpen, onToggleXray, onReset, personas, onPersona, personaDisabled }: Props) {
  return (
    <header className="header">
      <h1>Souq Saver</h1>
      <div className="header-actions">
        {personas?.switchable && personas.personas.length > 0 && (
          <div className="language-switch persona-switch" role="group" aria-label="Demo household">
            <span className="muted small">Household</span>
            {personas.personas.map((p) => (
              <button key={p.key} className={p.key === personas.current ? 'pill active' : 'pill'} aria-pressed={p.key === personas.current}
                disabled={personaDisabled} title={`${p.label}, ${p.area}`} onClick={() => onPersona?.(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
        )}
        <div className="language-switch" role="group" aria-label="Reply language">
          {languages.map((code) => (
            <button key={code} className={code === language ? 'pill active' : 'pill'} aria-pressed={code === language} onClick={() => onLanguage(code)}>
              {LABELS[code]}
            </button>
          ))}
        </div>
        <button className={xrayOpen ? 'pill active' : 'pill'} aria-pressed={xrayOpen} onClick={onToggleXray}>X-ray</button>
        <button className="text-button" onClick={onReset}>Reset</button>
      </div>
    </header>
  );
}
