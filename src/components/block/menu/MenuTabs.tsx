// File Header: Tab selector controlling which ribbon section is visible.
import React from 'react'
import IconButton from '../../atom/IconButton'

export type MenuSectionId = 'sheet' | 'structure' | 'selection' | 'bulk'

type MenuTabsProps = {
  activeSection: MenuSectionId
  onSelectSection: (_section: MenuSectionId) => void
  onToggleCollapse: () => void
  isCollapsed: boolean
}

const menuTabButtonClass =
  'rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-200'
const menuTabActiveClass = 'border-slate-900 bg-slate-900 text-white shadow'
const menuTabInactiveClass =
  'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100 focus:border-slate-300'

// Function Header: Renders the main menu tabs and collapse toggle button.
export default function MenuTabs({
  activeSection,
  onSelectSection,
  onToggleCollapse,
  isCollapsed,
}: MenuTabsProps): React.ReactElement {
  const collapseLabel = isCollapsed ? 'メニューを展開' : 'メニューを折りたたむ'
  const chevronPath = isCollapsed ? 'M7.5 9.75L12 14.25L16.5 9.75' : 'M7.5 14.25L12 9.75L16.5 14.25'

  return (
    <nav aria-label="Gridelleメニュー" className="flex flex-wrap items-center gap-2 md:gap-3">
      <IconButton
        type="button"
        onClick={onToggleCollapse}
        aria-expanded={!isCollapsed}
        aria-label={collapseLabel}
        title={collapseLabel}
        data-testid="menu-collapse-toggle"
      >
        <span className="sr-only">{collapseLabel}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path d={chevronPath} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
          <path d="M8 7H16" stroke="currentColor" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="1.4" />
          <path d="M6 17H18" stroke="currentColor" strokeLinecap="round" strokeOpacity="0.4" strokeWidth="1.2" />
        </svg>
      </IconButton>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'sheet' as const, label: 'シート' },
            { id: 'structure' as const, label: '構造' },
            { id: 'selection' as const, label: '選択' },
            { id: 'bulk' as const, label: '一括入力' },
          ] satisfies Array<{ id: MenuSectionId; label: string }>
        ).map((tab) => {
          const isActive = activeSection === tab.id
          const buttonClass = `${menuTabButtonClass} ${isActive ? menuTabActiveClass : menuTabInactiveClass}`
          return (
            <button
              key={tab.id}
              type="button"
              className={buttonClass}
              onClick={() => onSelectSection(tab.id)}
              aria-pressed={isActive}
              data-testid={`menu-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
