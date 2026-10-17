import React from 'react';

interface TabbarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export const Tabbar: React.FC<TabbarProps> = ({ currentScreen, onNavigate }) => {
  const tabs = [
    { id: 'home', label: 'Início', icon: '/assets/branding/logo/logo-principal.svg' },
    { id: 'library', label: 'Biblioteca', icon: '/assets/branding/icons/biblioteca.svg' },
    { id: 'live', label: 'Live', icon: '/assets/branding/icons/live.svg' },
    { id: 'ensaio', label: 'Ensaio', icon: '/assets/branding/icons/maestro.svg' },
    { id: 'band', label: 'Banda', icon: '/assets/branding/icons/banda.svg' },
    { id: 'comunidade', label: 'Comunidade', icon: '/assets/branding/icons/perfil.svg' },
    { id: 'profile', label: 'Perfil', icon: '/assets/branding/icons/configuracoes.svg' },
  ];

  const getActiveTab = () => {
    if (currentScreen === 'hoje') return 'home';
    if (['songDetail', 'minister'].includes(currentScreen)) return 'library';
    if (['commandCenter', 'checkin', 'missions', 'moment'].includes(currentScreen)) return 'live';
    return currentScreen;
  };

  const activeTab = getActiveTab();

  return (
    <nav className="tabbar">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`tab-btn-${tab.id}`}
            className={isActive ? 'active' : ''}
            onClick={() => onNavigate(tab.id)}
          >
            <div className="tabbar-icon-wrap">
              <img
                src={tab.icon}
                className="virtuo-nav-icon"
                alt=""
                aria-hidden="true"
                style={{ width: '20px', height: '20px' }}
              />
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
