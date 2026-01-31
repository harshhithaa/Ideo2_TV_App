package com.ideogramtv

import android.app.Application
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.shell.MainReactPackage
import com.facebook.soloader.SoLoader

// Manual package imports
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage
import com.reactnativecommunity.netinfo.NetInfoPackage
import com.dylanvann.fastimage.FastImageViewPackage
import com.rnfs.RNFSPackage
import com.swmansion.gesturehandler.RNGestureHandlerPackage
import com.corbt.keepawake.KCKeepAwakePackage
import org.wonday.orientation.OrientationPackage
import com.th3rdwave.safeareacontext.SafeAreaContextPackage
import com.swmansion.rnscreens.RNScreensPackage
import com.reactnativesystemnavigationbar.SystemNavigationBarPackage
import io.xogus.reactnative.versioncheck.RNVersionCheckPackage
import com.brentvatne.react.ReactVideoPackage

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
          listOf(
            MainReactPackage(null),  // Core React Native package
            AsyncStoragePackage(),
            NetInfoPackage(),
            FastImageViewPackage(),
            RNFSPackage(),
            RNGestureHandlerPackage(),
            KCKeepAwakePackage(),
            OrientationPackage(),
            SafeAreaContextPackage(),
            RNScreensPackage(),
            SystemNavigationBarPackage(),
            RNVersionCheckPackage(),
            ReactVideoPackage()
          )

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
  }
}
