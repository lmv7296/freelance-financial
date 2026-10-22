# Design Guidelines: shadcn/ui with Google Material Design 3 (M3)

Always use **shadcn/ui** components for all UI elements in this project, styled according to **Google Material Design 3** aesthetics:

1. **Component Primitives**: Always import UI components from `@/components/ui/*`. If a component is missing, install it with `npx shadcn@latest add <component>`.
2. **Material 3 Shapes**:
   - Buttons: Always pill-shaped (`rounded-full`) or squircle FABs (`rounded-2xl`).
   - Cards: Always organic rounded shapes (`rounded-2xl` or `rounded-3xl`).
   - Dialogs & Bottom Sheets: Generously rounded (`rounded-3xl`).
   - Badges & Chips: Rounded container pills (`rounded-full` or `rounded-lg`).
3. **M3 Elevation & Surfaces**:
   - Use soft elevation steps (`shadow-none` for flat/outlined, `shadow-sm hover:shadow-md` for elevated cards/buttons).
   - Prefer borderless elevated cards or subtle tonal backgrounds (`bg-muted/50`).
4. **State Layers & Tactile Feedback**:
   - Add tactile press states: `active:scale-[0.98]` and smooth transitions `transition-all duration-200`.
   - Distinct focus rings: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.
