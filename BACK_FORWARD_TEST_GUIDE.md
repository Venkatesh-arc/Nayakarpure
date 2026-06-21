# Back/Forward Button Testing Guide

## What You Need to Test

### Scenario: Back Button Working, Forward Button Showing Login

**The Problem**: Forward button shows login page again instead of requiring re-login.

---

## Testing Steps

### Step 1: Setup - Login and Navigate
1. Open browser DevTools (F12) → Console tab (keep it open)
2. Go to your app: `http://localhost:5173`
3. Login with test account
4. Navigate to `/orders` page or any protected page
5. You should see console logs: `[AuthContext] Auth refreshed successfully`

### Step 2: Test Back Button
1. Click browser **BACK** button
2. Watch console for:
   - `[AuthContext] popstate event fired`
   - `[AuthContext] Refreshing auth state from /auth/me...`
   - `[AuthContext] Auth refreshed successfully` OR `Auth refresh failed (user logged out)`
3. If you see login page: **✓ Back button is working**

### Step 3: Test Forward Button
1. From login page, click browser **FORWARD** button
2. Watch console for:
   - `[AuthContext] popstate event fired` ← THIS IS KEY
   - `[AuthContext] Refreshing auth state`
3. Expected: Should see same logs as back button
4. Expected: Should redirect to login (since session expired)

---

## What Should Happen

### Correct Behavior:
```
Back button → popstate fires → /auth/me called → 401 returned → redirects to login ✓
Forward button → popstate fires → /auth/me called → 401 returned → redirects to login ✓
```

### If Forward is Broken:
```
Back button → popstate fires → redirects ✓
Forward button → NO popstate fired? OR /auth/me not called? → shows cached login page ✗
```

---

## Console Output to Look For

### When You Click Back:
```
[AuthContext] popstate event fired (back/forward button clicked)
[AuthContext] Refreshing auth state from /auth/me...
[AuthContext] Auth refresh failed (user logged out): Authentication required
```

### When You Click Forward:
Should see IDENTICAL output. If you don't see "popstate event fired", then forward isn't triggering it.

---

## Diagnosis

### If Both Work:
✓ Session security is working correctly

### If Forward Shows Login Without Popstate Log:
Problem: Forward button not firing `popstate` event  
Solution: Browser caching issue - need to add more cache headers

### If Forward Shows Login WITH Popstate Log But Wrong Page:
Problem: React Router not properly handling the navigation  
Solution: May need to update how React Router processes redirects

---

## How to Check Right Now

**In your browser console, type:**
```javascript
window.addEventListener('popstate', () => {
  console.log('🔵 POPSTATE FIRED - Back or Forward button clicked');
});
```

Then:
1. Navigate a few pages
2. Click BACK - should see "🔵 POPSTATE FIRED"
3. Click FORWARD - should see "🔵 POPSTATE FIRED"

If FORWARD doesn't trigger it, that's the issue!
