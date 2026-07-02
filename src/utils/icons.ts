/**
 * Centralized icon registry — single source of truth for all Lucide icons used in the app.
 * Consistent strokeWidth: 1.5 (elegant, thinner than default 2).
 */

import type { Component } from 'vue'
import {
  // Navigation (sidebar)
  LayoutDashboard,
  Coffee,
  Receipt,
  TrendingUp,
  TrendingDown,
  Users,
  User,
  UserCog,
  CreditCard,
  Tag,
  Printer,
  LogOut,
  CircleUser,

  // Actions
  Pencil,
  Trash2,
  Plus,
  Save,
  X,
  Eye,
  EyeOff,
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload,
  Settings,
  Settings2,
  Archive,
  Copy,
  ExternalLink,
  MoreVertical,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,

  // Toggle
  ToggleRight,
  ToggleLeft,

  // Status / Feedback
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  Loader2,
  Star,
  StarOff,

  // Business / Content
  Package,
  DollarSign,
  Banknote,
  Wallet,
  Percent,
  Target,
  BarChart2,
  BarChart3,
  PieChart,
  ShoppingCart,
  Scan,
  Layers,
  Globe,
  Lock,
  Unlock,
  Bell,
  Calendar,
  Clock,
  Image,
  FileText,
  Zap,

  // Extra
  Inbox,
  LayoutGrid,
  Wifi,
  Bluetooth,
  Cable,
} from 'lucide-vue-next'

export const AppIcons = {
  // ── Navigation ──────────────────────────────
  dashboard:        LayoutDashboard,
  menu:             Coffee,
  coffee:           Coffee,
  kasir:            Receipt,
  receipt:          Receipt,
  laporan:          TrendingUp,
  customer:         Users,
  user:             User,
  'user-cog':       UserCog,
  payment:          CreditCard,
  promo:            Tag,
  tag:              Tag,
  printer:          Printer,
  logout:           LogOut,
  profile:          CircleUser,

  // ── Actions ─────────────────────────────────
  edit:             Pencil,
  trash:            Trash2,
  delete:           Trash2,
  add:              Plus,
  plus:             Plus,
  save:             Save,
  x:                X,
  close:            X,
  cancel:           X,
  search:           Search,
  filter:           Filter,
  refresh:          RefreshCw,
  download:         Download,
  upload:           Upload,
  settings:         Settings,
  'settings-2':     Settings2,
  archive:          Archive,
  copy:             Copy,
  'external-link':  ExternalLink,
  'more-vertical':  MoreVertical,
  'more-horizontal':MoreHorizontal,
  'chevron-down':   ChevronDown,
  'chevron-up':     ChevronUp,
  'chevron-left':   ChevronLeft,
  'chevron-right':  ChevronRight,
  'arrow-left':     ArrowLeft,
  'arrow-right':    ArrowRight,
  eye:              Eye,
  'eye-off':        EyeOff,

  // ── Toggle ───────────────────────────────────
  'toggle-on':      ToggleRight,
  'toggle-off':     ToggleLeft,

  // ── Status / Feedback ────────────────────────
  'check-circle':   CheckCircle,
  'x-circle':       XCircle,
  warning:          AlertTriangle,
  info:             AlertCircle,
  'info-outline':   Info,
  check:            Check,
  loading:          Loader2,
  loader:           Loader2,
  star:             Star,
  'star-off':       StarOff,

  // ── Business / Content ───────────────────────
  package:          Package,
  money:            DollarSign,
  banknote:         Banknote,
  wallet:           Wallet,
  percent:          Percent,
  target:           Target,
  'bar-chart':      BarChart2,
  'bar-chart-3':    BarChart3,
  'pie-chart':      PieChart,
  cart:             ShoppingCart,
  scan:             Scan,
  layers:           Layers,
  globe:            Globe,
  lock:             Lock,
  unlock:           Unlock,
  bell:             Bell,
  calendar:         Calendar,
  clock:            Clock,
  image:            Image,
  'file-text':      FileText,
  'trend-up':       TrendingUp,
  'trend-down':     TrendingDown,
  zap:              Zap,
  inbox:            Inbox,
  layout:           LayoutGrid,
  wifi:             Wifi,
  bluetooth:        Bluetooth,
  usb:              Cable,
} as const

export type AppIconName = keyof typeof AppIcons

export const IconConfig = {
  strokeWidth: 1.5,
  size: 18,
  sizeSmall: 16,
  sizeLarge: 22,
} as const

export function getIcon(name: AppIconName): Component {
  return AppIcons[name]
}

// Re-export ActionIcons + ModalIcons aliases for backwards compatibility
export const ActionIcons = {
  edit:           AppIcons.edit,
  delete:         AppIcons.delete,
  view:           AppIcons.eye,
  toggleActive:   AppIcons['toggle-on'],
  toggleInactive: AppIcons['toggle-off'],
  moreActions:    AppIcons['more-vertical'],
  add:            AppIcons.add,
  settings:       AppIcons.settings,
  archive:        AppIcons.archive,
} as const

export const ModalIcons = {
  warning: AppIcons.warning,
  info:    AppIcons['info-outline'],
  success: AppIcons['check-circle'],
  error:   AppIcons['x-circle'],
} as const
