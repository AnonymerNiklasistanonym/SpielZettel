/** Global styles (values come from variables.css) */
export const theme = {
  color: {
    backdrop: {
      default: "var(--color_backdrop)",
    },
    background: {
      default: "var(--color_background)",
    },
    card: {
      default: "var(--color_card)",
    },
    text: {
      default: "var(--color_text)",
      onPrimary: "var(--color_text_on_primary)",
    },
    primary: {
      default: "var(--color_primary)",
      dark: "var(--color_primary_dark)",
    },
    cancel: {
      default: "var(--color_cancel)",
      dark: "var(--color_cancely_dark)",
    },
  },
  font: {
    size: {
      default: "var(--font_size)",
      title: "var(--font_size_title)",
    },
    family: {
      sans: "var(--font_family_sans)",
      mono: "var(--font_family_mono)",
    },
  },
  spacing: {
    default: "var(--spacing)",
    responsive: "var(spacing_responsive)",
  },
  borderRadius: {
    default: "var(--border_radius)",
    responsive: "var(border_radius_responsive)",
  },
  animationTime: {
    default: "var(--animation_time)",
  },
  boxShadow: {
    default: "var(--box_shadow)",
  },
  maxWidth: {
    menu: "var(--max_width_menu)",
  },
} as const;
