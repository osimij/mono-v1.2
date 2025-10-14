# Color System Documentation

## Overview
This document describes the professional, consistent color system implemented across the Mono-AI application for both light and dark modes.

## Design Philosophy
The color system follows a minimalist, professional approach inspired by modern design systems:
- **Light Mode**: Clean whites and subtle greys (#FFFFFF, #F5F5F7)
- **Dark Mode**: Pure black sidebar with dark grey content areas
- **Consistency**: 3-5 colors per mode with clear visual hierarchy
- **System Theme**: Automatically adapts to user's system preference

## Color Palette

### Light Mode
```css
Background:        #FFFFFF  (Pure white)
Surface Muted:     #F5F5F7  (Apple-style light grey)
Surface Subtle:    #F0F0F2  (Hover state)
Surface Elevated:  #FAFAFA  (Cards)
Border Subtle:     #E5E5E7  (Light borders)
Border Strong:     #CCCCCC  (Emphasized borders)

Text Primary:      #1A1A1A  (Near black)
Text Soft:         #4D4D4D  (Dark grey)
Text Muted:        #737373  (Medium grey)
Text Subtle:       #999999  (Light grey)
```

### Dark Mode
```css
Sidebar:           #000000  (Pure black)
Surface:           #0D0D0D  (Very dark grey - main content)
Surface Muted:     #1A1A1A  (Cards)
Surface Subtle:    #242424  (Elevated elements)
Surface Elevated:  #292929  (Highest elevation)
Border Subtle:     #2D2D2D  (Subtle borders)
Border Strong:     #404040  (Emphasized borders)

Text Primary:      #FFFFFF  (Pure white)
Text Soft:         #E6E6E6  (Light grey)
Text Muted:        #B3B3B3  (Medium grey)
Text Subtle:       #808080  (Darker grey)
```

## CSS Variables

All colors are defined as CSS variables in `client/src/index.css`:

### Usage
```tsx
// Use Tailwind classes that reference CSS variables
className="bg-surface text-foreground"
className="bg-surface-muted hover:bg-surface-elevated"
className="border-border text-text-muted"
className="hover:bg-sidebar-accent" // For sidebar items
```

### Available Variables
- `--background` / `bg-background`: Main page background
- `--surface` / `bg-surface`: Content background
- `--surface-muted` / `bg-surface-muted`: Muted background (cards, sections)
- `--surface-subtle` / `bg-surface-subtle`: Subtle backgrounds (hover states)
- `--surface-elevated` / `bg-surface-elevated`: Elevated elements
- `--foreground` / `text-foreground`: Primary text
- `--text-soft` / `text-text-soft`: Soft text
- `--text-muted` / `text-text-muted`: Muted text
- `--text-subtle` / `text-text-subtle`: Subtle text
- `--border` / `border-border`: Default borders
- `--border-strong` / `border-border-strong`: Emphasized borders

### Sidebar-Specific Variables
- `--sidebar-background` / `bg-sidebar-background`: Sidebar background (white in light, black in dark)
- `--sidebar-accent` / `bg-sidebar-accent`: Hover/active state for sidebar items
- `--sidebar-foreground` / `text-sidebar-foreground`: Sidebar text color

## Implementation Details

### Theme Provider
The app uses a theme provider that:
1. Detects system theme preference automatically
2. Stores user's explicit choice in localStorage
3. Updates DOM class (`dark` / `light`) on `<html>` element
4. Listens for system theme changes in real-time

### Hover States
All interactive elements have consistent hover states:
- **Light Mode**: Background changes from #F5F5F7 → #F0F0F2
- **Dark Mode**: Background changes from #1A1A1A → #242424
- Sidebar items use `bg-sidebar-accent` for hover/active states

### Visual Hierarchy
The color system creates clear visual hierarchy:
1. **Background** (lightest/darkest): Main page background
2. **Surface Muted** (slightly different): Cards and sections
3. **Surface Elevated** (most prominent): Floating elements, dropdowns
4. **Borders** (subtle): Separates elements without being obtrusive

## Migration Guide

### From Hardcoded Colors
Replace hardcoded colors with CSS variables:

```tsx
// ❌ Before
className="bg-[#F5F5F7] text-[#1A1A1A]"
className="dark:bg-[#171717] dark:text-white"

// ✅ After
className="bg-surface-muted text-foreground"
```

### Sidebar Items
```tsx
// ❌ Before
className="hover:bg-[#1d1d1f]"

// ✅ After
className="hover:bg-sidebar-accent"
```

### Text Colors
```tsx
// ❌ Before
className="text-gray-600 dark:text-gray-400"

// ✅ After
className="text-text-muted"
```

## Best Practices

1. **Always use CSS variables** instead of hardcoded colors
2. **Test both themes** when adding new components
3. **Use semantic color names** (surface, foreground, muted) instead of color values
4. **Maintain visual hierarchy** by using the correct surface level
5. **Keep hover states consistent** across the app
6. **Avoid mixing approaches** - don't use both hardcoded colors and CSS variables in the same component

## Accessibility

The color system maintains:
- **WCAG AA contrast ratios** for all text
- **Clear focus indicators** using the primary color
- **Consistent state changes** for interactive elements
- **System theme respect** for users with dark mode preferences

## Future Improvements

Potential enhancements to consider:
1. Add theme toggle UI in settings page
2. Create custom color themes for different workspaces
3. Add high contrast mode for accessibility
4. Implement color-blind friendly palette options

