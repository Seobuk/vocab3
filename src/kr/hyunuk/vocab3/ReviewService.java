package kr.hyunuk.vocab3;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.drawable.Icon;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import org.json.JSONArray;
import org.json.JSONObject;

import java.lang.ref.WeakReference;
import java.util.Locale;

/**
 * Foreground service that reads a playlist aloud (word → pause → example ×N → meaning …)
 * so listening review keeps running with the screen off or another app (navigation) in front.
 * The step sequence for each item is built by the web UI and passed in as JSON:
 * [{"w":..,"m":..,"e":..,"k":..,"steps":[{"t":"say","text":..,"lang":"en|ko","rate":0.8},{"t":"wait","ms":2000}]}]
 */
public class ReviewService extends Service {

    public static final String ACTION_START = "kr.hyunuk.vocab3.AUDIO_START";
    public static final String ACTION_TOGGLE = "kr.hyunuk.vocab3.AUDIO_TOGGLE";
    public static final String ACTION_PAUSE = "kr.hyunuk.vocab3.AUDIO_PAUSE";
    public static final String ACTION_RESUME = "kr.hyunuk.vocab3.AUDIO_RESUME";
    public static final String ACTION_NEXT = "kr.hyunuk.vocab3.AUDIO_NEXT";
    public static final String ACTION_PREV = "kr.hyunuk.vocab3.AUDIO_PREV";
    public static final String ACTION_STOP = "kr.hyunuk.vocab3.AUDIO_STOP";
    public static final String EXTRA_PLAYLIST = "playlist";
    public static final String EXTRA_LOOP = "loop";

    private static final String CHANNEL = "audio_review";
    private static final int NOTI_ID = 7;

    public interface Listener { void onState(String json); }
    private static WeakReference<Listener> sListener = new WeakReference<Listener>(null);
    private static volatile String sLastState = "{\"active\":false}";
    public static void setListener(Listener l) { sListener = new WeakReference<Listener>(l); }
    public static String lastState() { return sLastState; }

    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextToSpeech tts;
    private boolean ttsReady = false, koOk = false, pendingBegin = false;
    private JSONArray playlist = new JSONArray();
    private JSONArray steps = new JSONArray();
    private int index = 0, stepIdx = 0, uttSeq = 0;
    private boolean playing = false, active = false, loop = false, finished = false, pausedByFocus = false;
    private String currentUtt = null;
    private String curPart = "";
    private Runnable pendingWait = null;
    private PowerManager.WakeLock wakeLock;
    private AudioManager am;
    private AudioFocusRequest focusReq;
    private AudioManager.OnAudioFocusChangeListener focusListener;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onCreate() {
        super.onCreate();
        am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        focusListener = new AudioManager.OnAudioFocusChangeListener() {
            @Override
            public void onAudioFocusChange(int change) {
                if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT
                        || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
                    if (playing) { pause(); pausedByFocus = (change != AudioManager.AUDIOFOCUS_LOSS); }
                } else if (change == AudioManager.AUDIOFOCUS_GAIN && pausedByFocus) {
                    pausedByFocus = false;
                    resume();
                }
            }
        };
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(CHANNEL, "듣기 복습", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("듣기 복습 재생 제어");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                ttsReady = status == TextToSpeech.SUCCESS;
                if (ttsReady) {
                    try {
                        tts.setAudioAttributes(new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
                    } catch (Exception ignored) { }
                    koOk = tts.isLanguageAvailable(Locale.KOREAN) >= TextToSpeech.LANG_AVAILABLE;
                    tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                        @Override public void onStart(String id) { }
                        @Override public void onDone(final String id) { uttFinished(id); }
                        @Override public void onError(final String id) { uttFinished(id); }
                        @Override public void onError(final String id, int code) { uttFinished(id); }
                    });
                }
                if (pendingBegin) { pendingBegin = false; begin(); }
            }
        });
    }

    private void uttFinished(final String id) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                if (id != null && id.equals(currentUtt)) { currentUtt = null; stepIdx++; runStep(); }
            }
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        // Always (re)enter the foreground state first: every start — including notification actions —
        // may have come through startForegroundService(), which requires a prompt startForeground().
        if (ACTION_START.equals(action)) {
            cancelWait();
            currentUtt = null;
            if (tts != null) { try { tts.stop(); } catch (Exception ignored) { } }
            try { playlist = new JSONArray(intent.getStringExtra(EXTRA_PLAYLIST)); } catch (Exception e) { playlist = new JSONArray(); }
            loop = intent.getBooleanExtra(EXTRA_LOOP, false);
            index = 0; finished = false; playing = false; active = playlist.length() > 0;
            startFg();
            if (!active) { stopAll(); return START_NOT_STICKY; }
            if (ttsReady) begin(); else pendingBegin = true;
            return START_NOT_STICKY;
        }
        startFg();
        if (!active) { stopAll(); return START_NOT_STICKY; }
        if (ACTION_TOGGLE.equals(action)) {
            if (playing) pause(); else resume();
        } else if (ACTION_PAUSE.equals(action)) {
            pause();
        } else if (ACTION_RESUME.equals(action)) {
            resume();
        } else if (ACTION_NEXT.equals(action)) {
            next();
        } else if (ACTION_PREV.equals(action)) {
            prev();
        } else if (ACTION_STOP.equals(action)) {
            stopAll();
        } else {
            updateNotification();
        }
        return START_NOT_STICKY;
    }

    private void startFg() {
        Notification n = buildNotification();
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTI_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTI_ID, n);
        }
    }

    private void begin() {
        acquireResources();
        playing = true; finished = false;
        loadSteps();
        updateNotification();
        pushState();
        runStep();
    }

    private void loadSteps() {
        steps = new JSONArray();
        stepIdx = 0;
        curPart = "";
        try {
            JSONObject item = playlist.getJSONObject(index);
            steps = item.optJSONArray("steps");
            if (steps == null) steps = new JSONArray();
        } catch (Exception ignored) { }
    }

    private void cancelWait() {
        if (pendingWait != null) { handler.removeCallbacks(pendingWait); pendingWait = null; }
    }

    private void runStep() {
        if (!playing) return;
        if (stepIdx >= steps.length()) { advance(); return; }
        JSONObject s = steps.optJSONObject(stepIdx);
        if (s == null) { stepIdx++; runStep(); return; }
        String t = s.optString("t", "wait");
        if ("say".equals(t)) {
            String text = s.optString("text", "");
            String lang = s.optString("lang", "en");
            float rate = (float) s.optDouble("rate", 0.9);
            if (text.trim().isEmpty() || !ttsReady || ("ko".equals(lang) && !koOk)) { stepIdx++; runStep(); return; }
            String part = s.optString("p", "");
            if (!part.equals(curPart)) { curPart = part; pushState(); }
            try {
                tts.setLanguage("ko".equals(lang) ? Locale.KOREAN : Locale.US);
                tts.setSpeechRate(rate);
                final String id = "u" + (++uttSeq);
                currentUtt = id;
                Bundle params = new Bundle();
                params.putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_MUSIC);
                int r = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, id);
                if (r != TextToSpeech.SUCCESS) {
                    currentUtt = null;
                    pendingWait = new Runnable() { @Override public void run() { pendingWait = null; stepIdx++; runStep(); } };
                    handler.postDelayed(pendingWait, 400);
                }
            } catch (Exception e) {
                currentUtt = null; stepIdx++; runStep();
            }
        } else {
            long ms = s.optLong("ms", 1000);
            pendingWait = new Runnable() { @Override public void run() { pendingWait = null; stepIdx++; runStep(); } };
            handler.postDelayed(pendingWait, Math.max(0, ms));
        }
    }

    private void advance() {
        if (index + 1 < playlist.length()) {
            index++;
        } else if (loop) {
            index = 0;
        } else {
            finish();
            return;
        }
        loadSteps();
        updateNotification();
        pushState();
        runStep();
    }

    private void finish() {
        playing = false; finished = true; active = false;
        cancelWait();
        if (tts != null) tts.stop();
        currentUtt = null;
        pushState();
        releaseResources();
        stopForeground(true);
        stopSelf();
    }

    private void pause() {
        if (!active) return;
        playing = false;
        cancelWait();
        currentUtt = null;
        if (tts != null) tts.stop();
        try { if (wakeLock != null && wakeLock.isHeld()) wakeLock.release(); } catch (Exception ignored) { }
        updateNotification();
        pushState();
    }

    private void resume() {
        if (!active || playing) return;
        acquireResources();
        playing = true;
        updateNotification();
        pushState();
        runStep();
    }

    private void restartCurrent() {
        cancelWait();
        currentUtt = null;
        if (tts != null) tts.stop();
        loadSteps();
        playing = true;
        acquireResources();
        updateNotification();
        pushState();
        runStep();
    }

    private void next() {
        if (!active) return;
        if (index + 1 < playlist.length()) index++;
        else if (loop) index = 0;
        else { finish(); return; }
        restartCurrent();
    }

    private void prev() {
        if (!active) return;
        if (index > 0) index--;
        restartCurrent();
    }

    private void stopAll() {
        playing = false; active = false; finished = true;
        cancelWait();
        currentUtt = null;
        if (tts != null) tts.stop();
        pushState();
        releaseResources();
        stopForeground(true);
        stopSelf();
    }

    private void acquireResources() {
        try {
            if (wakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "vocab3:audioReview");
                wakeLock.setReferenceCounted(false);
            }
            if (!wakeLock.isHeld()) wakeLock.acquire(3 * 60 * 60 * 1000L);
        } catch (Exception ignored) { }
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                if (focusReq == null) {
                    focusReq = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                            .setAudioAttributes(new AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_MEDIA)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                            .setOnAudioFocusChangeListener(focusListener, handler)
                            .build();
                }
                am.requestAudioFocus(focusReq);
            } else {
                am.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
            }
        } catch (Exception ignored) { }
    }

    private void releaseResources() {
        try { if (wakeLock != null && wakeLock.isHeld()) wakeLock.release(); } catch (Exception ignored) { }
        try {
            if (Build.VERSION.SDK_INT >= 26) { if (focusReq != null) am.abandonAudioFocusRequest(focusReq); }
            else am.abandonAudioFocus(focusListener);
        } catch (Exception ignored) { }
    }

    private JSONObject currentItem() {
        try { return playlist.getJSONObject(index); } catch (Exception e) { return new JSONObject(); }
    }

    private void pushState() {
        JSONObject o = new JSONObject();
        try {
            JSONObject it = currentItem();
            o.put("active", active);
            o.put("playing", playing);
            o.put("finished", finished);
            o.put("index", index);
            o.put("total", playlist.length());
            o.put("loop", loop);
            o.put("koOk", koOk);
            o.put("part", curPart);
            o.put("w", it.optString("w", ""));
            o.put("m", it.optString("m", ""));
            o.put("e", it.optString("e", ""));
            o.put("k", it.optString("k", ""));
        } catch (Exception ignored) { }
        sLastState = o.toString();
        Listener l = sListener.get();
        if (l != null) l.onState(sLastState);
    }

    private PendingIntent svcIntent(String action, int code) {
        Intent i = new Intent(this, ReviewService.class).setAction(action);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        if (Build.VERSION.SDK_INT >= 26) return PendingIntent.getForegroundService(this, code, i, flags);
        return PendingIntent.getService(this, code, i, flags);
    }

    private Notification buildNotification() {
        JSONObject it = currentItem();
        String w = it.optString("w", "듣기 복습");
        String m = it.optString("m", "");
        String sub = (playlist.length() > 0 ? (index + 1) + "/" + playlist.length() + "  " : "") + m;
        Notification.Builder b = (Build.VERSION.SDK_INT >= 26) ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        b.setSmallIcon(R.drawable.ic_stat_headset)
                .setContentTitle(w)
                .setContentText(sub)
                .setOngoing(playing)
                .setOnlyAlertOnce(true)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class),
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        b.addAction(new Notification.Action.Builder(Icon.createWithResource(this, R.drawable.ic_prev), "이전", svcIntent(ACTION_PREV, 1)).build());
        b.addAction(new Notification.Action.Builder(Icon.createWithResource(this, playing ? R.drawable.ic_pause : R.drawable.ic_play),
                playing ? "일시정지" : "재생", svcIntent(ACTION_TOGGLE, 2)).build());
        b.addAction(new Notification.Action.Builder(Icon.createWithResource(this, R.drawable.ic_next), "다음", svcIntent(ACTION_NEXT, 3)).build());
        b.addAction(new Notification.Action.Builder(Icon.createWithResource(this, R.drawable.ic_stop), "정지", svcIntent(ACTION_STOP, 4)).build());
        b.setStyle(new Notification.MediaStyle().setShowActionsInCompactView(0, 1, 2));
        return b.build();
    }

    private void updateNotification() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            nm.notify(NOTI_ID, buildNotification());
        } catch (Exception ignored) { }
    }

    @Override
    public void onDestroy() {
        cancelWait();
        releaseResources();
        if (tts != null) {
            try { tts.stop(); tts.shutdown(); } catch (Exception ignored) { }
        }
        super.onDestroy();
    }
}
