# filepath: c:\Users\harsh\Desktop\Ideogram2\Ideogram_App\IdeogramTV\android\app\proguard-rules.pro

# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ✅ CRITICAL: Preserve React Native Video classes
-keep class com.brentvatne.** { *; }
-keep class com.google.android.exoplayer2.** { *; }
-dontwarn com.google.android.exoplayer2.**

# ✅ CRITICAL: Preserve video codecs
-keep class androidx.media.** { *; }
-keep class androidx.media3.** { *; }

# ✅ CRITICAL: Prevent crashes from stripped native methods
-keepclassmembers class * {
    native <methods>;
}

# ✅ CRITICAL: Keep video-related JNI methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# ✅ Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# ✅ Keep AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ✅ Keep Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# ✅ Keep NetInfo
-keep class com.reactnativecommunity.netinfo.** { *; }

# ✅ Keep RNFS
-keep class com.rnfs.** { *; }

# ✅ Keep Socket.IO
-keep class io.socket.** { *; }
-dontwarn io.socket.**

# ✅ Keep Kotlin
-keep class kotlin.** { *; }
-dontwarn kotlin.**
