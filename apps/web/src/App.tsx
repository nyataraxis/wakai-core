import { useEffect, useState } from 'react';
import { FusionPage } from './FusionPage';
import { PuzzlePage } from './PuzzlePage';
import './global.css';

export const App = () => {
  const [route, setRoute] = useState(window.location.hash);
  useEffect(() => {
    const navigate = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  if (route === '#/fusion') {
    return (
      <>
        <a className="back-link" href="#/puzzle">
          ← Hidden kanji
        </a>
        <FusionPage />
      </>
    );
  }
  return <PuzzlePage />;
};
