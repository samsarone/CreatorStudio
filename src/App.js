import logo from './logo.svg';
import './App.css';
import { UserProvider } from './contexts/UserContext';
import { AlertDialogProvider } from './contexts/AlertDialogContext';
import Home from './components/landing/Home.tsx'
import { NavCanvasControlProvider } from './contexts/NavCanvasControlContext.js';
import { ColorModeProvider  } from './contexts/ColorMode.js';
import { BrowserRouter } from 'react-router-dom';


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
    </div>
  );
}

export default App;
