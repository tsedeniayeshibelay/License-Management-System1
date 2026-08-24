package com.licensemanagement.backend.util; 
public class TestHmac { 
    public static void main(String[] args) { 
        HmacUtil util = new HmacUtil(); 
        util.setSharedSecret("default-dev-hmac-secret-key-that-should-be-changed"); 
        System.out.println(HmacUtil.computeHmac("test|123|nonce")); 
    } 
}
