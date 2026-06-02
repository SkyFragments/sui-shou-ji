# Codebase Concerns

**Analysis Date:** 2026-05-11

## Tech Debt

### Sync Reliability Issues

**Pending Sync Queue Never Processes:**
- Issue: syncPendingData() in store/sync.js:182-196 iterates but performs no actual operations
- Impact: Offline data never syncs when connectivity returns
- Fix approach: Implement actual sync logic for pending items

**Cloud Sync Uses Wrong Collection:**
- Issue: store/sync.js:88-92 pushes to ssj_sync but cloud function queries separate collections
- Impact: Data never picked up by sync-data cloud function

### Data Consistency Challenges

**No Conflict Resolution:**
- Issue: store/sync.js:150-163 mergeFromCloud() overwrites local data entirely
- Impact: Last-write-wins may cause data loss if local changes exist
- Fix approach: Implement timestamp-based or version-based conflict resolution

**Storage Key Duplication:**
- Issue: Storage keys defined in multiple places inconsistently
- Files: store/bill.js:10, store/category.js:14, store/account.js:11, store/budget.js:11, utils/schema.js:57-63

### Error Handling Gaps

**JSON Parse Errors Silently Caught:**
- Issue: utils/storage.js:12-18 catches JSON parse errors but only logs to console
- Impact: Corrupted storage data returns null without user notification

**No Validation on Data Load:**
- Issue: Stores load data via getStorage() but never validate schema
- Impact: Missing fields cause undefined behavior

### Performance Considerations

**LocalStorage Synchronous API:**
- Issue: All storage uses blocking uni.getStorageSync() and uni.setStorageSync()
- Impact: Large writes block UI thread, memory grows with all records

**No Pagination:**
- Issue: store/bill.js loads entire records array, getRecords() returns full dataset
- Impact: Memory footprint grows unbounded

### Security Considerations

**Mock Login Accepts Any Code:**
- Issue: utils/auth.js:44-58 mockLogin() generates openid from any code substring
- Impact: In dev without cloud, anyone can impersonate any user

**Openid Stored in Plain Text:**
- Issue: User openid stored via uni.setStorageSync() without encryption
- Impact: WeChat openid is sensitive identity data stored in plain text

### Missing Validation

**No Amount Edge Case Check:**
- Issue: pages/add/add.vue:272-276 validates amount > 0 but not negative sign or scientific notation
- Impact: -50 or 1e5 may pass validation but produce unexpected results

**No Budget Negative Check:**
- Issue: store/budget.js:73-81 setBudget() accepts negative amounts
- Impact: usageRatio getter produces inverted results

### Edge Cases Not Handled

**ID Generation Collision:**
- Issue: utils/db.js:240-242 and store/bill.js:68 use Date.now().toString(36) - collisions possible
- Impact: Duplicate IDs cause record overwrites

**Division by Zero:**
- Issue: store/budget.js:45-46 usageRatio check comes after accessing denominator

### LocalStorage Limitations

**No Storage Size Monitoring:**
- Issue: No quota checks (~10MB limit in WeChat mini program)
- Impact: App crashes without warning when storage limit reached

**Storage Keys Not Normalized:**
- Issue: CLAUDE.md specifies plural form but legacy code may differ
- Impact: Data not found if key mismatches

### Known Bugs

**Store Module Syntax Error:**
- Issue: store/bill.js:159-189 - async methods outside store definition
- Impact: Unreachable code - syntax error

**Category Store Same Pattern:**
- Issue: store/category.js:146-164 - syncToCloud() outside store definition
- Impact: Same unreachable code issue

**WebView Export May Not Exist:**
- Issue: utils/export.js:84-86 references /pages/webview/webview which may not exist
- Impact: Export fails silently

---

*Concerns audit: 2026-05-11*