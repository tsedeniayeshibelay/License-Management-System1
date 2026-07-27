package com.licensemanagement.backend.util;

public class Base32Util {

    private static final String RFC4648 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    public static String encode(byte[] data) {
        StringBuilder sb = new StringBuilder((data.length * 8 + 4) / 5);
        int buffer = 0;
        int bitsLeft = 0;
        for (byte b : data) {
            buffer <<= 8;
            buffer |= (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                sb.append(RFC4648.charAt((buffer >>> (bitsLeft - 5)) & 0x1F));
                bitsLeft -= 5;
            }
        }
        if (bitsLeft > 0) {
            buffer <<= (5 - bitsLeft);
            sb.append(RFC4648.charAt(buffer & 0x1F));
        }
        return sb.toString();
    }

    public static byte[] decode(String base32) {
        base32 = base32.toUpperCase().replaceAll("-", "");
        byte[] result = new byte[base32.length() * 5 / 8];
        int buffer = 0;
        int bitsLeft = 0;
        int index = 0;
        for (char c : base32.toCharArray()) {
            int val = RFC4648.indexOf(c);
            if (val < 0) throw new IllegalArgumentException("Invalid Base32 character: " + c);
            buffer <<= 5;
            buffer |= val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                result[index++] = (byte) (buffer >>> (bitsLeft - 8));
                bitsLeft -= 8;
            }
        }
        return result;
    }
}
