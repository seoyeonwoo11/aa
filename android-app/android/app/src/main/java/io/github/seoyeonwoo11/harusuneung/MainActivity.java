package io.github.seoyeonwoo11.harusuneung;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScreenStatePlugin.class);
        super.onCreate(savedInstanceState);

        // 시작 화면(로고)은 웹앱이 첫 화면을 그린 뒤 닫는다.
        // 웹앱이 예전 버전이거나 불러오다 멈춰도 갇히지 않게 10초 뒤에는 앱이 직접 닫는다.
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().evaluateJavascript(
                    "window.Capacitor && window.Capacitor.nativePromise('SplashScreen', 'hide', {}).catch(function () {});",
                    null
                );
            }
        }, 10000);
    }
}
