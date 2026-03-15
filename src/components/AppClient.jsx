'use client';

import { useState, useEffect } from 'react';
import ProfileForm from './ProfileForm';
import OnboardingFlow from './OnboardingFlow';
import UserProfile from './UserProfile';
import SettingsPage from './SettingsPage';
import EditProfileModal from './EditProfileModal';
import Encounter from './Encounter';
import Interactions from './Interactions';
import { useVideoSocket } from '@/lib/useVideoSocket';
import VideoChat from './VideoChat';
import { deleteMyAccount, getMe, getToken, logoutSession, removeToken, updateUser } from '@/lib/api';
import { useThemePreference } from '@/lib/useThemePreference';
import { ChatIcon, CompassIcon, MoonIcon, SlidersIcon, SunIcon, UserIcon } from './UiIcons';

const NAV_ITEMS = [
  { id: 'encounter', label: 'Encounter', icon: CompassIcon },
  { id: 'interactions', label: 'Interactions', icon: ChatIcon },
  { id: 'profile', label: 'Profile', icon: UserIcon }
];
const USER_CACHE_KEY = 'current_user';

export default function AppClient() {
  const { isDark, toggleTheme } = useThemePreference();
  const logoSrc = isDark ? '/jellyfish_darkmode.png' : '/jellyfishLogo.png';
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [currentPage, setCurrentPage] = useState('encounter');
  const [profileEntryMode, setProfileEntryMode] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [activeEncounterMatch, setActiveEncounterMatch] = useState(null);
  const [videoActive, setVideoActive] = useState(false);
  const [videoHostMounted, setVideoHostMounted] = useState(false);
  const [videoHostVisible, setVideoHostVisible] = useState(false);
  const [lastPageBeforeCall, setLastPageBeforeCall] = useState('encounter');
  const { socket, connected: socketConnected } = useVideoSocket(Boolean(currentUser?.onboarding_completed));
  const [onlineIds, setOnlineIds] = useState([]);
  const [floatPos, setFloatPos] = useState({ x: 12, y: 12 });
  const [authBootstrapping, setAuthBootstrapping] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const supportMode = searchParams.get('support') === '1';

      if (supportMode) {
        setCurrentPage('profile');
        setProfileEntryMode('support');
      }
      if (path.includes('/interactions')) setCurrentPage('interactions');
      if (path.includes('/support')) {
        setCurrentPage('profile');
        setProfileEntryMode('support');
      }
      if (path.includes('/profile')) setCurrentPage('profile');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return () => {};

    const token = getToken();
    if (!token) {
      window.localStorage.removeItem(USER_CACHE_KEY);
      setAuthReady(true);
      setAuthBootstrapping(false);
      return () => {};
    }

    const cached = window.localStorage.getItem(USER_CACHE_KEY);
    if (cached) {
      try {
        setCurrentUser(JSON.parse(cached));
      } catch {
        window.localStorage.removeItem(USER_CACHE_KEY);
      }
    }

    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        setCurrentUser(me);
        window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(me));
        setAuthReady(true);
        setAuthBootstrapping(false);
      } catch (error) {
        if (cancelled) return;
        if (error?.response?.status === 401) {
          removeToken();
          window.localStorage.removeItem(USER_CACHE_KEY);
          setCurrentUser(null);
        }
        setAuthReady(true);
        setAuthBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!socket) return () => {};
    const handler = (list) => {
      setOnlineIds((Array.isArray(list) ? list : []).map((id) => Number(id)));
    };
    socket.on('presence-update', handler);
    return () => socket.off('presence-update', handler);
  }, [socket]);

  useEffect(() => {
    if (videoActive) {
      setVideoHostMounted(true);
      const rafId = window.requestAnimationFrame(() => {
        setVideoHostVisible(true);
      });
      return () => window.cancelAnimationFrame(rafId);
    }

    setVideoHostVisible(false);
    const timeoutId = window.setTimeout(() => {
      setVideoHostMounted(false);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [videoActive]);

  const handleProfileCreated = (user) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    }
    setCurrentPage(user?.onboarding_completed ? 'encounter' : 'profile');
  };

  const handleOnboardingCompleted = (user) => {
    setCurrentUser((previous) => {
      const next = {
        ...previous,
        ...user,
        onboarding_completed: true,
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(next));
      }
      return next;
    });
    setCurrentPage('encounter');
  };

  const handleSaveProfile = async (updatedData) => {
    const result = await updateUser(updatedData);
    setCurrentUser((previous) => {
      const next = { ...previous, ...(result?.user || updatedData) };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleOpenEditProfile = () => {
    setShowSettings(false);
    setShowEditProfile(true);
  };

  const handleOpenSupport = () => {
    setShowSettings(false);
    setCurrentPage('profile');
    setProfileEntryMode('support');
  };

  const clearClientSession = () => {
    removeToken();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(USER_CACHE_KEY);
    }
    setShowSettings(false);
    setShowEditProfile(false);
    setVideoActive(false);
    setActiveEncounterMatch(null);
    setProfileEntryMode(null);
    setCurrentPage('encounter');
    setCurrentUser(null);
    setAuthReady(true);
  };

  const handleLogout = async () => {
    try {
      await logoutSession();
    } catch (error) {
      console.error('Logout request failed', error);
    } finally {
      clearClientSession();
    }
  };

  const handleDeleteAccount = async (confirmation) => {
    await deleteMyAccount(confirmation);
    clearClientSession();
  };

  const renderNavButtons = () => (
    NAV_ITEMS.map((item) => {
      const Icon = item.icon;

      return (
        <button
          key={item.id}
          className={currentPage === item.id ? 'nav-btn active' : 'nav-btn'}
          onClick={() => {
            setCurrentPage(item.id);
            if (item.id === 'profile') {
              setProfileEntryMode('view');
            }
          }}
          aria-label={item.label}
        >
          <Icon className="nav-icon" />
          <span className="nav-label">{item.label}</span>
        </button>
      );
    })
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <img src={logoSrc} alt="" aria-hidden="true" className="app-brand-mark" />
          <h1>CNXR</h1>
        </div>
        <div className="header-actions">
          {currentUser && currentUser.onboarding_completed && (
            <nav className="nav nav-desktop" aria-label="Desktop navigation">
              {renderNavButtons()}
            </nav>
          )}

          <button
            type="button"
            className="theme-toggle theme-toggle-compact"
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <SunIcon className="button-icon" /> : <MoonIcon className="button-icon" />}
          </button>

          {currentUser && currentUser.onboarding_completed && (
            <button
              className="settings-btn"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <SlidersIcon className="button-icon" />
              <span>Settings</span>
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {!currentUser && authReady && <ProfileForm onProfileCreated={handleProfileCreated} />}
        {!currentUser && !authReady && <div className="loading">Loading...</div>}
        {!authBootstrapping && currentUser && !currentUser.onboarding_completed && (
          <OnboardingFlow
            onCompleted={handleOnboardingCompleted}
            initialUsername={currentUser?.username || currentUser?.name || ''}
          />
        )}
        {!authBootstrapping && currentUser && currentUser.onboarding_completed && currentPage === 'encounter' && !videoActive && (
          <Encounter
            socket={socket}
            socketConnected={socketConnected}
            onEncounterMatch={(payload) => {
              setActiveEncounterMatch(payload);
              setLastPageBeforeCall(currentPage);
              setVideoActive(true);
              if (typeof window !== 'undefined') {
                setFloatPos({
                  x: Math.max(12, window.innerWidth - 360),
                  y: Math.max(12, window.innerHeight - 260),
                });
              }
            }}
          />
        )}

        {!authBootstrapping && currentUser && currentUser.onboarding_completed && currentPage === 'interactions' && (
          <Interactions
            socket={socket}
            socketConnected={socketConnected}
            onlineIds={onlineIds}
          />
        )}

        {currentUser && currentUser.onboarding_completed && currentPage === 'profile' && (
          <UserProfile
            currentUser={currentUser}
            entryMode={profileEntryMode}
            onEntryModeConsumed={() => setProfileEntryMode(null)}
          />
        )}
      </main>

      {currentUser && currentUser.onboarding_completed && (
        <nav className="nav nav-mobile" aria-label="Mobile navigation">
          {renderNavButtons()}
          <button
            type="button"
            className="nav-btn nav-theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <SunIcon className="nav-icon" /> : <MoonIcon className="nav-icon" />}
            <span className="nav-label">Theme</span>
          </button>
        </nav>
      )}

      {showSettings && currentUser?.onboarding_completed && (
        <SettingsPage
          onEditProfile={handleOpenEditProfile}
          onSupport={handleOpenSupport}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showEditProfile && currentUser && currentUser.onboarding_completed && (
        <EditProfileModal
          user={currentUser}
          onClose={() => setShowEditProfile(false)}
          onSave={handleSaveProfile}
        />
      )}

      {currentUser && currentUser.onboarding_completed && videoHostMounted && (
        <div
          className={`video-host ${currentPage !== 'encounter' ? 'floating' : 'full'} ${videoHostVisible ? 'is-visible' : 'is-hidden'}`}
          style={
            currentPage !== 'encounter'
              ? { left: floatPos.x, top: floatPos.y, right: 'auto', bottom: 'auto' }
              : undefined
          }
        >
          <VideoChat
            socket={socket}
            socketConnected={socketConnected}
            encounterMatch={activeEncounterMatch}
            onConsumeEncounterMatch={() => setActiveEncounterMatch(null)}
            onExit={() => {
              setVideoActive(false);
              setActiveEncounterMatch(null);
              setCurrentPage(lastPageBeforeCall || 'encounter');
            }}
            layoutMode={currentPage !== 'encounter' ? 'floating' : 'full'}
            floatingPos={floatPos}
            onFloatingPosChange={setFloatPos}
            currentUser={currentUser}
          />
        </div>
      )}
    </div>
  );
}
