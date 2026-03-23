// File Header: Theme tokens mapping semantic names to shared utility classes.

// layoutTheme: Provides semantic class references consumed by components.
export const layoutTheme = {
  centeredContainer: 'centered-layout',
  pageShell: 'h-screen overflow-hidden bg-[#eef2ee] text-slate-900 flex flex-col',
  contentWrapper:
    'flex-1 min-h-0 flex flex-col overflow-hidden border-x border-b border-slate-300 bg-white shadow-inner',
  card: 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm',
  ribbonShell: 'rounded-2xl border border-slate-200 bg-white shadow-sm',
  sectionTitle: 'text-lg font-semibold text-slate-900',
  helperText: 'text-sm text-slate-500',
  tableScroll: 'w-full flex-1 min-h-0 overflow-auto border-t border-slate-300 bg-white',
} as const
