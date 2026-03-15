import UIKit
internal import Expo
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Firebase
import GoogleSignIn
import EXUpdates // Quan trọng: Thêm dòng này để dùng được tính năng OTA

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "FinTrackPro",
      in: window,
      launchOptions: launchOptions
    )
    FirebaseApp.configure()

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if GIDSignIn.sharedInstance.handle(url) {
      return true
    }
    return super.application(app, open: url, options: options)
  }      
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // Ép app lấy URL từ bundleURL() để Expo Updates có thể can thiệp
    return bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    // Thay đổi quan trọng: Ưu tiên lấy URL của bản cập nhật OTA (nếu có)
    return AppController.sharedInstance.launchAssetUrl ?? Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}