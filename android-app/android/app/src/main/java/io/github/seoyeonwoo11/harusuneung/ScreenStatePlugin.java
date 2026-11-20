package io.github.seoyeonwoo11.harusuneung;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.PowerManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.core.content.ContextCompat;

/**
 * 화면이 꺼지고 켜진 시각을 기억해 둔다.
 *
 * 웹앱은 '화면이 가려짐'만 알 수 있어서 화면을 끈 것인지 다른 앱으로 나간 것인지 모른다.
 * 앱이 백그라운드에 있는 동안에는 웹 코드가 멈출 수 있으므로, 앱으로 돌아왔을 때
 * 웹앱이 getState()로 그 사이에 화면이 꺼졌는지, 언제 다시 켜지고 잠금이 풀렸는지 묻는다.
 */
@CapacitorPlugin(name = "ScreenState")
public class ScreenStatePlugin extends Plugin {

    private long screenOffAt = 0;
    private long screenOnAt = 0;
    private long unlockedAt = 0;

    private final BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            long now = System.currentTimeMillis();
            String action = intent.getAction();
            if (Intent.ACTION_SCREEN_OFF.equals(action)) screenOffAt = now;
            else if (Intent.ACTION_SCREEN_ON.equals(action)) screenOnAt = now;
            else if (Intent.ACTION_USER_PRESENT.equals(action)) unlockedAt = now;
        }
    };

    @Override
    public void load() {
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_USER_PRESENT);
        // 화면 꺼짐·켜짐·잠금 해제는 시스템만 보낼 수 있는 방송이다
        ContextCompat.registerReceiver(getContext(), receiver, filter, ContextCompat.RECEIVER_EXPORTED);
    }

    @Override
    protected void handleOnDestroy() {
        try {
            getContext().unregisterReceiver(receiver);
        } catch (IllegalArgumentException ignored) {
            // 이미 해제됨
        }
    }

    @PluginMethod
    public void getState(PluginCall call) {
        PowerManager power = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        JSObject result = new JSObject();
        result.put("interactive", power == null || power.isInteractive());
        result.put("screenOffAt", screenOffAt);
        result.put("screenOnAt", screenOnAt);
        result.put("unlockedAt", unlockedAt);
        result.put("now", System.currentTimeMillis());
        call.resolve(result);
    }
}
