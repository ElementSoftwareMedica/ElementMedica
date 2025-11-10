# Technical Changelog

## Rename: scheduled-courses -> schedules

- Frontend constants and legend updated to use `schedules`.
- Replaced occurrences in `src/components/shared/template/constants.ts`, `src/constants/templates.ts`, and `PlaceholdersLegend.tsx`.
- Sidebar now includes `Schedules` menu item linking to `/schedules`.
- Application routes expose `/schedules` and no longer reference `/scheduled-courses`.

### Notes
- Some test report artifacts and historical docs may still mention `/scheduled-courses`; these are legacy references and can be cleaned up as part of test/report maintenance.
- Backend API already standardizes under `/api/v1/schedules`; frontend services (`courses.ts`) align with this.