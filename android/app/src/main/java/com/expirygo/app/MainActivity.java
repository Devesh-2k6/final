package com.expirygo.app;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

/**
 * MainActivity is the entry point for the ExpiryGo Android application.
 * It extends BridgeActivity to integrate the Capacitor bridge.
 */
public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Handle the splash screen transition.
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
    }
}
