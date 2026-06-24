import React, { useEffect } from 'react';
import './App.css';
import Navbar from "./views/navigation";
import { useData } from "./context/DataContext";

function App() {
  const { settings } = useData();

  // Apply the persisted theme immediately, then reconcile with the server setting
  useEffect(() => {
    const theme = settings.dark_mode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('eater-theme', theme);
  }, [settings.dark_mode]);

  return (
    <div className="App">
      <Navbar />
    </div>
  );
}

export default App;