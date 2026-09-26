package kr.hyunuk.vocab3;

/** v2.34 음성 인식 구간 잇기 (안드로이드 의존 없음 — main() 이 자체 검사: java -ea -cp build/classes kr.hyunuk.vocab3.SttText). */
final class SttText {
    private SttText() { }

    static String join(String a, String b) {
        if (a == null || a.length() == 0) return b == null ? "" : b;
        if (b == null || b.length() == 0) return a;
        return a + " " + b;
    }

    private static String norm(String w) { return w.toLowerCase().replaceAll("[^a-z0-9']", ""); }

    /** 구간 확정 결과 fin + 그 구간의 마지막 부분 결과 part → 꼬리 단어를 잃지 않은 한 문장.
     *  ■ 직후의 확정 결과는 끝 단어를 떨어뜨리거나 다듬어(by→buy) 부분 결과와 앞머리가 달라지기도 한다. */
    static String merge(String fin, String part) {
        fin = fin == null ? "" : fin.trim();
        part = part == null ? "" : part.trim();
        if (part.length() > fin.length() && (fin.length() == 0 || part.toLowerCase().startsWith(fin.toLowerCase()))) return part;
        if (fin.length() == 0) return part;
        String[] f = fin.split("\\s+"), p = part.split("\\s+");
        String last = norm(f[f.length - 1]);
        if (last.length() == 0) return fin;
        // 확정 결과의 마지막 단어 뒤에 부분 결과가 더 들은 것만 붙인다 — 끝 단어 자리보다 앞에서 찾으면 문장 가운데("What do you do" 의 첫 do)와 맞아 꼬리가 두 번 붙는다
        for (int i = p.length - 2; i >= Math.max(0, f.length - 1); i--) if (norm(p[i]).equals(last)) {
            StringBuilder sb = new StringBuilder(fin.replaceAll("[.?!,]+$", ""));
            for (int j = i + 1; j < p.length; j++) sb.append(' ').append(p[j]);
            return sb.toString();
        }
        return fin;
    }

    public static void main(String[] a) {
        check(merge("I'd like a latte.", "I'd like a latte please"), "I'd like a latte please");
        check(merge("I want to buy a", "I want to by a coffee"), "I want to buy a coffee");
        check(merge("I'm gonna go", "I'm going to go"), "I'm gonna go");
        check(merge("I am 25 years", "I am twenty five years"), "I am 25 years");
        check(merge("Can I get", "Can I get a latte"), "Can I get a latte");
        check(merge("", "hello there"), "hello there");
        check(merge("hello there", ""), "hello there");
        check(merge("What do you want to do", "what do you want to do"), "What do you want to do");
        check(merge("What do you want to do", "what do you want to"), "What do you want to do");
        check(merge("What do you do", "what do you do for fun"), "what do you do for fun");
        check(merge("Yes, yes", "yes yes"), "Yes, yes");
        check(join("", "a"), "a");
        check(join("a", "b"), "a b");
        System.out.println("ok");
    }

    private static void check(String got, String want) { if (!got.equals(want)) throw new AssertionError(got + " != " + want); }
}
