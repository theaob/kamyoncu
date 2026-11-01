package io.github.theaob.kamyoncu;

import android.app.Activity;
import android.content.Intent;
import android.text.TextUtils;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.tasks.Task;

/**
 * Google Play Games Services v2 köprüsü (JS tarafı: src/platform/playGames.ts).
 *
 * Kimlikler res/values/games-ids.xml dosyasından okunur. app_id boşsa SDK hiç
 * başlatılmaz ve tüm çağrılar sessizce "gönderilmedi" döner; böylece Play Console
 * kurulumu bitmeden de uygulama aynen çalışır. Kurulum: docs/PLAY_GAMES.md
 */
@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {

    private static final int RC_UI = 9004;

    private boolean available = false;

    @Override
    public void load() {
        String appId = getString("app_id");
        available = appId != null && TextUtils.isDigitsOnly(appId) && !appId.isEmpty();
        if (available) {
            // Açılışta otomatik oturum açmayı da başlatır (PGS v2).
            PlayGamesSdk.initialize(getContext());
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        if (!available) {
            call.resolve(result(false));
            return;
        }
        PlayGames.getGamesSignInClient(getActivity())
            .isAuthenticated()
            .addOnCompleteListener(task -> call.resolve(result(authenticated(task))));
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        if (!available) {
            call.resolve(result(false));
            return;
        }
        PlayGames.getGamesSignInClient(getActivity())
            .signIn()
            .addOnCompleteListener(task -> call.resolve(result(authenticated(task))));
    }

    @PluginMethod
    public void unlockAchievement(PluginCall call) {
        String id = resourceId("achievement_", call.getString("key"));
        if (!available || id == null) {
            call.resolve(sent(false));
            return;
        }
        PlayGames.getAchievementsClient(getActivity()).unlock(id);
        call.resolve(sent(true));
    }

    @PluginMethod
    public void submitScore(PluginCall call) {
        String id = resourceId("leaderboard_", call.getString("key"));
        Long score = call.getLong("score");
        if (score == null) {
            Double d = call.getDouble("score");
            score = d == null ? null : Math.round(d);
        }
        if (!available || id == null || score == null) {
            call.resolve(sent(false));
            return;
        }
        PlayGames.getLeaderboardsClient(getActivity()).submitScore(id, score);
        call.resolve(sent(true));
    }

    @PluginMethod
    public void showAchievements(PluginCall call) {
        if (!available) {
            call.reject("Play Games is not configured");
            return;
        }
        showUi(call, PlayGames.getAchievementsClient(getActivity()).getAchievementsIntent());
    }

    @PluginMethod
    public void showLeaderboards(PluginCall call) {
        if (!available) {
            call.reject("Play Games is not configured");
            return;
        }
        showUi(call, PlayGames.getLeaderboardsClient(getActivity()).getAllLeaderboardsIntent());
    }

    private void showUi(PluginCall call, Task<Intent> intentTask) {
        Activity activity = getActivity();
        intentTask.addOnSuccessListener(intent -> {
            activity.startActivityForResult(intent, RC_UI);
            call.resolve();
        }).addOnFailureListener(e -> call.reject(e.getMessage(), e));
    }

    private static boolean authenticated(Task<com.google.android.gms.games.AuthenticationResult> task) {
        return task.isSuccessful() && task.getResult() != null && task.getResult().isAuthenticated();
    }

    private JSObject result(boolean signedIn) {
        JSObject ret = new JSObject();
        ret.put("available", available);
        ret.put("signedIn", available && signedIn);
        return ret;
    }

    private static JSObject sent(boolean sent) {
        JSObject ret = new JSObject();
        ret.put("sent", sent);
        return ret;
    }

    /** games-ids.xml içindeki dize kaynağı; tanımsız ya da boşsa null. */
    private String getString(String name) {
        int res = getContext().getResources().getIdentifier(name, "string", getContext().getPackageName());
        if (res == 0) return null;
        String value = getContext().getString(res).trim();
        return value.isEmpty() ? null : value;
    }

    private String resourceId(String prefix, String key) {
        if (key == null || !key.matches("[a-z0-9_]+")) return null;
        return getString(prefix + key);
    }
}
