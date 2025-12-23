# Mobile App Design System Guide
> Extracted from React Web Frontend for React Native Implementation

## 1. Core Principles
- **Aesthetic**: Modern, clean, energetic, and lightweight.
- **Tone**: Professional yet approachable ("Growth Companion").
- **Visual Style**: Heavy use of rounded corners, soft shadows, glassmorphism (`backdrop-blur`), and vibrant orange gradients.

## 2. Color Palette

### Primary Colors
- **Primary Main**: `#F97316` (Orange-500)
- **Primary Light**: `#FB923C` (Orange-400) - *Used often for buttons and borders*
- **Primary Dark**: `#EA580C` (Orange-600) - *Used for hover states*

### Backgrounds
- **App Background**: `linear-gradient(to bottom, #FFFBEB, #FFFFFF, #FFFBEB)` (Orange-50 to White)
- **Glass Effect**: `rgba(255, 255, 255, 0.8)` with blur (Navbar/Overlays)
- **Cards**: White `#FFFFFF` or Orange Accent `#FB923C`

### Text Colors
- **Headings/Body**: `#1F2937` (Gray-800)
- **Subtext**: `#4B5563` (Gray-600)
- **On Primary**: `#FFFFFF` (White)
- **Link/Brand**: `#F97316` (Orange-500) or `#FB923C` (Orange-400)

## 3. Typography
**Font Family**: `Plus Jakarta Sans` (Google Fonts)

### Weight Scale
- **Regular**: 400 (Body text)
- **Medium**: 500 (Navigation, Sub-labels)
- **SemiBold**: 600 (Buttons, Card Titles)
- **Bold**: 700 (Main Headings)

### Text Styles (Mobile Mapping)
| Web Class | React Native Approx | Usage |
|-----------|--------------------|-------|
| `text-5xl`/`text-7xl` | `fontSize: 32-40` | Hero Headlines |
| `text-2xl` | `fontSize: 24` | Section Titles |
| `text-lg`/`xl` | `fontSize: 18-20` | Card Headings |
| `text-sm`/`base` | `fontSize: 14-16` | Body Text |
| `text-xs` | `fontSize: 12` | Captions, Tags |

## 4. UI Components & Patterns

### Buttons
**Style**: Fully rounded pill shape (`rounded-full`).
- **Primary Button**:
  - Bg: `orange-400`
  - Text: `white`
  - Border: `2px solid orange-400`
  - Shadow: `shadow-md`
- **Secondary Button**:
  - Bg: `white`
  - Text: `orange-400`
  - Border: `2px solid orange-400`
  - Shadow: `shadow-md`

### Cards
**Style**: Rounded corners (`rounded-xl` approx 12-16px).
- **Standard Card**: 
  - Bg: `white`
  - Border: `2px solid rgba(251, 146, 60, 0.2)` (Orange-400 20%)
  - Shadow: `hover:shadow-lg`
- **Feature Card**:
  - Solid Orange Background or White with Orange Border.

### Inputs & Forms
- **Border**: `orange-200` or `orange-400` focus ring.
- **Rounding**: `rounded-lg` or `rounded-xl`.

### Navigation (Mobile)
- **Tab Bar**: Floating style recommended (similar to the floating web navbar).
- **Icons**: Outline style icons (Heroicons style) - 2px stroke.

### Special Effects
- **Text Gradients**: Used on keywords like "Lightweight" (Orange stroke, transparent fill).
- **Background Grid**: Dashed grid pattern (`#e7e5e4`) used on large open spaces.

## 5. Assets
- **Logo**: Text-based "MasterG" or SVG Icon.
- **Illustrations**: Unsplash images with mixed rounded avatars.
