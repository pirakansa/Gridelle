// File Header: Theme tokens mapping semantic names to shared utility classes.

// layoutTheme: Provides semantic class references consumed by components.
export const layoutTheme = {
  centeredContainer: 'centered-layout',
  pageShell: 'min-h-screen bg-slate-50 text-slate-900 flex flex-col',
  contentWrapper: 'flex-1 min-h-0 flex flex-col py-4 md:py-6',
  card: 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm',
  ribbonShell: 'rounded-2xl border border-slate-200 bg-white shadow-sm',
  sectionTitle: 'text-lg font-semibold text-slate-900',
  helperText: 'text-sm text-slate-500',
  tableScroll: 'w-full flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm',
} as const
