// File Header: Menu section wrapper applying consistent padding and border.
import React from 'react'

type MenuSectionCardProps = {
  children: React.ReactNode
}

const sectionShellClass =
  'flex flex-col gap-4 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-inset ring-slate-200'

// Function Header: Provides a styled container for each header menu subsection.
export default function MenuSectionCard({ children }: MenuSectionCardProps): React.ReactElement {
  return <div className={sectionShellClass}>{children}</div>
}
