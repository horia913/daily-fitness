# Storage Bucket Policies - Manual Update Required

**Bucket**: `meal-photos`  
**Action Required**: Update policies in Supabase Dashboard

---

## 📍 Where to Update

1. Go to Supabase Dashboard
2. Navigate to **Storage** → **meal-photos** bucket
3. Click **Policies** tab
4. Delete/Update as specified below

---

## ❌ DELETE These Policies (If They Exist)

**Delete any policies that allow clients to:**
- UPDATE storage objects
- DELETE storage objects

**Policy names to look for and DELETE**:
- `meal_photo_update_own` or similar
- `meal_photo_delete_own` or similar
- Any policy with operation `UPDATE` or `DELETE` that uses `auth.uid() = client_id` logic

---

## ✅ KEEP/CREATE These Policies

### Policy 1: Clients Can Upload (INSERT)

**Name**: `meal_photo_upload_own`  
**Operation**: `INSERT`  
**Target roles**: `authenticated`  
**Policy definition (WITH CHECK)**:
```sql
bucket_id = 'meal-photos' 
AND auth.uid()::text = (storage.foldername(name))[1]
```

---

### Policy 2: Coaches Can View All (SELECT)

**Name**: `meal_photo_select_coach`  
**Operation**: `SELECT`  
**Target roles**: `authenticated`  
**Policy definition (USING)**:
```sql
bucket_id = 'meal-photos'
AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('coach', 'admin', 'super_coach', 'supercoach')
)
```

---

### Policy 3: Coaches Can Delete (Admin Only)

**Name**: `meal_photo_delete_coach`  
**Operation**: `DELETE`  
**Target roles**: `authenticated`  
**Policy definition (USING)**:
```sql
bucket_id = 'meal-photos'
AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('coach', 'admin', 'super_coach', 'supercoach')
)
```

---

## ✅ Expected Final State

After updating, you should have **EXACTLY 3 policies**:

| Policy Name | Operation | Who |
|-------------|-----------|-----|
| `meal_photo_upload_own` | INSERT | Clients (their own folder) |
| `meal_photo_select_coach` | SELECT | Coaches only |
| `meal_photo_delete_coach` | DELETE | Coaches only |

**Clients should have**:
- ✅ INSERT (upload once)
- ❌ SELECT (cannot view back)
- ❌ UPDATE (cannot change)
- ❌ DELETE (cannot remove)

**Coaches should have**:
- ❌ INSERT (only clients upload)
- ✅ SELECT (can view all)
- ❌ UPDATE (not needed)
- ✅ DELETE (admin cleanup only)

---

## 🔍 How to Verify

After updating policies, test in your app:

1. **Client uploads photo** → Should succeed
2. **Client tries to view photo** → Should fail (403 error)
3. **Client tries to upload same meal again** → Should fail (unique constraint in DB)
4. **Coach views client's photos** → Should succeed

---

**Done? ✅ Storage policies are now locked down for accountability.**

