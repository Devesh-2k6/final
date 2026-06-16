# Capacitor Essential Rules
-keep public class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin
-keep public class * extends com.getcapacitor.BridgeActivity
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.JSObject { *; }
-keep class com.getcapacitor.JSArray { *; }

# Cordova Compatibility
-dontwarn org.apache.cordova.**
-keep public class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin

# Preserve line numbers for better crash reporting
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Optimization for size
-repackageclasses ''
-allowaccessmodification
