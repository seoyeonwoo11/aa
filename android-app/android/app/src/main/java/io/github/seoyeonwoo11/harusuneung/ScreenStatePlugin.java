package io.github.seoyeonwoo11.harusuneung;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.PowerManager;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 앱이 뒤로 갈 때 화면이 켜져 있었는지, 화면이 언제 꺼지고 켜지고 잠금이 풀렸는지 기억해 둔다.
 *
 * 웹앱은 '화면이 가려짐'만 알 수 있고, 화면이 꺼지면 웹 코드가 멈춰 그 처리가 늦어질 수도 있다.
 * 화면이 오래 꺼져 있으면 안드로이드가 웹 화면이나 앱을 정리해 처음부터 다시 열리기도 하므로,
 * 기록은 휴대폰 저장소(SharedPreferences)에도 남겨 앱이 다시 열려도 이어 쓸 수 있게 한다.
 * 그래서 판단에 필요한 사실은 여기(휴대폰 쪽)에서 그 순간에 남기고,
 * 웹앱은 앱으로 돌아왔을 때 getState()로 물어본다.
 *   - 화면 끄기(전원 버튼·자동 꺼짐): 앱이 멈출 때 isInteractive == false
 *   - 다른 앱으로 나가기: 앱이 멈출 때 isInteractive == true
 */
@CapacitorPlugin(name = "ScreenState")
public class ScreenStatePlugin extends Plugin {

    private long pausedAt = 0;
    private boolean pausedInteractive = true;
    private long stoppedAt = 0;
    private boolean stoppedInteractive = true;
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
            save();
        }
    };

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences("screen_state", Context.MODE_PRIVATE);
    }

    private void save() {
        prefs().edit()
            .putLong("pausedAt", pausedAt).putBoolean("pausedInteractive", pausedInteractive)
            .putLong("stoppedAt", stoppedAt).putBoolean("stoppedInteractive", stoppedInteractive)
            .putLong("screenOffAt", screenOffAt).putLong("screenOnAt", screenOnAt).putLong("unlockedAt", unlockedAt)
            .commit(); // 곧 정리될 수 있으므로 바로 쓴다
    }

    private void restore() {
        SharedPreferences p = prefs();
        pausedAt = p.getLong("pausedAt", 0);
        pausedInteractive = p.getBoolean("pausedInteractive", true);
        stoppedAt = p.getLong("stoppedAt", 0);
        stoppedInteractive = p.getBoolean("stoppedInteractive", true);
        screenOffAt = p.getLong("screenOffAt", 0);
        screenOnAt = p.getLong("screenOnAt", 0);
        unlockedAt = p.getLong("unlockedAt", 0);
    }

    private boolean interactive() {
        PowerManager power = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return power == null || power.isInteractive();
    }

    @Override
    public void load() {
        restore();
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_USER_PRESENT);
        // 화면 꺼짐·켜짐·잠금 해제는 시스템만 보낼 수 있는 방송이다
        ContextCompat.registerReceiver(getContext(), receiver, filter, ContextCompat.RECEIVER_EXPORTED);
    }

    @Override
    protected void handleOnPause() {
        pausedAt = System.currentTimeMillis();
        pausedInteractive = interactive();
        save();
    }

    @Override
    protected void handleOnStop() {
        stoppedAt = System.currentTimeMillis();
        stoppedInteractive = interactive();
        save();
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
        JSObject result = new JSObject();
        result.put("interactive", interactive());
        result.put("pausedAt", pausedAt);
        result.put("pausedInteractive", pausedInteractive);
        result.put("stoppedAt", stoppedAt);
        result.put("stoppedInteractive", stoppedInteractive);
        result.put("screenOffAt", screenOffAt);
        result.put("screenOnAt", screenOnAt);
        result.put("unlockedAt", unlockedAt);
        result.put("now", System.currentTimeMillis());
        call.resolve(result);
    }
}
