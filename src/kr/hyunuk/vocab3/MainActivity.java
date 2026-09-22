package kr.hyunuk.vocab3;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import java.util.ArrayList;
import android.graphics.Insets;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import android.widget.Toast;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public class MainActivity extends Activity {

    private static final int REQ_SAVE = 101;
    private static final int REQ_OPEN = 102;

    private WebView web;
    private FrameLayout root;
    private ReviewService.Listener audioListener;
    private TextToSpeech tts;
    private SharedPreferences prefs;
    private volatile boolean ttsReady = false;
    private volatile boolean backHandled = false;
    private volatile String ttsLang = "en";
    private String pendingSaveContent = null;
    private static final int REQ_NOTI = 201;
    private Intent pendingAudioStart = null;
    private static final int REQ_MIC = 301;
    private SpeechRecognizer stt;
    private boolean sttPendingStart = false;
    private String sttLang = "en-US";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("vocab3", MODE_PRIVATE);

        int bg = Color.parseColor("#F6F7FB");
        try { bg = Color.parseColor(prefs.getString("sysbar", "#F6F7FB")); } catch (Exception ignored) { }
        root = new FrameLayout(this);
        root.setBackgroundColor(bg);
        web = new WebView(this);
        web.setBackgroundColor(bg);
        try { getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(bg)); } catch (Exception ignored) { }
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new Bridge(), "Android");
        if (Build.VERSION.SDK_INT >= 35) {
            // Android 15+: edge-to-edge is enforced, so pad the WebView by the system bar / keyboard insets.
            root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
                @Override
                public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                    Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                    Insets ime = insets.getInsets(WindowInsets.Type.ime());
                    v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
                    return WindowInsets.CONSUMED;
                }
            });
        }
        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        web.loadUrl("file:///android_asset/index.html");
        audioListener = new ReviewService.Listener() {
            @Override
            public void onState(String json) {
                runJs("window.onAudioState && window.onAudioState(" + jsString(json) + ")");
            }
        };
        ReviewService.setListener(audioListener);
        if (Build.VERSION.SDK_INT >= 33) {
            // Android 13+: route the (predictive) back gesture to the web UI as well
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    new OnBackInvokedCallback() {
                        @Override
                        public void onBackInvoked() { handleBack(); }
                    });
        }

        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                if (status == TextToSpeech.SUCCESS) {
                    int r = tts.setLanguage(Locale.US);
                    ttsReady = (r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED);
                } else {
                    ttsReady = false;
                }
                runJs("window.onTtsReady && window.onTtsReady(" + ttsReady + ")");
            }
        });
    }

    private void runJs(final String js) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (web != null) web.evaluateJavascript(js, null);
            }
        });
    }

    private static String jsString(String s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '\\': b.append("\\\\"); break;
                case '"': b.append("\\\""); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case ' ': b.append("\\u2028"); break;
                case ' ': b.append("\\u2029"); break;
                default:
                    if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
                    else b.append(c);
            }
        }
        return b.append('"').toString();
    }

    private void handleBack() {
        if (backHandled) {
            runJs("window.__appBack && window.__appBack()");
        } else {
            finish();
        }
    }

    @Override
    public void onBackPressed() {
        if (Build.VERSION.SDK_INT >= 33) { handleBack(); return; }
        if (backHandled) {
            runJs("window.__appBack && window.__appBack()");
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (tts != null) tts.stop();
        runJs("window.onAppPause && window.onAppPause()");
    }

    @Override
    protected void onResume() {
        super.onResume();
        runJs("window.onAppResume && window.onAppResume()");
        runJs("window.onAudioState && window.onAudioState(" + jsString(ReviewService.lastState()) + ")");
    }

    @Override
    protected void onDestroy() {
        try { if (stt != null) { stt.destroy(); stt = null; } } catch (Exception ignored) { }
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_NOTI && pendingAudioStart != null) {
            Intent i = pendingAudioStart; pendingAudioStart = null;
            launchService(i);
        }
        if (requestCode == REQ_MIC) {
            boolean ok = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (ok && sttPendingStart) { sttPendingStart = false; startStt(); }
            else { sttPendingStart = false; runJs("window.onSttError && window.onSttError('permission')"); }
        }
    }

    /* ---------------- speech recognition (회화 연습) ---------------- */
    private boolean hasMic() {
        return checkSelfPermission("android.permission.RECORD_AUDIO") == PackageManager.PERMISSION_GRANTED;
    }

    // Runs on the UI thread. Recognition itself is done by the device's speech service (usually Google);
    // the app never stores audio — only the recognized text reaches the web UI.
    private void startStt() {
        try {
            if (!SpeechRecognizer.isRecognitionAvailable(this)) { runJs("window.onSttError && window.onSttError('unavailable')"); return; }
            if (stt == null) {
                stt = SpeechRecognizer.createSpeechRecognizer(this);
                stt.setRecognitionListener(new RecognitionListener() {
                    @Override public void onReadyForSpeech(Bundle params) { runJs("window.onSttState && window.onSttState('ready')"); }
                    @Override public void onBeginningOfSpeech() { runJs("window.onSttState && window.onSttState('speech')"); }
                    @Override public void onRmsChanged(float rmsdB) { }
                    @Override public void onBufferReceived(byte[] buffer) { }
                    @Override public void onEndOfSpeech() { runJs("window.onSttState && window.onSttState('end')"); }
                    @Override public void onError(int error) {
                        String code;
                        switch (error) {
                            case SpeechRecognizer.ERROR_NO_MATCH: case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: code = "nomatch"; break;
                            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: code = "permission"; break;
                            case SpeechRecognizer.ERROR_NETWORK: case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: case SpeechRecognizer.ERROR_SERVER: code = "network"; break;
                            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: code = "busy"; break;
                            default: code = "error" + error;
                        }
                        runJs("window.onSttError && window.onSttError(" + jsString(code) + ")");
                    }
                    @Override public void onResults(Bundle results) {
                        ArrayList<String> list = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        String best = (list != null && !list.isEmpty()) ? list.get(0) : "";
                        runJs("window.onStt && window.onStt(" + jsString(best) + ")");
                    }
                    @Override public void onPartialResults(Bundle partial) {
                        ArrayList<String> list = partial.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (list != null && !list.isEmpty()) runJs("window.onSttPartial && window.onSttPartial(" + jsString(list.get(0)) + ")");
                    }
                    @Override public void onEvent(int eventType, Bundle params) { }
                });
            }
            if (tts != null) tts.stop();
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, sttLang);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, sttLang);
            i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
            stt.startListening(i);
        } catch (Exception e) {
            runJs("window.onSttError && window.onSttError(" + jsString("exception") + ")");
        }
    }

    private void launchService(Intent i) {
        try {
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(i); else startService(i);
        } catch (Exception e) {
            runJs("window.onAudioError && window.onAudioError(" + jsString(String.valueOf(e.getMessage())) + ")");
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            pendingSaveContent = null;
            return;
        }
        Uri uri = data.getData();
        if (requestCode == REQ_SAVE) {
            String content = pendingSaveContent;
            pendingSaveContent = null;
            if (content == null) return;
            try {
                OutputStream os = getContentResolver().openOutputStream(uri, "wt");
                os.write(content.getBytes(StandardCharsets.UTF_8));
                os.flush();
                os.close();
                runJs("window.onFileSaved && window.onFileSaved(true)");
            } catch (Exception e) {
                runJs("window.onFileSaved && window.onFileSaved(false)");
            }
        } else if (requestCode == REQ_OPEN) {
            try {
                InputStream is = getContentResolver().openInputStream(uri);
                BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                char[] buf = new char[8192];
                int n;
                while ((n = r.read(buf)) > 0) sb.append(buf, 0, n);
                r.close();
                runJs("window.onFileOpened && window.onFileOpened(" + jsString(sb.toString()) + ")");
            } catch (Exception e) {
                runJs("window.onFileOpened && window.onFileOpened(null)");
            }
        }
    }

    private class Bridge {

        @JavascriptInterface
        public String load(String key) {
            return prefs.getString(key, null);
        }

        @JavascriptInterface
        public void save(String key, String value) {
            prefs.edit().putString(key, value).apply();
        }

        @JavascriptInterface
        public void remove(String key) {
            prefs.edit().remove(key).apply();
        }

        @JavascriptInterface
        public boolean ttsReady() {
            return ttsReady;
        }

        @JavascriptInterface
        public void speak(final String text, final String lang, final float rate, final boolean flush) {
            if (tts == null || !ttsReady) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (!lang.equals(ttsLang)) {
                            tts.setLanguage("ko".equals(lang) ? Locale.KOREAN : Locale.US);
                            ttsLang = lang;
                        }
                        tts.setSpeechRate(rate);
                        tts.speak(text, flush ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD, null, "vocab3");
                    } catch (Exception ignored) {
                    }
                }
            });
        }

        @JavascriptInterface
        public void stopSpeak() {
            if (tts != null) tts.stop();
        }

        @JavascriptInterface
        public void vibrate(final int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null || !v.hasVibrator()) return;
                if (Build.VERSION.SDK_INT >= 26) {
                    v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(ms);
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void toast(final String msg) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void copy(final String text) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("vocab3", text));
                }
            });
        }

        @JavascriptInterface
        public void share(final String title, final String text) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType("text/plain");
                    i.putExtra(Intent.EXTRA_SUBJECT, title);
                    i.putExtra(Intent.EXTRA_TEXT, text);
                    try {
                        startActivity(Intent.createChooser(i, title));
                    } catch (Exception ignored) {
                    }
                }
            });
        }

        @JavascriptInterface
        public void saveFile(final String name, final String content) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    pendingSaveContent = content;
                    Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("application/json");
                    i.putExtra(Intent.EXTRA_TITLE, name);
                    try {
                        startActivityForResult(i, REQ_SAVE);
                    } catch (Exception e) {
                        pendingSaveContent = null;
                        runJs("window.onFileSaved && window.onFileSaved(false)");
                    }
                }
            });
        }

        @JavascriptInterface
        public void openFile() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("*/*");
                    try {
                        startActivityForResult(i, REQ_OPEN);
                    } catch (Exception e) {
                        runJs("window.onFileOpened && window.onFileOpened(null)");
                    }
                }
            });
        }

        @JavascriptInterface
        public void setBackHandled(boolean b) {
            backHandled = b;
        }

        @JavascriptInterface
        public void setSystemBars(final String color, final boolean light) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        int c = Color.parseColor(color);
                        prefs.edit().putString("sysbar", color).apply();
                        Window w = getWindow();
                        w.setStatusBarColor(c);
                        w.setNavigationBarColor(c);
                        View decor = w.getDecorView();
                        if (Build.VERSION.SDK_INT >= 30) {
                            WindowInsetsController ic = decor.getWindowInsetsController();
                            if (ic != null) {
                                int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                                ic.setSystemBarsAppearance(light ? mask : 0, mask);
                            }
                        } else {
                            int flags = decor.getSystemUiVisibility();
                            int lightStatus = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                            int lightNav = (Build.VERSION.SDK_INT >= 26) ? View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : 0;
                            if (light) flags |= (lightStatus | lightNav);
                            else flags &= ~(lightStatus | lightNav);
                            decor.setSystemUiVisibility(flags);
                        }
                        web.setBackgroundColor(c);
                        if (root != null) root.setBackgroundColor(c);
                    } catch (Exception ignored) {
                    }
                }
            });
        }

        @JavascriptInterface
        public void audioStart(final String playlistJson, final boolean loop) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (tts != null) tts.stop();
                    final Intent i = new Intent(MainActivity.this, ReviewService.class)
                            .setAction(ReviewService.ACTION_START)
                            .putExtra(ReviewService.EXTRA_PLAYLIST, playlistJson)
                            .putExtra(ReviewService.EXTRA_LOOP, loop);
                    if (Build.VERSION.SDK_INT >= 33
                            && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                        pendingAudioStart = i;
                        requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, REQ_NOTI);
                        return;
                    }
                    launchService(i);
                }
            });
        }

        @JavascriptInterface
        public void audioControl(final String cmd) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    String action = "pause".equals(cmd) ? ReviewService.ACTION_PAUSE
                            : "resume".equals(cmd) ? ReviewService.ACTION_RESUME
                            : "next".equals(cmd) ? ReviewService.ACTION_NEXT
                            : "prev".equals(cmd) ? ReviewService.ACTION_PREV
                            : "toggle".equals(cmd) ? ReviewService.ACTION_TOGGLE
                            : ReviewService.ACTION_STOP;
                    Intent i = new Intent(MainActivity.this, ReviewService.class).setAction(action);
                    try { startService(i); } catch (Exception e) { launchService(i); }
                }
            });
        }

        @JavascriptInterface
        public String audioState() {
            return ReviewService.lastState();
        }

        @JavascriptInterface
        public void exitApp() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try { finishAndRemoveTask(); } catch (Exception e) { finish(); }
                }
            });
        }

        @JavascriptInterface
        public String version() {
            return "1.0";
        }

        @JavascriptInterface
        public boolean sttAvailable() {
            try { return SpeechRecognizer.isRecognitionAvailable(MainActivity.this); } catch (Exception e) { return false; }
        }

        /** Starts one recognition session (lang e.g. "en-US"); results arrive via window.onStt / onSttPartial / onSttError / onSttState. */
        @JavascriptInterface
        public void sttStart(final String lang) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    sttLang = (lang == null || lang.length() == 0) ? "en-US" : lang;
                    if (!hasMic()) {
                        sttPendingStart = true;
                        requestPermissions(new String[]{"android.permission.RECORD_AUDIO"}, REQ_MIC);
                        return;
                    }
                    startStt();
                }
            });
        }

        @JavascriptInterface
        public void sttStop() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() { try { if (stt != null) stt.stopListening(); } catch (Exception ignored) { } }
            });
        }

        @JavascriptInterface
        public void sttCancel() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() { try { if (stt != null) stt.cancel(); } catch (Exception ignored) { } }
            });
        }

        /** Opens a URL in the external browser (used for the API-key help link). */
        @JavascriptInterface
        public void openUrl(final String url) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "브라우저를 열 수 없어요", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        /**
         * HTTPS JSON call for the AI example feature (Gemini API). Runs on a background thread and
         * reports back through window.onAiResult(id, httpStatus, bodyText). status 0 = network error.
         * The API key travels in the x-goog-api-key header so it never appears in a URL/log line.
         */
        @JavascriptInterface
        public void aiCall(final String id, final String url, final String key, final String body) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    int status = 0;
                    String text = "";
                    HttpURLConnection c = null;
                    try {
                        c = (HttpURLConnection) new URL(url).openConnection();
                        c.setConnectTimeout(15000);
                        c.setReadTimeout(30000);
                        c.setRequestProperty("Accept", "application/json");
                        if (key != null && key.length() > 0) c.setRequestProperty("x-goog-api-key", key);
                        if (body != null && body.length() > 0) {
                            c.setRequestMethod("POST");
                            c.setDoOutput(true);
                            c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                            OutputStream os = c.getOutputStream();
                            os.write(body.getBytes(StandardCharsets.UTF_8));
                            os.close();
                        } else {
                            c.setRequestMethod("GET");
                        }
                        status = c.getResponseCode();
                        InputStream is = status >= 400 ? c.getErrorStream() : c.getInputStream();
                        if (is != null) {
                            BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                            StringBuilder sb = new StringBuilder();
                            char[] buf = new char[8192];
                            int n;
                            while ((n = r.read(buf)) > 0) sb.append(buf, 0, n);
                            r.close();
                            text = sb.toString();
                        }
                    } catch (Exception e) {
                        status = 0;
                        text = e.getClass().getSimpleName() + ": " + (e.getMessage() == null ? "" : e.getMessage());
                    } finally {
                        if (c != null) c.disconnect();
                    }
                    runJs("window.onAiResult && window.onAiResult(" + jsString(id) + "," + status + "," + jsString(text) + ")");
                }
            }, "vocab3-ai").start();
        }
    }
}
