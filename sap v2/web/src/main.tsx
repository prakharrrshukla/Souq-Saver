import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Desk from './Desk';
import Phones from './phones/Phones';
import './styles.css';
import './phones/phones.css';

// The phones are the app. The earlier one-page dashboard is still there at /#desk.
const App = location.hash === '#desk' ? Desk : Phones;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
