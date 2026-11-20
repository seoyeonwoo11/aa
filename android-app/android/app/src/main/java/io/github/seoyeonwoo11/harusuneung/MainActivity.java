package io.github.seoyeonwoo11.harusuneung;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScreenStatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
