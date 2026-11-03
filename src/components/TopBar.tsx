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
  { id: 'fish', label: 'Chọn Cá' },
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
      className={`fixed top-0 inset-x-0 z-20 flex items-center justify-between gap-8 px-6 py-3.5 bg-gradient-to-b from-[#070d0f]/95 to-transparent transition-opacity duration-200 ${
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
        className="font-display text-xl sm:text-2xl font-semibold tracking-wide text-stone-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
      >
        Hồ Thủy Sinh Chữa Lành
      </a>

      {/* Zone 2: 5 concise single-line workflow links */}
      <nav aria-label="Menu chức năng chính" className="hidden md:flex items-center gap-6 text-sm font-medium">
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
          className="px-4 py-2 text-xs sm:text-sm font-medium text-stone-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
        >
          Chia sẻ bể
        </button>
      </div>
    </header>
  );
}
