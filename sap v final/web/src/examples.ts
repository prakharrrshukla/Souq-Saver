// Example messages for the demo. Click one in the chat panel to put it in the input.
import type { Language } from '../../server/src/contract.ts';

export const DEFAULT_MESSAGE = 'Same as last week, but cut 15%';

export const EXAMPLES: { label: string; text: string; language?: Language }[] = [
  { label: 'Cut 15%', text: DEFAULT_MESSAGE, language: 'en' },
  { label: 'العربية', text: 'نفس الأسبوع الماضي، لكن خفّض 15%', language: 'ar' },
  { label: 'हिन्दी', text: 'पिछले हफ़्ते जैसा, पर 15% कम कर दो', language: 'hi' },
  { label: 'اردو', text: 'پچھلے ہفتے جیسا، مگر 15٪ کم کر دیں', language: 'ur' },
  { label: 'Tagalog', text: 'Gaya ng nakaraang linggo, pero bawasan ng 15%', language: 'tl' },
  { label: 'Why no chocolate?', text: 'Why did you drop the chocolate?' },
  { label: 'Keep the chips', text: 'Keep the chips.' },
  { label: 'Cheapest store?', text: 'Which store is cheapest?' },
  { label: 'Budget 150', text: 'My budget this week is 150 dirhams' },
];
