import logo from './logo.svg';
import './App.css';
import { UserProvider } from './contexts/UserContext';
import { AlertDialogProvider } from './contexts/AlertDialogContext';
import Home from './components/landing/Home.tsx'
import { NavCanvasControlProvider } from './contexts/NavCanvasControlContext.jsx';
import { ColorModeProvider  } from './contexts/ColorMode.jsx';
import { BrowserRouter } from 'react-router-dom';
import CookieConsentBanner from './components/common/CookieConsentBanner';


function App() {
  return (
    <div className="App">
      <BrowserRouter>
          <UserProvider>
            <AlertDialogProvider>
              <ColorModeProvider>
              <NavCanvasControlProvider>
                  <Home />
                 </NavCanvasControlProvider> 
              </ColorModeProvider>
            </AlertDialogProvider>
          </UserProvider>
      </BrowserRouter>
      <CookieConsentBanner />
    </div>
  );
}

export default App;
