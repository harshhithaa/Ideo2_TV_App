# Android TV Banner Guidelines

## What I Fixed

Your app wasn't showing the Ideogram logo on Android TV because it was missing the required TV configuration:

### Changes Made:
1. ✅ Updated `AndroidManifest.xml` with TV support
2. ✅ Added `android.intent.category.LEANBACK_LAUNCHER` intent filter
3. ✅ Added `android:banner="@drawable/banner"` attribute
4. ✅ Created initial banner image from your logo

## TV Banner Requirements

Android TV requires a **banner image** instead of a regular app icon in the launcher.

### Banner Specifications:
- **Recommended size:** 320 x 180 dp
- **File format:** PNG (with transparency)
- **Location:** `android/app/src/main/res/drawable-xhdpi/banner.png`
- **Design tips:**
  - Use your logo prominently
  - Keep text readable from a distance
  - Avoid small details (TVs are viewed from far away)
  - Use a 16:9 aspect ratio (320x180)

### For Better Quality Across Devices:

Create banners for multiple densities:
```
drawable-mdpi/banner.png     (240 x 135 px)
drawable-hdpi/banner.png     (360 x 202 px)
drawable-xhdpi/banner.png    (480 x 270 px)  ← Current
drawable-xxhdpi/banner.png   (640 x 360 px)
drawable-xxxhdpi/banner.png  (960 x 540 px)
```

## Next Steps

1. **Create a proper TV banner:**
   - Design a 320x180 dp banner with your Ideogram logo
   - Make sure it's visually appealing on a TV screen
   - Replace the current banner at: `android/app/src/main/res/drawable-xhdpi/banner.png`

2. **Rebuild the app:**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

3. **Reinstall on TV:**
   - Uninstall the current version
   - Install the new APK
   - You should now see your banner in the TV launcher!

## Current Banner Location
`android/app/src/main/res/drawable-xhdpi/banner.png`

I've temporarily used your existing logo as the banner. For the best TV experience, create a dedicated banner image following the specifications above.
