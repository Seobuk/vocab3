package kr.hyunuk.vocab3;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
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
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import android.widget.Toast;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.math.BigInteger;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.HashMap;
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
    private boolean sttListening = false;   // 사용자가 멈추라고 할 때까지 계속 듣는 중
    private boolean sttActive = false;      // startListening ~ onResults/onError 사이
    private String sttText = "";            // 끊긴 구간들을 이어 붙인 문장
    private int sttSilent = 0;              // 연속으로 아무 말 없던 구간 수
    private String sttSegPartial = "";     // 지금 듣는 구간의 마지막 부분 인식 결과 (확정 결과가 꼬리를 잘라 먹으면 이걸로 보충)
    private int sttSeq = 0;                 // 지연 stopListening 이 옛 구간에 적용되지 않게
    private Offline off;                    // v2.14 오프라인 영상 (받기·파형·/media/ 서빙)

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
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (!"https".equals(u.getScheme()) || !getPackageName().equals(u.getHost())) return null;
                String p = u.getPath();
                if (p != null && p.startsWith("/media/")) return off.serve(p.substring(7), req.getRequestHeaders());
                return asset(u, req.isForMainFrame());
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (!req.isForMainFrame() || getPackageName().equals(u.getHost())) return false;
                // 유튜브 플레이어의 로고·제목 링크가 앱 화면을 덮어쓰지 않게 밖(유튜브 앱·브라우저)에서 연다 — 웹 링크만
                String sc = u.getScheme();
                if ("https".equals(sc) || "http".equals(sc)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u).addCategory(Intent.CATEGORY_BROWSABLE)); } catch (Exception ignored) { }
                }
                return true;
            }
            @Override
            public void onPageStarted(WebView v, String url, Bitmap favicon) {
                // 우리 페이지가 아닌 게 최상위에 뜨면(예: 프레임의 POST 이동) 뒤로가기를 그 페이지에 맡기지 않는다 → 앱 종료로 빠져나옴
                if (url == null || !url.startsWith("https://" + getPackageName() + "/")) backHandled = false;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public Bitmap getDefaultVideoPoster() {   // 받은 영상 재생 전의 커다란 회색 ▶ 그림 — <video poster> 로는 안 가려져서 투명 1x1 로 (v2.21)
                return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
            }
        });
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
        // file:// 은 Referer 를 안 보내 유튜브 임베드가 오류 153 → 앱 자산을 https://<앱 ID>/ 로 서빙 (YouTube RMF 의 Referer 형식)
        // 호스트를 appassets.androidplatform.net 이 아니라 앱 ID 로 쓰는 건 일부러 — YouTube 가 Referer 도메인으로 앱 ID 를 요구한다.
        // 이 호스트 요청은 전부 asset() 이 가로채므로(없는 경로도 404) 네트워크·DNS 로 나가지 않는다.
        off = new Offline(this);
        web.loadUrl("https://" + getPackageName() + "/index.html");
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

    // 브리지는 유튜브 iframe(과 그 안의 광고 프레임)에도 주입된다 → 우리 index.html 에만 심은 토큰이 있어야 동작
    private final String bt = new BigInteger(130, new SecureRandom()).toString(32);
    private boolean ok(String t) { return bt.equals(t); }

    private WebResourceResponse asset(Uri u, boolean mainFrame) {
        String p = u.getPath();
        if (p == null || p.length() < 2) p = "/index.html";
        try {
            // 우리 앱은 자기 자신을 프레임에 넣지 않는다 → 프레임·fetch 로 온 index.html 은 404 (광고 프레임이 토큰 든 복사본을 띄우지 못하게)
            if (p.equals("/index.html") && !mainFrame) throw new IOException("not main frame");
            InputStream is = getAssets().open(p.substring(1));
            if (p.equals("/index.html")) {
                // 토큰 스크립트는 실행되자마자 스스로 지운다 (나중에 뜨는 스크립트가 DOM 에서 읽지 못하게)
                String html = readAll(is).replace("<head>", "<head><script>window.__bt=\"" + bt + "\";document.currentScript.remove()</script>");
                is = new ByteArrayInputStream(html.getBytes(StandardCharsets.UTF_8));
            }
            return new WebResourceResponse(mime(p), "UTF-8", is);
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
        }
    }

    private static String mime(String p) {
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        String m = URLConnection.guessContentTypeFromName(p);
        return m != null ? m : "application/octet-stream";
    }

    private static String readAll(InputStream is) throws IOException {
        BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        char[] buf = new char[8192];
        int n;
        while ((n = r.read(buf)) > 0) sb.append(buf, 0, n);
        r.close();
        return sb.toString();
    }

    void runJs(final String js) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (web != null) web.evaluateJavascript(js, null);
            }
        });
    }

    static String jsString(String s) {
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
        // 이제 듣기가 저절로 끝나지 않으므로, 앱이 내려가면 마이크를 반드시 놓아 준다
        if (sttListening || sttActive) { cancelStt(); runJs("window.onSttState && window.onSttState('cancel')"); }
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
        if (off != null) off.close();   // 받던 것 멈추고 .part 지움, 파형 작업도 멈춤
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
                    @Override public void onEndOfSpeech() { }   // 한 구간이 끝났을 뿐 — 아직 듣는 중이면 곧 다시 시작한다
                    @Override public void onError(int error) {
                        // 말을 고르느라 쉬면 인식기가 이렇게 끝낸다 → 오류가 아니라 "빈 구간"으로 치고 이어 듣는다
                        if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                                || error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY || error == SpeechRecognizer.ERROR_CLIENT) {
                            sttSegmentDone("");
                            return;
                        }
                        if (!sttListening && !sttActive) return;
                        sttListening = false; sttActive = false; sttText = ""; sttSilent = 0;
                        String code;
                        switch (error) {
                            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: code = "permission"; break;
                            case SpeechRecognizer.ERROR_NETWORK: case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: case SpeechRecognizer.ERROR_SERVER: code = "network"; break;
                            default: code = "error" + error;
                        }
                        runJs("window.onSttError && window.onSttError(" + jsString(code) + ")");
                    }
                    @Override public void onResults(Bundle results) {
                        ArrayList<String> list = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        sttSegmentDone((list != null && !list.isEmpty()) ? list.get(0) : "");
                    }
                    @Override public void onPartialResults(Bundle partial) {
                        if (!sttActive) return;
                        // Google's recognizer splits a partial result in two: the words it is sure about (RESULTS_RECOGNITION)
                        // and the tail it is still deciding on (UNSTABLE_TEXT). Showing only the first half is why the last
                        // few words seemed to appear only after ■ — so show both, and keep both for the end-of-segment fallback.
                        ArrayList<String> list = partial.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        ArrayList<String> unstable = partial.getStringArrayList("android.speech.extra.UNSTABLE_TEXT");
                        String stable = (list != null && !list.isEmpty() && list.get(0) != null) ? list.get(0).trim() : "";
                        String tail = (unstable != null && !unstable.isEmpty() && unstable.get(0) != null) ? unstable.get(0).trim() : "";
                        String shown = sttJoin(stable, tail);
                        if (shown.length() > 0) {
                            sttSegPartial = shown;
                            runJs("window.onSttPartial && window.onSttPartial(" + jsString(sttJoin(sttText, shown)) + ")");
                        }
                    }
                    @Override public void onEvent(int eventType, Bundle params) { }
                });
            }
            if (tts != null) tts.stop();
            sttListening = true; sttText = ""; sttSilent = 0;
            listenSegment();
        } catch (Exception e) {
            sttListening = false; sttActive = false;
            runJs("window.onSttError && window.onSttError(" + jsString("exception") + ")");
        }
    }

    // 인식기는 짧은 침묵만으로도 스스로 끝나 버린다. 그래서 한 번에 한 구간만 듣고,
    // 사용자가 멈추기 전까지는 구간을 이어서 다시 듣는다 (재시작 사이 0.15초는 녹음되지 않음).
    private void listenSegment() {
        try {
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, sttLang);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, sttLang);
            i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
            sttActive = true; sttSegPartial = ""; sttSeq++;
            stt.startListening(i);
        } catch (Exception e) {
            sttActive = false; sttListening = false;
            runJs("window.onSttError && window.onSttError(" + jsString("exception") + ")");
        }
    }

    /** 한 구간의 결과 (빈 문자열 = 그 구간엔 말이 없었음). */
    private void sttSegmentDone(String text) {
        if (!sttListening && !sttActive) return;   // 이미 끝났거나 취소된 세션의 뒤늦은 콜백
        sttActive = false;
        String seg = (text == null) ? "" : text.trim();
        // stopListening() 직후의 확정 결과는 마지막 단어를 떨어뜨리거나 아예 비어 오기도 한다 → 부분 결과가 더 길면 그걸 쓴다
        String part = (sttSegPartial == null) ? "" : sttSegPartial.trim();
        if (part.length() > seg.length() && (seg.length() == 0 || part.toLowerCase().startsWith(seg.toLowerCase()))) seg = part;
        sttSegPartial = "";
        if (seg.length() > 0) { sttText = sttJoin(sttText, seg); sttSilent = 0; } else sttSilent++;
        // ponytail: 계속 조용하면(≈20초) 마이크를 놓는다. 더 오래 쉬고 싶으면 이 숫자만 올리면 됨
        if (sttListening && sttSilent < 4) {
            if (web != null) web.postDelayed(new Runnable() {
                @Override public void run() { if (sttListening && !sttActive) listenSegment(); }
            }, 150);
            return;
        }
        finishStt();
    }

    private void finishStt() {
        sttListening = false; sttActive = false;
        String out = sttText;
        sttText = ""; sttSilent = 0;
        runJs("window.onSttState && window.onSttState('end')");
        runJs("window.onStt && window.onStt(" + jsString(out) + ")");
    }

    private void cancelStt() {
        if (!sttListening && !sttActive) return;
        sttListening = false; sttActive = false; sttText = ""; sttSilent = 0;
        try { if (stt != null) stt.cancel(); } catch (Exception ignored) { }
    }

    private static String sttJoin(String a, String b) {
        if (a == null || a.length() == 0) return b;
        if (b == null || b.length() == 0) return a;
        return a + " " + b;
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
        public String load(String t, String key) {
            if (!ok(t)) return null;   // 토큰 없는 호출(유튜브 iframe·광고 프레임)은 무시
            return prefs.getString(key, null);
        }

        @JavascriptInterface
        public void save(String t, String key, String value) {
            if (!ok(t)) return;
            prefs.edit().putString(key, value).apply();
        }

        @JavascriptInterface
        public void remove(String t, String key) {
            if (!ok(t)) return;
            prefs.edit().remove(key).apply();
        }

        @JavascriptInterface
        public boolean ttsReady(String t) {
            if (!ok(t)) return false;
            return ttsReady;
        }

        @JavascriptInterface
        public void speak(String t, final String text, final String lang, final float rate, final boolean flush) {
            if (!ok(t)) return;
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
        public void stopSpeak(String t) {
            if (!ok(t)) return;
            if (tts != null) tts.stop();
        }

        @JavascriptInterface
        public void vibrate(String t, final int ms) {
            if (!ok(t)) return;
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
        public void toast(String t, final String msg) {
            if (!ok(t)) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void copy(String t, final String text) {
            if (!ok(t)) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("vocab3", text));
                }
            });
        }

        @JavascriptInterface
        public void share(String t, final String title, final String text) {
            if (!ok(t)) return;
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
        public void saveFile(String t, final String name, final String content) {
            if (!ok(t)) return;
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
        public void openFile(String t) {
            if (!ok(t)) return;
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
        public void setBackHandled(String t, boolean b) {
            if (!ok(t)) return;
            backHandled = b;
        }

        /** 유튜브 영상 화면에서만 가로 회전 허용 (시스템 자동 회전 설정을 따른다), 나머지는 세로. */
        @JavascriptInterface
        public void setRotate(String t, final boolean allow) {
            if (!ok(t)) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    int o = allow ? ActivityInfo.SCREEN_ORIENTATION_USER : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;
                    if (getRequestedOrientation() != o) setRequestedOrientation(o);
                }
            });
        }

        @JavascriptInterface
        public void setSystemBars(String t, final String color, final boolean light) {
            if (!ok(t)) return;
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
        public void audioStart(String t, final String playlistJson, final boolean loop) {
            if (!ok(t)) return;
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
        public void audioControl(String t, final String cmd) {
            if (!ok(t)) return;
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
        public String audioState(String t) {
            if (!ok(t)) return null;
            return ReviewService.lastState();
        }

        @JavascriptInterface
        public void exitApp(String t) {
            if (!ok(t)) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try { finishAndRemoveTask(); } catch (Exception e) { finish(); }
                }
            });
        }

        @JavascriptInterface
        public String version(String t) {
            if (!ok(t)) return null;
            return "1.0";
        }

        @JavascriptInterface
        public boolean sttAvailable(String t) {
            if (!ok(t)) return false;
            try { return SpeechRecognizer.isRecognitionAvailable(MainActivity.this); } catch (Exception e) { return false; }
        }

        /** Starts listening (lang e.g. "en-US") and keeps listening across pauses until sttStop();
         *  the joined sentence arrives once via window.onStt (live text via onSttPartial, problems via onSttError). */
        @JavascriptInterface
        public void sttStart(String t, final String lang) {
            if (!ok(t)) return;
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
        public void sttStop(String t) {
            if (!ok(t)) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (!sttListening && !sttActive) return;
                    sttListening = false;
                    if (sttActive) {
                        // 바로 stopListening() 하면 마지막 단어가 잘린다 — 0.8초 안에 끝점 검출로 스스로 끝나면 그 결과를, 아니면 그때 멈춘다
                        final int seq = sttSeq;
                        if (web != null) web.postDelayed(new Runnable() {
                            @Override public void run() {
                                if (sttActive && sttSeq == seq) { try { if (stt != null) stt.stopListening(); } catch (Exception ignored) { } }
                            }
                        }, 800);
                    }
                    else finishStt();   // 구간 재시작 사이라 멈출 세션이 없다 → 모아 둔 문장을 바로 넘긴다
                }
            });
        }

        @JavascriptInterface
        public void sttCancel(String t) {
            if (!ok(t)) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() { cancelStt(); }
            });
        }

        /** Opens a URL in the external browser (used for the API-key help link). */
        @JavascriptInterface
        public void openUrl(String t, final String url) {
            if (!ok(t)) return;
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
        public void aiCall(String t, final String id, final String url, final String key, final String body) {
            if (!ok(t)) return;
            new Thread(new Runnable() {
                @Override
                public void run() {
                    int status = 0;
                    String text = "";
                    HttpURLConnection c = null;
                    try {
                        c = (HttpURLConnection) new URL(url).openConnection();
                        c.setConnectTimeout(15000);
                        c.setReadTimeout(600000);   // 유튜브 영상 받아쓰기(생각 켜기)는 몇 분 걸린다; 기능마다 JS 쪽이 자기 제한 시간을 따로 건다
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

        /* ---- v2.14 오프라인 영상 (Offline.java). 결과: window.onYtDl(vid, st, a, b) · window.onMediaEnv(vid) ---- */

        /** 360p 한 파일 받기 시작 — 안드로이드 13 미만이면 곧바로 fail('sdk'), 다른 게 받는 중이면 fail('busy'). */
        @JavascriptInterface
        public void ytDownload(String t, String vid, String title) {
            if (!ok(t)) return;
            off.download(vid);
        }

        @JavascriptInterface
        public void ytDownloadCancel(String t, String vid) {
            if (!ok(t)) return;
            off.cancel(vid);
        }

        /** {"<vid>":{"kind":"mp4"|"m4a","size":N,"env":true|false}} — 다 받은 것만. */
        @JavascriptInterface
        public String mediaList(String t) {
            if (!ok(t)) return null;
            return off.list();
        }

        @JavascriptInterface
        public void mediaDelete(String t, String vid) {
            if (!ok(t)) return;
            off.delete(vid);
        }

        /** 파형(20ms 마다 0~100 한 바이트)의 base64, 없으면 "". */
        @JavascriptInterface
        public String mediaEnv(String t, String vid) {
            if (!ok(t)) return null;
            return off.env(vid);
        }
    }
}
