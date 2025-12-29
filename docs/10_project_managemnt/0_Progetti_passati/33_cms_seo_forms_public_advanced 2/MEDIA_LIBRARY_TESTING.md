# Media Library - Quick Testing Guide

## Prerequisites
- ✅ Backend server running on port 4001
- ✅ Frontend dev server running on port 5173
- ✅ Logged in with user that has CMS permissions

## Test Scenarios

### 1. Access Media Library
**Steps**:
1. Navigate to `http://localhost:5173/settings`
2. Look for "Media Library" tab in the navigation
3. Click on "Media Library" tab

**Expected Result**:
- Tab appears in navigation (if you have `VIEW_CMS_MEDIA` or `UPLOAD_CMS_MEDIA` permission)
- URL changes to `/settings/media-library`
- Media Library interface loads with:
  - Sidebar with folders
  - Header with search and view toggle
  - Upload area with drag & drop zone
  - Empty state message if no media exists

**Troubleshooting**:
- If tab doesn't appear: Check user permissions in database
- If 404 error: Verify Settings.tsx imports MediaLibrary correctly
- If blank page: Check browser console for errors

---

### 2. Upload Single File
**Steps**:
1. Click "Seleziona File" button in upload area
2. Select an image file (JPG, PNG, WebP, GIF)
3. Wait for upload to complete

**Expected Result**:
- File picker dialog opens
- After selection, upload progress indicator appears
- Success toast notification: "Media caricati con successo"
- Image appears in grid view with thumbnail
- File details are correct (name, size, type)

**Troubleshooting**:
- If upload fails: Check backend logs for errors
- If 413 error: File too large (max 10MB)
- If no thumbnail: Check Sharp.js is installed in backend

---

### 3. Upload Multiple Files (Drag & Drop)
**Steps**:
1. Open file explorer
2. Select multiple image files (2-5 files)
3. Drag files over the upload area
4. Drop files when area highlights

**Expected Result**:
- Upload area highlights in blue when dragging over
- All files upload simultaneously
- Success toast shows number of files uploaded
- All images appear in grid

**Troubleshooting**:
- If drag doesn't work: Check browser supports drag & drop
- If some files fail: Check file types and sizes
- If partial upload: Check backend concurrent upload handling

---

### 4. Create Folder
**Steps**:
1. Click "Nuova Cartella" button in sidebar
2. Enter folder name (e.g., "Test Folder")
3. Click "Crea" button

**Expected Result**:
- Dialog opens with input field
- After creation, dialog closes
- Success toast: "Cartella creata con successo"
- Folder appears in sidebar with count (0)

**Troubleshooting**:
- If button doesn't appear: Check `MANAGE_CMS_FOLDERS` permission
- If creation fails: Check backend folder creation logic
- If no refresh: React Query cache might need invalidation

---

### 5. Navigate Folders
**Steps**:
1. Create a folder (if not exists)
2. Click folder name in sidebar
3. Upload a file to that folder
4. Click "Tutte le cartelle" to go back

**Expected Result**:
- Clicking folder filters media to that folder
- Upload area shows "Cartella: [folder name]"
- Media grid shows only files in that folder
- Folder count increments after upload

**Troubleshooting**:
- If filter doesn't work: Check `folderId` query parameter
- If upload to wrong folder: Check state management in component

---

### 6. Search Media
**Steps**:
1. Upload several files with different names
2. Type search query in search box (e.g., "test")
3. Wait 300ms for debounce

**Expected Result**:
- Grid updates to show only matching files
- Search is case-insensitive
- Empty state appears if no matches
- Clearing search shows all files again

**Troubleshooting**:
- If search doesn't work: Check backend search implementation
- If too slow: Check database indexes on filename/originalName

---

### 7. View Grid vs List
**Steps**:
1. Upload several media files
2. Click grid icon (should be active by default)
3. Click list icon to switch view

**Expected Result**:
- Grid view: Responsive grid (2/4/6 columns)
- List view: Single column with file details
- Active button has primary color
- View preference persists during session

**Troubleshooting**:
- If icons don't work: Check Button component variant types
- If layout breaks: Check CSS grid classes

---

### 8. View Media Detail
**Steps**:
1. Click on any media thumbnail in grid
2. Modal should open with details

**Expected Result**:
- Large preview of image
- File information (size, dimensions, format)
- Editable fields: title, alt, description
- Tags display (if any)
- URL copy button
- Delete button

**Troubleshooting**:
- If modal doesn't open: Check Dialog component
- If image doesn't load: Check URL construction
- If edit doesn't work: Check `EDIT_CMS_MEDIA` permission

---

### 9. Edit Metadata
**Steps**:
1. Open media detail modal
2. Click "Modifica" button
3. Change title, alt text, or description
4. Click "Salva"

**Expected Result**:
- Fields become editable
- Save button appears
- After save:
  - Success toast
  - Modal closes (or stays with updated data)
  - Changes reflect immediately (optimistic update)

**Troubleshooting**:
- If save doesn't work: Check backend PATCH endpoint
- If changes don't persist: Check React Query mutation
- If permission error: Verify `EDIT_CMS_MEDIA` permission

---

### 10. Delete Media
**Steps**:
1. Open media detail modal (or hover over grid item)
2. Click delete icon/button
3. Confirm deletion in dialog

**Expected Result**:
- Confirmation dialog appears with warning
- After confirmation:
  - Success toast
  - Media removed from grid
  - Folder count decrements
  - Soft delete (file remains in uploads/)

**Troubleshooting**:
- If delete fails: Check `DELETE_CMS_MEDIA` permission
- If file still visible: Check cache invalidation
- If hard deleted: Verify backend soft delete logic

---

### 11. Delete Folder
**Steps**:
1. Create empty folder
2. Hover over folder in sidebar
3. Click delete icon
4. Confirm deletion

**Expected Result**:
- Delete icon appears on hover
- Confirmation dialog appears
- Cannot delete folder with files (validation)
- After deletion, folder removed from sidebar

**Troubleshooting**:
- If can't delete with files: Working as intended
- If delete fails: Check `MANAGE_CMS_FOLDERS` permission
- If sidebar doesn't update: Check React Query invalidation

---

### 12. Pagination
**Steps**:
1. Upload more than 24 media files
2. Check pagination controls at bottom

**Expected Result**:
- "Precedente" and "Successiva" buttons appear
- Page counter shows current/total pages
- Previous disabled on first page
- Next disabled on last page
- Clicking navigates between pages

**Troubleshooting**:
- If pagination doesn't appear: Need >24 files
- If navigation fails: Check page state management
- If count wrong: Check backend total count logic

---

### 13. Responsive Design
**Steps**:
1. Open browser dev tools
2. Test different viewport sizes:
   - Mobile: 375px width
   - Tablet: 768px width
   - Desktop: 1440px width

**Expected Result**:
- Mobile: 2 columns grid, compact sidebar
- Tablet: 4 columns grid
- Desktop: 6 columns grid, full sidebar
- All elements remain accessible
- No horizontal scroll

**Troubleshooting**:
- If layout breaks: Check Tailwind responsive classes
- If sidebar covers content: Check z-index layers

---

### 14. Permission Testing
**Steps**:
1. Test with different user permissions:
   - No CMS permissions: Tab shouldn't appear
   - VIEW_CMS_MEDIA only: Can view, can't upload/edit/delete
   - UPLOAD_CMS_MEDIA: Can upload, can't edit/delete
   - Full permissions: All actions available

**Expected Result**:
- Actions disabled/hidden based on permissions
- Unauthorized actions return 403 from backend
- Clear error messages for permission issues

**Troubleshooting**:
- If wrong permissions: Check hasPermission() calls
- If backend allows: Check RBAC middleware
- If unclear errors: Improve error messages

---

### 15. Multi-tenancy Testing
**Steps**:
1. Login as user from Tenant A
2. Upload media files
3. Login as user from Tenant B
4. Check if Tenant A files are visible

**Expected Result**:
- Each tenant sees only their own media
- Folder structure isolated per tenant
- No cross-tenant access
- Database queries filtered by tenantId

**Troubleshooting**:
- If cross-tenant visible: Check Prisma middleware
- If isolation fails: Check AuthContext tenantId

---

## Performance Testing

### Large File Upload
**Test**: Upload 10MB file (max size)
**Expected**: Completes in <30 seconds on fast connection

### Multiple Concurrent Uploads
**Test**: Drag & drop 10 files simultaneously
**Expected**: All complete within reasonable time, no failures

### Large Library (100+ files)
**Test**: Load library with 100+ media files
**Expected**: Grid loads in <2 seconds, pagination works smoothly

### Search Performance
**Test**: Search in library with 500+ files
**Expected**: Results appear in <500ms

---

## Browser Compatibility

Test on:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (macOS/iOS)
- ⏳ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Known Limitations

1. **File Size**: Max 10MB per file (configurable in backend)
2. **File Types**: Images only (JPG, PNG, WebP, GIF, SVG)
3. **Pagination**: 24 items per page (no infinite scroll yet)
4. **Folders**: Single level only (no nested folders)
5. **Bulk Actions**: No multi-select yet
6. **Video Preview**: Not implemented yet

---

## Quick Commands

### Check Backend Logs
```bash
cd backend
npm run dev:api
# Watch for errors in terminal
```

### Check Database
```bash
cd backend
npx prisma studio
# Open http://localhost:5555
# Check CMSMedia, CMSMediaFolder tables
```

### Check Permissions
```sql
-- In Prisma Studio or psql
SELECT * FROM "Person" WHERE id = 'your-user-id';
-- Check permissions field
```

### Clear React Query Cache
```javascript
// In browser console
queryClient.clear()
window.location.reload()
```

---

## Reporting Issues

When reporting issues, include:
1. **Steps to reproduce**: Exact actions taken
2. **Expected behavior**: What should happen
3. **Actual behavior**: What actually happened
4. **Browser/Environment**: Browser version, OS
5. **Console errors**: Screenshots of console
6. **Network tab**: Failed API requests
7. **User permissions**: Which permissions the test user has

---

## Success Criteria

The Media Library is ready for production when:
- ✅ All 15 test scenarios pass
- ✅ No TypeScript errors
- ✅ No console errors in browser
- ✅ RBAC permissions work correctly
- ✅ Multi-tenancy isolation works
- ✅ Responsive design works on all screen sizes
- ✅ Performance is acceptable (see metrics above)
- ✅ Documentation is complete

---

**Testing Status**: Ready to Begin
**Estimated Time**: 2-3 hours for comprehensive testing
**Priority**: High - Required before production deployment

