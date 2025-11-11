# Phase 4.2a: Remove Duplicate Dependencies

**Date**: November 11, 2025  
**Task**: Remove unused and duplicate dependencies  
**Expected Savings**: ~380 KB

---

## 🗑️ DEPENDENCIES TO REMOVE

### 1. Next.js (~200 KB) - NOT USED
**Package**: `next`  
**Reason**: Project uses React Router, not Next.js  
**Evidence**: 
- Main router in `src/main.tsx` uses `react-router-dom`
- Files in `src/app/courses/` are old, unused Next.js structure
- No `next.config.js` in root
- No Next.js build scripts

**Action**: 
```bash
npm uninstall next
rm -rf src/app/
```

---

### 2. Chart.js + react-chartjs-2 (~100 KB) - DUPLICATE
**Packages**: `chart.js`, `react-chartjs-2`  
**Reason**: Already have `recharts` (better, modern, lazy-loaded)  
**Current Usage**:
- `Dashboard.tsx` (line 10, 20)
- `DashboardCharts.tsx` (line 2)

**Action**: 
1. Migrate Dashboard charts to Recharts
2. `npm uninstall chart.js react-chartjs-2`

**Migration Steps**:
- Replace `Doughnut` → `<PieChart>` (Recharts)
- Replace `Bar` → `<BarChart>` (Recharts)
- Update chart configurations

---

### 3. react-big-calendar (~80 KB) - DUPLICATE
**Package**: `react-big-calendar`  
**Reason**: Already have `@fullcalendar/*` (better, modern)  
**Current Usage**:
- `ScheduleCalendar.tsx` (line 4)

**Action**: 
1. Migrate ScheduleCalendar to FullCalendar
2. `npm uninstall react-big-calendar`

**Migration Steps**:
- Replace `Calendar` → `<FullCalendar>` component
- Update event handlers
- Update styling

---

## 📝 AUDIT CANDIDATES (Investigate Later)

### @mui/material + @mui/icons-material (~300 KB)
**Status**: Keep for now, audit usage later  
**Action**: Search codebase, check if can migrate to Radix UI

### react-select (~60 KB)
**Status**: Keep for now  
**Note**: Already have `@radix-ui/react-select`  
**Action**: Gradually migrate to Radix Select where possible

---

## 🚀 EXECUTION PLAN

### Step 1: Remove Next.js (5 minutes)
```bash
npm uninstall next
rm -rf src/app/
git add -A
git commit -m "remove: Next.js dependency (unused, -200KB)"
```

### Step 2: Migrate Dashboard Charts (30 minutes)
- [ ] Create new Recharts components
- [ ] Replace in Dashboard.tsx
- [ ] Replace in DashboardCharts.tsx
- [ ] Test charts display correctly
- [ ] Remove chart.js dependencies
- [ ] Commit

### Step 3: Migrate ScheduleCalendar (30 minutes)
- [ ] Rewrite using FullCalendar
- [ ] Test calendar functionality
- [ ] Remove react-big-calendar
- [ ] Commit

### Total Time: ~1 hour
### Total Savings: ~380 KB

---

## ✅ VERIFICATION

After each removal:
- [ ] Run `npm install`
- [ ] Run `npm run build`
- [ ] Check bundle size reduction
- [ ] Test affected features
- [ ] Verify no console errors

---

**Status**: 🔄 IN PROGRESS  
**Next**: Execute Step 1 (Remove Next.js)
