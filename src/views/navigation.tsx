import { NavLink, Route, Routes } from "react-router-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { House, UtensilsCrossed, Users, Settings as SettingsIcon } from "lucide-react";
import { Home as HomeComponent } from "./homescreen";
import { Swipe } from "./swipescreen";
import { Friends } from "./friendsscreen";
import { Settings } from "./settings";
import { ProfileSettings } from "./settings/profile";
import { ManageGroups } from "./settings/manageGroups";
import { GroupDetail } from "./settings/groupDetail";
import { Privacy } from "./settings/privacy";
import { About } from "./settings/about";

function Navbar() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeComponent />} />
        <Route path="/swipe" element={<Swipe />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/profile" element={<ProfileSettings />} />
        <Route path="/settings/groups" element={<ManageGroups />} />
        <Route path="/settings/groups/:id" element={<GroupDetail />} />
        <Route path="/settings/privacy" element={<Privacy />} />
        <Route path="/settings/about" element={<About />} />
      </Routes>

      <nav className="navbar-container">
        <div className="navbar-links">
          <NavLink
            to="/"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <House size={22} className="nav-icon" />
            <span className="nav-label">Home</span>
          </NavLink>
          <NavLink
            to="/swipe"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <UtensilsCrossed size={22} className="nav-icon" />
            <span className="nav-label">Swipe</span>
          </NavLink>
          <NavLink
            to="/friends"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Users size={22} className="nav-icon" />
            <span className="nav-label">Freunde</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <SettingsIcon size={22} className="nav-icon" />
            <span className="nav-label">Einstellungen</span>
          </NavLink>
        </div>
      </nav>
    </Router>
  );
}

export default Navbar;