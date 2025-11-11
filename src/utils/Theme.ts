// File Header: Theme tokens mapping semantic names to shared utility classes.

// layoutTheme: Provides semantic class references consumed by components.
export const layoutTheme = {
  centeredContainer: 'centered-layout',
  pageShell: 'min-h-screen bg-slate-50 text-slate-900 flex flex-col',
  contentWrapper: 'flex-1 flex flex-col overflow-hidden',
  card: 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm',
  ribbonShell: 'rounded-2xl border border-slate-200 bg-white shadow-sm',
  sectionTitle: 'text-lg font-semibold text-slate-900',
  helperText: 'text-sm text-slate-500',
  tableScroll:
    'flex-1 w-full h-full overflow-auto border-t border-slate-200 bg-white shadow-sm',
} as const
