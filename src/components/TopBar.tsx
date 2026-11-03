export type DockTab = 'presets' | 'builder' | 'fish' | 'care' | 'ambience';

interface TopBarProps {
  activeTab: DockTab;
  onSelectTab: (tab: DockTab) => void;
  onOpenShare: () => void;
  zenHidden: boolean;
}

const WORKFLOW_NAV_ITEMS: Array<{ id: DockTab; label: string }> = [
  { id: 'presets', label: 'Chọn Layout' },
  { id: 'builder', label: 'Tự Build Bể' },
  { id: 'fish', label: 'Cá & Tép' },
  { id: 'care', label: 'Chăm Sóc' },
  { id: 'ambience', label: 'Đèn & Âm Thanh' },
];

export function TopBar({
  activeTab,
  onSelectTab,
  onOpenShare,
  zenHidden,
}: TopBarProps) {
  return (
    <header
      className={`fixed top-0 inset-x-0 z-20 flex items-center justify-between gap-3 sm:gap-6 px-3.5 sm:px-6 pt-[max(0.65rem,env(safe-area-inset-top))] pb-2.5 sm:py-3.5 bg-gradient-to-b from-[#070d0f]/95 to-transparent transition-opacity duration-200 ${
        zenHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#sanctuary"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('presets');
        }}
        className="font-display text-lg sm:text-xl lg:text-2xl font-semibold tracking-wide text-stone-100 truncate min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
      >
        Hồ Thủy Sinh Chữa Lành
      </a>

      {/* Zone 2: 5 concise single-line workflow links (shown on >=1024px so medium windows never overflow) */}
      <nav
        aria-label="Menu chức năng chính"
        className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-medium shrink-0"
      >
        {WORKFLOW_NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`py-1 whitespace-nowrap shrink-0 border-b transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                isActive
                  ? 'text-teal-300 border-teal-400'
                  : 'text-stone-300 border-transparent hover:text-stone-100 hover:border-stone-500'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenShare}
          className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-stone-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
        >
          Chia sẻ bể
        </button>
      </div>
    </header>
  );
}
