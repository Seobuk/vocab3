package kr.hyunuk.vocab3;

import android.media.AudioFormat;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.os.Build;
import android.util.Base64;
import android.webkit.WebResourceResponse;

import org.json.JSONObject;
import org.schabi.newpipe.extractor.NewPipe;
import org.schabi.newpipe.extractor.downloader.Downloader;
import org.schabi.newpipe.extractor.downloader.Request;
import org.schabi.newpipe.extractor.downloader.Response;
import org.schabi.newpipe.extractor.services.youtube.YoutubeParsingHelper;
import org.schabi.newpipe.extractor.stream.AudioStream;
import org.schabi.newpipe.extractor.stream.AudioTrackType;
import org.schabi.newpipe.extractor.stream.DeliveryMethod;
import org.schabi.newpipe.extractor.stream.StreamInfo;
import org.schabi.newpipe.extractor.stream.VideoStream;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * v2.14 오프라인 영상: 유튜브 360p 한 파일 받기(NewPipeExtractor) · 소리 크기(파형) 뽑기 · https://<앱>/media/<vid> 서빙.
 * 파일은 noBackupFilesDir/videos — 앱 전용이고 자동 백업(25MB 한도)에 안 들어간다 (넘으면 단어장 백업까지 멈춤).
 * JS 콜백: window.onYtDl(vid, st, a, b) · window.onMediaEnv(vid). 받기는 안드로이드 13+ (추출기가 API 33 메서드를 쓴다).
 */
final class Offline {
    static final Pattern VID = Pattern.compile("[A-Za-z0-9_-]{11}");
    private static final Pattern RANGE = Pattern.compile("bytes=(\\d{0,15})-(\\d{0,15})");

    private final MainActivity a;
    private final File dir;
    private final ExecutorService envq = Executors.newSingleThreadExecutor();   // 파형은 하나씩 차례대로
    private volatile Job job;          // 지금 받는 것 — 한 번에 하나 (줄 세우기는 JS 가)
    private volatile boolean closed;

    Offline(MainActivity a) {
        this.a = a;
        dir = new File(a.getNoBackupFilesDir(), "videos");
        dir.mkdirs();
        File[] fs = dir.listFiles();
        if (fs != null) for (File f : fs) {
            String n = f.getName(), vid = doneVid(n);
            if (n.endsWith(".part") || n.endsWith(".tmp")) f.delete();   // 지난번에 끊긴 것 (이어받기는 안 함 — 스트림 URL 이 바뀐다)
            // ponytail: 파형 뽑다 앱이 죽었으면 다시. 늘 실패하는 파일이면 켤 때마다 백그라운드로 한 번씩 헛돈다
            else if (vid != null && !envFile(vid).isFile()) queueEnv(vid);
        }
    }

    void close() {
        closed = true;
        Job j = job;
        if (j != null) j.stop();
        envq.shutdownNow();
    }

    /* ---------------- 파일 ---------------- */

    private static String doneVid(String name) {
        return name.length() == 15 && (name.endsWith(".mp4") || name.endsWith(".m4a")) && VID.matcher(name.substring(0, 11)).matches()
                ? name.substring(0, 11) : null;
    }

    private File envFile(String vid) { return new File(dir, vid + ".env"); }

    /** 다 받은 파일 (mp4 또는 m4a), 없으면 null. */
    File media(String vid) {
        if (vid == null || !VID.matcher(vid).matches()) return null;
        File f = new File(dir, vid + ".mp4");
        if (f.isFile()) return f;
        f = new File(dir, vid + ".m4a");
        return f.isFile() ? f : null;
    }

    /** {"<vid>":{"kind":"mp4"|"m4a","size":N,"env":bool}} — 다 받은 것만. */
    String list() {
        JSONObject o = new JSONObject();
        File[] fs = dir.listFiles();
        if (fs != null) for (File f : fs) {
            String vid = doneVid(f.getName());
            if (vid == null) continue;
            try {
                o.put(vid, new JSONObject().put("kind", f.getName().substring(12)).put("size", f.length()).put("env", envFile(vid).isFile()));
            } catch (Exception ignored) { }
        }
        return o.toString();
    }

    /** 파형 파일(20ms 마다 한 바이트, 0~100 = dBFS+100)의 base64, 없으면 "". */
    String env(String vid) {
        if (vid == null || !VID.matcher(vid).matches()) return "";
        File f = envFile(vid);
        if (!f.isFile()) return "";
        try {
            byte[] b = new byte[(int) f.length()];
            RandomAccessFile r = new RandomAccessFile(f, "r");
            try { r.readFully(b); } finally { r.close(); }
            return Base64.encodeToString(b, Base64.NO_WRAP);
        } catch (IOException e) {
            return "";
        }
    }

    void delete(String vid) {
        if (vid == null || !VID.matcher(vid).matches()) return;
        cancel(vid);
        for (String ext : new String[]{".mp4", ".m4a", ".env", ".part"}) new File(dir, vid + ext).delete();
    }

    /* ---------------- 받기 ---------------- */

    private void emit(String vid, String st, Object x, Object y) {
        if (closed) return;
        a.runJs("window.onYtDl && window.onYtDl(" + js(vid) + "," + js(st) + "," + js(x) + "," + js(y) + ")");
    }

    private static String js(Object o) {
        if (!(o instanceof String)) return String.valueOf(o);
        String s = (String) o;
        return MainActivity.jsString(s.length() > 200 ? s.substring(0, 200) : s);
    }

    void cancel(String vid) {
        Job j = job;
        if (j != null && j.vid.equals(vid)) j.stop();
    }

    // ponytail: title 은 안 쓴다 (알림·파일 이름에 쓸 일이 생기면 그때)
    void download(final String vid) {
        if (vid == null || !VID.matcher(vid).matches()) { emit(String.valueOf(vid), "fail", "extract", "bad id"); return; }
        if (Build.VERSION.SDK_INT < 33) { emit(vid, "fail", "sdk", "Android 13+"); return; }
        File have = media(vid);
        if (have != null) {   // 이미 있음 → 곧바로 done
            emit(vid, "done", have.getName().substring(12), have.length());
            if (!envFile(vid).isFile()) queueEnv(vid);
            return;
        }
        final Job j;
        synchronized (this) {
            if (job != null) {
                // 같은 영상을 또 부르면 그냥 둔다 — 단 취소된 채 끝나는 중이면 busy (JS 가 5초 뒤 다시 부른다. 조용히 두면 다시 넣은 영상이 안 받아진다)
                if (!job.vid.equals(vid) || job.cancel) emit(vid, "fail", "busy", job.vid);
                return;
            }
            j = job = new Job(vid, dir) {
                @Override void info(String kind, long total) { emit(vid, "info", kind, total); }
                @Override void progress(long got, long total) { emit(vid, "progress", got, total); }
            };
        }
        new Thread(new Runnable() {
            @Override
            public void run() {
                String st = "done";
                Object x, y;
                try {
                    File f = j.run();
                    x = f.getName().substring(12);
                    y = f.length();
                } catch (Fail f) {
                    st = "fail"; x = f.why; y = f.getMessage();
                } catch (Throwable e) {   // 추출기 속 오류(NPE·NoSuchMethodError 등)도 앱을 죽이지 않게
                    st = "fail"; x = "extract"; y = e.toString();
                }
                synchronized (Offline.this) { if (job == j) job = null; }   // 결과를 알리기 전에 비운다 — JS 가 곧바로 다음 것을 부른다
                emit(vid, st, x, y);
                if ("done".equals(st)) queueEnv(vid);
            }
        }, "vocab3-dl").start();
    }

    static final class Fail extends Exception {
        final String why;   // 'network' | 'extract' | 'space' | 'big' | 'cancel' | 'io'
        Fail(String why, String msg) { super(msg == null ? "" : msg); this.why = why; }
    }

    /** 한 영상 받기. 안드로이드 것을 안 써서 PC JVM 에서도 돌려 볼 수 있다. */
    static class Job {
        static final long CHUNK = 10L << 20;        // 10MB 씩 Range 로 (yt-dlp 처럼 — 한 번에 크게 받으면 느려진다)
        static final long SPARE = 200L << 20;       // 받고 나서도 이만큼은 남아 있어야
        static final String WEB_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0";
        private static boolean inited;

        final String vid;
        final File dir;
        volatile boolean cancel;
        private volatile HttpURLConnection conn;

        Job(String vid, File dir) { this.vid = vid; this.dir = dir; }

        void info(String kind, long total) { }
        void progress(long got, long total) { }

        void stop() {
            cancel = true;
            HttpURLConnection c = conn;
            if (c != null) try { c.disconnect(); } catch (Exception ignored) { }   // 막혀 있는 read 를 깨운다
        }

        File run() throws Fail {
            String[] s = pick(vid);   // 몇 초 걸리고 cancel 을 안 본다
            if (cancel) throw new Fail("cancel", "");   // 멈춘 일이 새 일의 같은 <vid>.part 를 비우거나 지우지 않게 — 파일을 열기 전에
            String url = s[0], kind = s[1], ua = ua(url);
            File part = new File(dir, vid + ".part"), done = new File(dir, vid + "." + kind);
            OutputStream out = null;
            boolean ok = false;
            try {
                try { out = new FileOutputStream(part); } catch (IOException e) { throw new Fail("io", e.getMessage()); }
                long got = 0, total = -1, last = 0;
                int tries = 0;
                byte[] buf = new byte[64 * 1024];
                while (total < 0 || got < total) {
                    if (cancel) throw new Fail("cancel", "");
                    HttpURLConnection c = null;
                    try {
                        c = conn = (HttpURLConnection) new URL(url).openConnection();
                        c.setConnectTimeout(15000);
                        c.setReadTimeout(30000);
                        c.setRequestProperty("User-Agent", ua);             // 스트림 URL 을 만든 클라이언트와 같아야 한다 (아니면 403)
                        c.setRequestProperty("Accept-Encoding", "identity");
                        c.setRequestProperty("Range", "bytes=" + got + "-" + ((total < 0 ? got + CHUNK : Math.min(got + CHUNK, total)) - 1));
                        int code = c.getResponseCode();
                        if (code != 206) throw new IOException("HTTP " + code);
                        if (total < 0) {
                            total = total(c.getHeaderField("Content-Range"));
                            if (total <= 0) throw new IOException("no length");
                            if (total > Integer.MAX_VALUE) throw new Fail("big", (total >> 20) + "MB");   // WebView 가 스트림 크기를 int 로 읽어 2GB 넘는 곳은 못 튼다 (serve 의 part())
                            info(kind, total);
                            if (dir.getUsableSpace() < total + SPARE) throw new Fail("space", (total >> 20) + "MB");
                        }
                        long before = got;
                        InputStream in = c.getInputStream();
                        int n;
                        while ((n = in.read(buf)) > 0) {
                            try { out.write(buf, 0, n); } catch (IOException e) { throw new Fail("io", e.getMessage()); }
                            got += n;
                            long now = System.currentTimeMillis();
                            if (now - last >= 500) { last = now; progress(got, total); }
                        }
                        in.close();
                        if (got == before) throw new IOException("empty");
                        tries = 0;
                    } catch (IOException e) {
                        if (cancel) throw new Fail("cancel", "");
                        if (++tries > 3) throw new Fail("network", e.getMessage());
                        try { Thread.sleep(1000L * tries); } catch (InterruptedException ie) { throw new Fail("cancel", ""); }
                    } finally {
                        conn = null;
                        if (c != null) c.disconnect();
                    }
                }
                try { out.close(); out = null; } catch (IOException e) { throw new Fail("io", e.getMessage()); }
                if (cancel) throw new Fail("cancel", "");
                if (!part.renameTo(done)) throw new Fail("io", "rename");
                if (cancel) { done.delete(); throw new Fail("cancel", ""); }   // 지우기와 이름 바꾸기가 겹친 경우
                ok = true;
                return done;
            } finally {
                if (out != null) try { out.close(); } catch (IOException ignored) { }
                if (!ok) part.delete();
            }
        }

        static long total(String contentRange) {   // "bytes 0-1023/35123456" → 35123456
            try { return Long.parseLong(contentRange.substring(contentRange.lastIndexOf('/') + 1).trim()); } catch (Exception e) { return -1; }
        }

        private static synchronized void init() {
            if (!inited) { NewPipe.init(new Dl()); inited = true; }
        }

        /** {스트림 URL, "mp4"|"m4a"} — 360p 이하 중 가장 높은 합쳐진 MPEG-4, 없으면 M4A 오디오(원래 언어 우선, 비트레이트 높은 것). */
        static String[] pick(String vid) throws Fail {
            StreamInfo si;
            try {
                init();
                si = StreamInfo.getInfo("https://www.youtube.com/watch?v=" + vid);
            } catch (IOException e) {
                throw new Fail("network", e.getMessage());
            } catch (Exception e) {
                throw new Fail("extract", e.getClass().getSimpleName() + ": " + e.getMessage());
            }
            VideoStream bv = null;
            int bh = 0;
            for (VideoStream v : si.getVideoStreams()) {
                int h = height(v.getResolution());
                if (v.getFormat() == org.schabi.newpipe.extractor.MediaFormat.MPEG_4 && v.getDeliveryMethod() == DeliveryMethod.PROGRESSIVE_HTTP
                        && v.isUrl() && h <= 360 && h > bh) { bv = v; bh = h; }
            }
            if (bv != null) return new String[]{bv.getContent(), "mp4"};
            AudioStream ba = null;
            for (AudioStream s : si.getAudioStreams()) {
                if (s.getFormat() == org.schabi.newpipe.extractor.MediaFormat.M4A && s.getDeliveryMethod() == DeliveryMethod.PROGRESSIVE_HTTP
                        && s.isUrl() && (ba == null || score(s) > score(ba))) ba = s;
            }
            if (ba != null) return new String[]{ba.getContent(), "m4a"};
            throw new Fail("extract", "no 360p mp4 / m4a");
        }

        static int height(String res) {   // "360p" · "360p60" → 360
            Matcher m = Pattern.compile("^(\\d{2,4})").matcher(res == null ? "" : res);
            return m.find() ? Integer.parseInt(m.group(1)) : 0;
        }

        private static long score(AudioStream s) {   // 자동 더빙 트랙보다 원래 소리
            AudioTrackType t = s.getAudioTrackType();
            return ((t == null || t == AudioTrackType.ORIGINAL) ? 1L << 32 : 0) + s.getAverageBitrate();
        }

        /** 스트림 URL 의 c= 로 클라이언트를 알아내 그 User-Agent 를 쓴다. */
        static String ua(String u) {
            if (YoutubeParsingHelper.isAndroidStreamingUrl(u)) return YoutubeParsingHelper.getAndroidUserAgent(null);
            if (YoutubeParsingHelper.isIosStreamingUrl(u)) return YoutubeParsingHelper.getIosUserAgent(null);
            if (YoutubeParsingHelper.isVisionOsStreamingUrl(u)) return YoutubeParsingHelper.getVisionOsUserAgent(null);
            return WEB_UA;
        }
    }

    /** NewPipeExtractor 가 쓰는 HTTP — 요청 헤더 그대로, 응답 헤더·본문·최종 URL. */
    static final class Dl extends Downloader {
        @Override
        public Response execute(Request req) throws IOException {
            HttpURLConnection c = (HttpURLConnection) new URL(req.url()).openConnection();
            try {
                c.setConnectTimeout(15000);
                c.setReadTimeout(30000);
                c.setRequestMethod(req.httpMethod());
                c.setRequestProperty("User-Agent", Job.WEB_UA);   // NewPipe 앱처럼 기본은 브라우저 UA, 요청에 있으면 그걸로
                for (Map.Entry<String, List<String>> h : req.headers().entrySet()) {
                    boolean first = true;
                    for (String v : h.getValue()) {
                        if (first) c.setRequestProperty(h.getKey(), v); else c.addRequestProperty(h.getKey(), v);
                        first = false;
                    }
                }
                byte[] body = req.dataToSend();
                if (body != null) {
                    c.setDoOutput(true);
                    OutputStream o = c.getOutputStream();
                    o.write(body);
                    o.close();
                }
                int code = c.getResponseCode();
                InputStream is = code >= 400 ? c.getErrorStream() : c.getInputStream();
                ByteArrayOutputStream bo = new ByteArrayOutputStream();
                if (is != null) {
                    byte[] b = new byte[8192];
                    int n;
                    while ((n = is.read(b)) > 0) bo.write(b, 0, n);
                    is.close();
                }
                return new Response(code, c.getResponseMessage(), c.getHeaderFields(), bo.toString("UTF-8"), c.getURL().toString());
            } finally {
                c.disconnect();
            }
        }
    }

    /* ---------------- 파형 ---------------- */

    private void queueEnv(final String vid) {
        if (closed) return;
        try {
            envq.execute(new Runnable() {
                @Override
                public void run() {
                    try {
                        android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_BACKGROUND);
                        File m = media(vid);
                        if (m == null) return;
                        byte[] e = envelope(m.getPath());
                        File tmp = new File(dir, vid + ".env.tmp");
                        FileOutputStream o = new FileOutputStream(tmp);
                        try { o.write(e); } finally { o.close(); }
                        if (media(vid) == null || !tmp.renameTo(envFile(vid))) { tmp.delete(); return; }   // 그새 지워졌으면 버린다
                        if (!closed) a.runJs("window.onMediaEnv && window.onMediaEnv(" + MainActivity.jsString(vid) + ")");
                    } catch (Throwable ignored) {
                        // 파형이 없어도 앱은 AI 시간으로 그대로 돈다
                    }
                }
            });
        } catch (Exception ignored) { }   // close() 뒤
    }

    /** 오디오 트랙을 디코드해 20ms(50/초) 마다 모노 RMS → dBFS → clamp(round(dBFS+100), 0, 100) 한 바이트. */
    /**
     * v2.23: 받은 파일의 소리 [a, b)초를 AAC ADTS 바이트로 — 다시 인코딩하지 않고 샘플을 그대로 잘라 7바이트 머리만 붙인다.
     * 긴 영상 정리는 이 소리를 10분씩 Gemini 에 보낸다 (유튜브 링크는 구간을 잘라도 소리는 영상 전체가 들어가 몇 분씩 걸렸다).
     * a 가 파일 끝 뒤면 null. 소리가 AAC 가 아니면 IOException.
     */
    static byte[] adts(String path, double a, double b) throws IOException {
        MediaExtractor ex = new MediaExtractor();
        try {
            ex.setDataSource(path);
            MediaFormat fmt = null;
            for (int i = 0; i < ex.getTrackCount() && fmt == null; i++) {
                MediaFormat f = ex.getTrackFormat(i);
                String mime = f.getString(MediaFormat.KEY_MIME);
                if (mime != null && mime.startsWith("audio/")) { ex.selectTrack(i); fmt = f; }
            }
            if (fmt == null) throw new IOException("no audio track");
            if (!"audio/mp4a-latm".equals(fmt.getString(MediaFormat.KEY_MIME))) throw new IOException("not aac");
            int rate = fmt.getInteger(MediaFormat.KEY_SAMPLE_RATE), chn = fmt.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
            int prof = 1, fi = freqIndex(rate), ch = Math.max(1, Math.min(7, chn));
            ByteBuffer csd = fmt.containsKey("csd-0") ? fmt.getByteBuffer("csd-0") : null;
            if (csd != null && csd.remaining() >= 2) {   // AudioSpecificConfig: 객체 5비트 · 주파수 4비트 · 채널 4비트
                int c0 = csd.get(csd.position()) & 0xFF, c1 = csd.get(csd.position() + 1) & 0xFF;
                int aot = c0 >> 3, f2 = ((c0 & 7) << 1) | (c1 >> 7), c2 = (c1 >> 3) & 15;
                if (aot >= 1 && aot <= 4) prof = aot - 1;
                if (f2 <= 12) fi = f2;
                if (c2 >= 1 && c2 <= 7) ch = c2;
            }
            long aUs = (long) (a * 1e6), bUs = (long) (b * 1e6);
            ex.seekTo(Math.max(0, aUs), MediaExtractor.SEEK_TO_CLOSEST_SYNC);
            ByteBuffer buf = ByteBuffer.allocate(1 << 16);
            ByteArrayOutputStream out = new ByteArrayOutputStream(1 << 21);
            byte[] h = new byte[7], smp = new byte[1 << 12];
            while (true) {
                if (Thread.interrupted()) throw new IOException("interrupted");
                buf.clear();
                int n = ex.readSampleData(buf, 0);
                if (n < 0) break;
                long ts = ex.getSampleTime();
                if (ts >= bUs) break;
                if (ts >= aUs - 50000 && n > 0) {
                    int len = n + 7;
                    h[0] = (byte) 0xFF; h[1] = (byte) 0xF1;   // 동기 · MPEG-4 · CRC 없음
                    h[2] = (byte) ((prof << 6) | (fi << 2) | (ch >> 2));
                    h[3] = (byte) (((ch & 3) << 6) | (len >> 11));
                    h[4] = (byte) ((len >> 3) & 0xFF);
                    h[5] = (byte) (((len & 7) << 5) | 0x1F);
                    h[6] = (byte) 0xFC;
                    if (smp.length < n) smp = new byte[n];
                    buf.limit(n); buf.position(0); buf.get(smp, 0, n);
                    out.write(h, 0, 7); out.write(smp, 0, n);
                }
                ex.advance();
            }
            return out.size() == 0 ? null : out.toByteArray();
        } finally {
            ex.release();
        }
    }

    private static int freqIndex(int rate) {
        int[] r = { 96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350 };
        for (int i = 0; i < r.length; i++) if (r[i] == rate) return i;
        return 4;
    }

    static byte[] envelope(String path) throws IOException {
        MediaExtractor ex = new MediaExtractor();
        MediaCodec dec = null;
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            ex.setDataSource(path);
            MediaFormat fmt = null;
            for (int i = 0; i < ex.getTrackCount() && fmt == null; i++) {
                MediaFormat f = ex.getTrackFormat(i);
                String mime = f.getString(MediaFormat.KEY_MIME);
                if (mime != null && mime.startsWith("audio/")) { ex.selectTrack(i); fmt = f; }
            }
            if (fmt == null) throw new IOException("no audio track");
            dec = MediaCodec.createDecoderByType(fmt.getString(MediaFormat.KEY_MIME));
            dec.configure(fmt, null, null, 0);
            dec.start();
            int rate = fmt.getInteger(MediaFormat.KEY_SAMPLE_RATE), ch = fmt.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
            boolean flt = false, inEos = false, first = true;
            double sum = 0;     // 지금 프레임의 제곱 합 (모노, -1..1)
            int n = 0, idle = 0;
            short[] ss = new short[0];
            float[] fs = new float[0];
            MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
            while (true) {
                if (Thread.interrupted()) throw new IOException("interrupted");   // close()
                if (!inEos) {
                    int ii = dec.dequeueInputBuffer(10000);
                    if (ii >= 0) {
                        int sz = ex.readSampleData(dec.getInputBuffer(ii), 0);
                        if (sz < 0) { dec.queueInputBuffer(ii, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM); inEos = true; }
                        else { dec.queueInputBuffer(ii, 0, sz, ex.getSampleTime(), 0); ex.advance(); }
                    }
                }
                int oi = dec.dequeueOutputBuffer(info, 10000);
                if (oi == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    MediaFormat of = dec.getOutputFormat();
                    rate = of.getInteger(MediaFormat.KEY_SAMPLE_RATE);
                    ch = of.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
                    flt = of.containsKey(MediaFormat.KEY_PCM_ENCODING) && of.getInteger(MediaFormat.KEY_PCM_ENCODING) == AudioFormat.ENCODING_PCM_FLOAT;
                } else if (oi >= 0) {
                    idle = 0;
                    if (first && info.size > 0) {   // 첫 소리가 0초가 아니면 그만큼 빈 프레임으로 맞춘다
                        first = false;
                        for (long k = Math.round(info.presentationTimeUs / 20000.0); k > 0; k--) out.write(0);
                    }
                    ByteBuffer ob = dec.getOutputBuffer(oi);
                    if (ob != null && info.size > 0 && ch > 0) {
                        ob.position(info.offset);
                        ob.limit(info.offset + info.size);
                        ob = ob.slice().order(ByteOrder.nativeOrder());
                        int per = Math.max(1, rate / 50), cnt;
                        if (flt) {
                            cnt = info.size / 4;
                            if (fs.length < cnt) fs = new float[cnt];
                            ob.asFloatBuffer().get(fs, 0, cnt);
                        } else {
                            cnt = info.size / 2;
                            if (ss.length < cnt) ss = new short[cnt];
                            ob.asShortBuffer().get(ss, 0, cnt);
                        }
                        for (int i = 0; i + ch <= cnt; i += ch) {
                            double v = 0;
                            for (int c = 0; c < ch; c++) v += flt ? fs[i + c] : ss[i + c] / 32768.0;
                            v /= ch;
                            sum += v * v;
                            if (++n >= per) { out.write(db(sum / n)); sum = 0; n = 0; }
                        }
                    }
                    dec.releaseOutputBuffer(oi, false);
                    if ((info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) break;
                } else if (inEos && ++idle > 500) {
                    break;   // 끝 표시를 안 주는 디코더 (5초)
                }
            }
            if (n > 0) out.write(db(sum / n));
        } finally {
            if (dec != null) {
                try { dec.stop(); } catch (Exception ignored) { }
                dec.release();
            }
            ex.release();
        }
        return out.toByteArray();
    }

    static int db(double meanSquare) {   // 10·log10(평균 제곱) = 20·log10(RMS)
        double d = meanSquare > 0 ? 10 * Math.log10(meanSquare) : -100;
        return (int) Math.max(0, Math.min(100, Math.round(d + 100)));
    }

    /* ---------------- 서빙 ---------------- */

    /** Range 헤더 → {from, to}. 없거나 못 읽으면 null(전체 200), from > to 면 416. */
    static long[] range(String h, long len) {
        Matcher m = h == null ? null : RANGE.matcher(h.trim());
        if (m == null || !m.matches() || (m.group(1).length() == 0 && m.group(2).length() == 0)) return null;
        long from, to = len - 1;
        if (m.group(1).length() == 0) {   // bytes=-N : 끝에서 N (N=0 은 만족 못 함)
            long k = Long.parseLong(m.group(2));
            from = k == 0 ? len : Math.max(0, len - k);
        } else {
            from = Long.parseLong(m.group(1));
            if (m.group(2).length() > 0) to = Math.min(to, Long.parseLong(m.group(2)));
        }
        return new long[]{from, to};
    }

    /** https://<앱>/media/<vid> — 받은 파일을 Range 지원으로 (video 태그가 seek 할 때 206 을 요구한다). */
    WebResourceResponse serve(String vid, Map<String, String> reqHeaders) {
        Map<String, String> h = new HashMap<String, String>();
        File f = media(vid);
        try {
            if (f == null) throw new IOException("no file");
            String mime = f.getName().endsWith(".m4a") ? "audio/mp4" : "video/mp4";
            long len = f.length();
            String rh = null;
            if (reqHeaders != null) for (Map.Entry<String, String> e : reqHeaders.entrySet()) if ("range".equalsIgnoreCase(e.getKey())) rh = e.getValue();
            long[] r = range(rh, len);
            h.put("Accept-Ranges", "bytes");
            if (r == null) {
                h.put("Content-Length", String.valueOf(len));
                return new WebResourceResponse(mime, null, 200, "OK", h, new FileInputStream(f));
            }
            if (r[0] > r[1]) {
                h.put("Content-Range", "bytes */" + len);
                return new WebResourceResponse(mime, null, 416, "Range Not Satisfiable", h, new ByteArrayInputStream(new byte[0]));
            }
            h.put("Content-Range", "bytes " + r[0] + "-" + r[1] + "/" + len);
            h.put("Content-Length", String.valueOf(r[1] - r[0] + 1));
            FileInputStream in = new FileInputStream(f);
            in.getChannel().position(r[0]);
            return new WebResourceResponse(mime, null, 206, "Partial Content", h, part(in, r[0], r[1] - r[0] + 1));
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
        }
    }

    /**
     * from 자리에 놓인 스트림에서 n 바이트만. WebView 는 앱이 준 스트림에도 요청의 Range 를 다시 적용한다
     * (available() 을 전체 크기로 보고 Content-Length 를 셈 → skip(from)) — 그대로 두면 2·from 부터 읽혀 영상이 깨진다 (에뮬레이터 WebView 113 실측).
     * 그래서 available() 은 파일 처음부터 센 크기(from + 남은 것), skip 은 이미 그 자리라 건너뛴 척만 — WebView 가 안 건너뛰는 버전이어도 맞다.
     */
    private static InputStream part(InputStream in, final long from, final long n) {
        return new FilterInputStream(in) {
            long left = n;
            @Override public int available() { return (int) Math.min(Integer.MAX_VALUE, from + left); }   // WebView 가 skip 전에 한 번 부른다
            @Override public long skip(long k) { return k; }
            @Override public int read() throws IOException {
                if (left <= 0) return -1;
                int b = super.read();
                if (b >= 0) left--;
                return b;
            }
            @Override public int read(byte[] b, int off, int len) throws IOException {
                if (left <= 0) return -1;
                int r = super.read(b, off, (int) Math.min(len, left));
                if (r > 0) left -= r;
                return r;
            }
        };
    }
}
