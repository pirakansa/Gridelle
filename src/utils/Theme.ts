// File Header: Theme tokens mapping semantic names to shared utility classes.

// layoutTheme: Provides semantic class references consumed by components.
export const layoutTheme = {
  centeredContainer: 'centered-layout',
  pageShell: 'min-h-screen bg-slate-50 text-slate-900 flex flex-col',
  contentWrapper: 'flex-1 flex flex-col gap-4 p-4 md:p-8',
  card: 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm',
  sectionTitle: 'text-lg font-semibold text-slate-900',
  helperText: 'text-sm text-slate-500',
  tableScroll: 'w-full max-h-[78vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm',
} as const
