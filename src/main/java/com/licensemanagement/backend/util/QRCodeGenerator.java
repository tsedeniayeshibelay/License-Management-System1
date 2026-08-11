package com.licensemanagement.backend.util;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.entity.User;
import org.springframework.stereotype.Component;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
@Component
public class QRCodeGenerator {
    public byte[] generateQRCode(String text, int width, int height) throws WriterException, IOException {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
        return outputStream.toByteArray();
    }
    public byte[] generateActivationQRCode(String licenseKey, String baseUrl)
            throws WriterException, IOException {
        String qrData = baseUrl + "/api/licenses/activate?key=" + licenseKey;
        return generateQRCode(qrData, 300, 300);
    }
    public byte[] generateQRCodeImage(String text, int width, int height) throws Exception {
        return generateQRCode(text, width, height);
    }
}