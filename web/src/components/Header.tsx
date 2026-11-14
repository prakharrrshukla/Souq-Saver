import type { Language } from '../../../server/src/contract.ts';

const LABELS: Record<Language, string> = { en: 'EN', ar: 'العربية', hi: 'हिन्दी', ur: 'اردو', tl: 'TL' };

type Props = {
  languages: Language[];
  language: Language;
  onLanguage: (language: Language) => void;
  xrayOpen: boolean;
  onToggleXray: () => void;
  onReset: () => void;
};

export function Header({ languages, language, onLanguage, xrayOpen, onToggleXray, onReset }: Props) {
  return (
    <header className="header">
      <h1>Souq Saver</h1>
      <div className="header-actions">
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
