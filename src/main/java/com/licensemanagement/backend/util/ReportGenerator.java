package com.licensemanagement.backend.util;
import com.licensemanagement.backend.entity.License;
import com.licensemanagement.backend.entity.Product;
import com.licensemanagement.backend.entity.User;
import com.licensemanagement.backend.repository.LicenseRepository;
import com.licensemanagement.backend.repository.ProductRepository;
import com.licensemanagement.backend.repository.UserRepository;
import com.opencsv.CSVWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.itextpdf.text.*;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
@Component
@RequiredArgsConstructor
public class ReportGenerator {
    private final LicenseRepository licenseRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATE_FORMATTER_DISPLAY = DateTimeFormatter.ofPattern("dd MMM yyyy");
    public void exportLicensesToCSV(OutputStream outputStream) throws Exception {
        List<License> licenses = licenseRepository.findAllWithDetails();
        generateCSV(licenses, outputStream);
    }
    
    public void exportLicensesToCSV(Long companyId, OutputStream outputStream) throws Exception {
        List<License> licenses = licenseRepository.findByCompanyIdWithDetails(companyId);
        generateCSV(licenses, outputStream);
    }
    
    private void generateCSV(List<License> licenses, OutputStream outputStream) throws Exception {
        try (OutputStreamWriter streamWriter = new OutputStreamWriter(outputStream);
             CSVWriter csvWriter = new CSVWriter(streamWriter)) {
             
            String[] header = {"License Key", "Product", "Customer", "License Type", "Status", "Issued Date", "Expiry Date"};
            csvWriter.writeNext(header);
            
            for (License license : licenses) {
                Product product = license.getProduct();
                User customer = license.getUser();
                String[] row = {
                        license.getLicenseKey(),
                        product != null ? product.getName() : "N/A",
                        customer != null ? customer.getFullName() : "N/A",
                        license.getLicenseType().name(),
                        license.getStatus(),
                        license.getIssuedDate().format(DATE_FORMATTER),
                        license.getExpiryDate().format(DATE_FORMATTER)
                };
                csvWriter.writeNext(row);
            }
        }
    }
    
    public void exportLicensesToPDF(OutputStream outputStream) throws Exception {
        List<License> licenses = licenseRepository.findAllWithDetails();
        generatePDF(licenses, "All Licenses Report", outputStream);
    }
    
    public void exportLicensesToPDF(Long companyId, OutputStream outputStream) throws Exception {
        List<License> licenses = licenseRepository.findByCompanyIdWithDetails(companyId);
        generatePDF(licenses, "Company Licenses Report", outputStream);
    }
    
    private void generatePDF(List<License> licenses, String title, OutputStream outputStream) throws Exception {
        Document document = new Document(PageSize.A4.rotate());
        PdfWriter.getInstance(document, outputStream);
        document.open();
        
        Font titleFont = new Font(Font.FontFamily.HELVETICA, 18, Font.BOLD);
        Paragraph titleParagraph = new Paragraph(title, titleFont);
        titleParagraph.setAlignment(Element.ALIGN_CENTER);
        titleParagraph.setSpacingAfter(20);
        document.add(titleParagraph);
        
        Font dateFont = new Font(Font.FontFamily.HELVETICA, 10, Font.ITALIC);
        Paragraph dateParagraph = new Paragraph("Generated on: " + LocalDate.now().format(DATE_FORMATTER_DISPLAY), dateFont);
        dateParagraph.setAlignment(Element.ALIGN_RIGHT);
        dateParagraph.setSpacingAfter(20);
        document.add(dateParagraph);
        
        PdfPTable table = new PdfPTable(7);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10);
        table.setSpacingAfter(10);
        
        float[] columnWidths = {2, 3, 3, 2, 2, 2, 2};
        table.setWidths(columnWidths);
        
        Font headerFont = new Font(Font.FontFamily.HELVETICA, 12, Font.BOLD, BaseColor.WHITE);
        String[] headers = {"License Key", "Product", "Customer", "Type", "Status", "Issued", "Expiry"};
        for (String header : headers) {
            PdfPCell headerCell = new PdfPCell(new Phrase(header, headerFont));
            headerCell.setBackgroundColor(new BaseColor(41, 128, 185));
            headerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            headerCell.setPadding(8);
            table.addCell(headerCell);
        }
        
        Font dataFont = new Font(Font.FontFamily.HELVETICA, 10, Font.NORMAL);
        for (License license : licenses) {
            Product product = license.getProduct();
            User customer = license.getUser();
            
            PdfPCell cell = new PdfPCell(new Phrase(license.getLicenseKey(), dataFont));
            cell.setPadding(6);
            table.addCell(cell);
            
            cell = new PdfPCell(new Phrase(product != null ? product.getName() : "N/A", dataFont));
            cell.setPadding(6);
            table.addCell(cell);
            
            cell = new PdfPCell(new Phrase(customer != null ? customer.getFullName() : "N/A", dataFont));
            cell.setPadding(6);
            table.addCell(cell);
            
            cell = new PdfPCell(new Phrase(license.getLicenseType().name(), dataFont));
            cell.setPadding(6);
            table.addCell(cell);
            
            String status = license.getStatus();
            BaseColor statusColor;
            if ("ACTIVE".equals(status)) {
                statusColor = new BaseColor(46, 204, 113);
            } else if ("NOT_ACTIVATED".equals(status)) {
                statusColor = new BaseColor(241, 196, 15);
            } else if ("EXPIRED".equals(status)) {
                statusColor = new BaseColor(231, 76, 60);
            } else if ("REVOKED".equals(status)) {
                statusColor = new BaseColor(192, 57, 43);
            } else {
                statusColor = new BaseColor(149, 165, 166);
            }
            cell = new PdfPCell(new Phrase(status, dataFont));
            cell.setBackgroundColor(statusColor);
            cell.setPadding(6);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cell);
            
            cell = new PdfPCell(new Phrase(license.getIssuedDate().format(DATE_FORMATTER_DISPLAY), dataFont));
            cell.setPadding(6);
            table.addCell(cell);
            
            cell = new PdfPCell(new Phrase(license.getExpiryDate().format(DATE_FORMATTER_DISPLAY), dataFont));
            cell.setPadding(6);
            table.addCell(cell);
        }
        document.add(table);
        
        Font footerFont = new Font(Font.FontFamily.HELVETICA, 8, Font.ITALIC, BaseColor.GRAY);
        Paragraph footer = new Paragraph("Total Licenses: " + licenses.size(), footerFont);
        footer.setAlignment(Element.ALIGN_CENTER);
        footer.setSpacingBefore(10);
        document.add(footer);
        
        document.close();
    }
    public Map<String, Object> generateLicenseReport() {
        Map<String, Object> report = new HashMap<>();
        List<License> allLicenses = licenseRepository.findAll();
        List<License> activeLicenses = licenseRepository.findByStatus("ACTIVE");
        List<License> expiredLicenses = licenseRepository.findByExpiryDateBefore(LocalDate.now());
        List<License> notActivatedLicenses = licenseRepository.findByStatus("NOT_ACTIVATED");
        List<License> revokedLicenses = licenseRepository.findByStatus("REVOKED");
        report.put("totalLicenses", allLicenses.size());
        report.put("activeLicenses", activeLicenses.size());
        report.put("expiredLicenses", expiredLicenses.size());
        report.put("notActivatedLicenses", notActivatedLicenses.size());
        report.put("revokedLicenses", revokedLicenses.size());
        report.put("generatedAt", LocalDate.now().toString());
        return report;
    }
}