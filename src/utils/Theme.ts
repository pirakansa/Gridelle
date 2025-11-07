// File Header: Theme tokens mapping semantic names to shared utility classes.

// layoutTheme: Provides semantic class references consumed by components.
export const layoutTheme = {
  centeredContainer: 'centered-layout',
  pageShell: 'min-h-screen bg-slate-50 text-slate-900',
  contentWrapper: 'mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 md:p-10',
  card: 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm',
  sectionTitle: 'text-lg font-semibold text-slate-900',
  helperText: 'text-sm text-slate-500',
  tableScroll: 'overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm',
} as const
