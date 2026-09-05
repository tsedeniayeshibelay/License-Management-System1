import java.security.*;
import java.util.Base64;

public class KeyGen {
    public static void main(String[] args) throws Exception {
        KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("RSA");
        keyPairGenerator.initialize(2048);
        KeyPair keyPair = keyPairGenerator.generateKeyPair();
        
        System.out.println("PRIVATE=" + Base64.getEncoder().encodeToString(keyPair.getPrivate().getEncoded()));
        System.out.println("PUBLIC=" + Base64.getEncoder().encodeToString(keyPair.getPublic().getEncoded()));
    }
}
