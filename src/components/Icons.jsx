// Small inline icon set — no external icon library, keeps the bundle
// lean and every icon themeable via currentColor.
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false' }

export function BrandIcon(props) {
  return (
    <svg {...base} aria-hidden="true" focusable="false" {...props}>
      <path d="M12 3l8 3.5v4c0 4.7-3.2 8.9-8 10-4.8-1.1-8-5.3-8-10v-4L12 3z" />
      <path d="M9 12.2l2 2 4-4.2" />
    </svg>
  )
}

export function CitizenIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.6 3.1-6.4 7-6.4s7 2.8 7 6.4" />
    </svg>
  )
}

export function OfficerIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="8" width="17" height="11" rx="1.5" />
      <path d="M8.5 8V6.5A2.5 2.5 0 0 1 11 4h2a2.5 2.5 0 0 1 2.5 2.5V8" />
      <path d="M3.5 13h17" />
    </svg>
  )
}

export function FileIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3.5h7l4 4V19a1.2 1.2 0 0 1-1.2 1.2H7.2A1.2 1.2 0 0 1 6 19V4.7A1.2 1.2 0 0 1 7 3.5z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 13h6M9 16.3h6" />
    </svg>
  )
}

export function SparkleIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4l1.6 4.6L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.4L12 4z" />
      <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
    </svg>
  )
}

export function BuildingIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V9.5L12 4l8 5.5V20" />
      <path d="M4 20h16" />
      <path d="M9.5 20v-5.5h5V20" />
      <path d="M9.5 10.5h.01M14.5 10.5h.01" />
    </svg>
  )
}

export function CheckCircleIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.3" />
      <path d="M8.7 12.3l2.2 2.2 4.4-4.6" />
    </svg>
  )
}
