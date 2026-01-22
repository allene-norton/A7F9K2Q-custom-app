import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import { FORM_TYPE_INFO, type BackgroundCheckFormData } from '@/types';

async function imageToBase64(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = img.width;
      canvas.height = img.height;

      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL('image/png');
        resolve(base64);
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };

    img.onerror = () => {
      reject(new Error('Could not load image'));
    };

    img.src = imagePath;
  });
}

export async function generateCoverLetterPDF(
  formData: BackgroundCheckFormData,
): Promise<Blob> {
  // Convert logo to base64 first
  const logoSrc = `${window.location.origin}/ct-logo.png`;
  let logoBase64 = '';

  try {
    logoBase64 = await imageToBase64(logoSrc);
    console.log('Logo converted to base64 successfully');
  } catch (error) {
    console.error('Failed to convert logo to base64:', error);
    throw new Error(
      'Could not load the required logo image. Please ensure ct-logo.png exists in the public folder.',
    );
  }

  // Create a completely isolated iframe for PDF generation
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    position: fixed !important;
    top: -10000px !important;
    left: -10000px !important;
    width: 800px !important;
    height: 1200px !important;
    border: none !important;
    visibility: hidden !important;
  `;

  document.body.appendChild(iframe);

  try {
    // Wait for iframe to load
    await new Promise((resolve) => {
      iframe.onload = resolve;
      iframe.src = 'about:blank';
    });

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
      throw new Error('Unable to access iframe document');
    }

    // Write the HTML document
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            color: #000000;
            background-color: transparent;
            font-family: Arial, sans-serif;
          }
          body {
            background-color: white;
            font-family: Arial, sans-serif;
            color: #000000;
          }
          .pdf-container {
            width: 754px;
            min-height: 1083px;
            background-color: white;
            padding: 40px;
            box-sizing: content-box;
            font-family: Arial, sans-serif;
            color: #000000;
          }
          .logo-img {
            width: 48px;
            height: 48px;
            border-radius: 8px;
            margin-right: 12px;
          }
        </style>
      </head>
      <body>
        <div class="pdf-container" id="pdf-content">
          <!-- Content will be inserted here -->
        </div>
      </body>
      </html>
    `);
    iframeDoc.close();

    // Wait for document to be ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    const container = iframeDoc.getElementById('pdf-content');
    if (!container) {
      throw new Error('Unable to find PDF container in iframe');
    }

    // Generate the content with base64 embedded logo
    const client = formData.client;
    const formTypeInfo = FORM_TYPE_INFO[formData.formType];
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    container.innerHTML = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <!-- Letterhead -->
        <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 24px; margin-bottom: 32px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <img src="${logoBase64}" alt="CT Logo" class="logo-img">
                <div>
                  <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #111827;">ClearTech</h1>
                  <p style="margin: 0; color: #6b7280;">Background Checks and Security Consulting</p>
                </div>
              </div>
              <h2 style="font-size: 20px; font-weight: bold; margin: 0; color: #111827;">A People-Focused Approach to Screening</h2>
              <p style="font-size: 14px; color: #6b7280; margin: 4px 0;">Contact Us: admin@cleartechbackground.com</p>
            </div>
            <div style="background: ${getStatusColor(formData.status)}; padding: 8px 16px; border-radius: 8px; color: white; font-weight: 600; text-transform: uppercase;">
              ${formData.status}
            </div>
          </div>
        </div>

        <!-- Date and Reference -->
        <div style="display: flex; justify-content: space-between; font-size: 14px; color: #6b7280; margin-bottom: 24px;">
          <span>Date: ${currentDate}</span>
          <span>Reference #: BGC-${formData.client.split('-', 1)}</span>
        </div>

        <!-- Applicant Information -->
        ${
          client
            ? `
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <h3 style="font-weight: 600; color: #111827; margin-bottom: 16px;">Applicant Information</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px;">
              <div>
                <p><strong>Name:</strong> ${formData.identification.firstName} ${formData.identification.lastName}</p>
                <p><strong>Client:</strong> ${formData.identification.firstName}</p>
                <p><strong>Form Type:</strong> ${formTypeInfo.title}</p>
              </div>
              <div>
                <p>${formData.identification.streetAddress}</p>
                ${formData.identification.streetAddress2 ? `<p>${formData.identification.streetAddress2}</p>` : ''}
                <p>${formData.identification.city}, ${formData.identification.state} ${formData.identification.postalCode}</p>
              </div>
            </div>
          </div>
        `
            : ''
        }

        <!-- Letter Body -->
        <div style="line-height: 1.8;">
          <!-- <p>Dear ${formData.identification.firstName} ${formData.identification.lastName},</p> -->
          
          <p>We are pleased to provide you with the results of your background screening conducted by ClearTech
          Background Services. This comprehensive screening was performed in accordance with the requirements for
          the State of Illinois and includes the background checks listed below:</p>

          <!-- Background Checks -->
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <h4 style="font-weight: 600; color: #1e40af; margin-bottom: 12px;">Background Checks Performed</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              ${formData.backgroundChecks
                .map(
                  (check) => `
                <div style="display: flex; align-items: center; font-size: 14px;">
                  <div style="width: 8px; height: 8px; background: #2563eb; border-radius: 50%; margin-right: 8px;"></div>
                  <span style="color: #1e40af;">${check}</span>
                </div>
              `,
                )
                .join('')}
            </div>
          </div>

          <!-- Status Content -->
          ${getStatusContent(formData.status)}

          <!-- Additional Notes -->
          ${
            formData.memo
              ? `
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <h4 style="font-weight: 600; color: #111827; margin-bottom: 8px;">Additional Notes</h4>
              <p style="color: #374151; font-size: 14px; line-height: 1.6;">${formData.memo}</p>
            </div>
          `
              : ''
          }

          <br>
          <p>This background screening was conducted in compliance with the Fair Credit Reporting Act (FCRA) and all
          applicable state and local laws.</p>
          
          <p>If you have any questions about these results or need additional
          information, please contact our office at admin@cleartechbackground.com.</p>
          
          <br>
          <p>Thank you for choosing ClearTech Background Services.</p>

          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p>
              Sincerely,<br><br>
              <strong>ClearTech Admin Team</strong><br>
              <h2 style="font-size: 20px; font-weight: bold; margin: 0; color: #111827;">A People-Focused Approach to Screening</h2>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          <p style="margin-bottom: 8px;">
            <strong>Confidentiality Notice:</strong> This document contains confidential and privileged information. If
            you are not the intended recipient, please notify the sender immediately and destroy this document.
          </p>
        </div>
      </div>
    `;

    // Wait for content to render
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Generate canvas from the clean iframe
    const canvas = await html2canvas(container, {
      scale: 1,
      useCORS: false, // Not needed since we're using base64
      allowTaint: false, // Not needed since we're using base64
      backgroundColor: '#ffffff',
      logging: false,
      foreignObjectRendering: true,
    });

    // Verify canvas
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Failed to generate canvas from HTML content');
    }

    const imgData = canvas.toDataURL('image/png', 1.0);

    if (
      !imgData ||
      imgData === 'data:,' ||
      !imgData.startsWith('data:image/png;base64,')
    ) {
      throw new Error('Failed to generate valid PNG data from canvas');
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const marginMM = 10;
    const availableWidth = pdfWidth - 2 * marginMM;
    const availableHeight = pdfHeight - 2 * marginMM;

    const canvasAspectRatio = canvas.width / canvas.height;
    const availableAspectRatio = availableWidth / availableHeight;

    let finalWidth, finalHeight;

    if (canvasAspectRatio > availableAspectRatio) {
      finalWidth = availableWidth;
      finalHeight = availableWidth / canvasAspectRatio;
    } else {
      finalHeight = availableHeight;
      finalWidth = availableHeight * canvasAspectRatio;
    }

    const xOffset = marginMM + (availableWidth - finalWidth) / 2;
    const yOffset = marginMM + (availableHeight - finalHeight) / 2;

    pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);

    return pdf.output('blob');
  } finally {
    // Clean up iframe
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'cleared':
      return '#059669';
    case 'pending':
      return '#d97706';
    case 'denied':
      return '#dc2626';
    default:
      return '#6b7280';
  }
}

function getStatusContent(status: string): string {
  switch (status) {
    case 'cleared':
      return `<p><strong style="color: #059669;">CLEARED:</strong> The results of this screening <strong>have been successfully completed and cleared</strong>. If you have any questions or would like additional information regarding these results, please contact our office.
</p>`;
    case 'pending':
      return `<p><strong style="color: #d97706;">PENDING:</strong> Your background screening is currently in
      progress. We are awaiting responses from one or more verification sources. We will notify you as soon as
      the screening is complete.</p>`;
    case 'denied':
      return `<p><strong style="color: #dc2626;">DENIED:</strong> Your background screening has revealed information
      that does not meet the required standards for this application. If you believe this information is
      incorrect, please contact us immediately to discuss the dispute process.</p>`;
    default:
      return '';
  }
}

export async function convertImageToPDF(
  imageBlob: Blob,
  fileName?: string,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);

    img.onload = () => {
      try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Calculate dimensions to fit the page while maintaining aspect ratio
        const marginMM = 10; // 10mm margins
        const availableWidth = pdfWidth - 2 * marginMM;
        const availableHeight = pdfHeight - 2 * marginMM;

        const imgAspectRatio = img.width / img.height;
        const availableAspectRatio = availableWidth / availableHeight;

        let finalWidth, finalHeight;

        if (imgAspectRatio > availableAspectRatio) {
          finalWidth = availableWidth;
          finalHeight = availableWidth / imgAspectRatio;
        } else {
          finalHeight = availableHeight;
          finalWidth = availableHeight * imgAspectRatio;
        }

        // Center the image
        const xOffset = marginMM + (availableWidth - finalWidth) / 2;
        const yOffset = marginMM + (availableHeight - finalHeight) / 2;

        // Determine image format for jsPDF
        const format = imageBlob.type.includes('png') ? 'PNG' : 'JPEG';

        pdf.addImage(img, format, xOffset, yOffset, finalWidth, finalHeight);
        const pdfBlob = pdf.output('blob');
        URL.revokeObjectURL(url);
        resolve(pdfBlob);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${fileName || 'unknown'}`));
    };

    img.src = url;
  });
}

export async function processFileForPDF(
  blob: Blob,
  fileName?: string,
): Promise<Blob | null> {
  const mimeType = blob.type;

  if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/octet-stream' ||
    mimeType === 'binary/octet-stream' || // Add this line
    mimeType === '' // Sometimes PDFs have empty MIME type
  ) {
    // Validate PDF files by checking the header
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const pdfHeader = String.fromCharCode(...uint8Array.slice(0, 4));

      if (pdfHeader === '%PDF') {
        console.log(`Valid PDF file: ${fileName || 'unknown'}`);
        return blob;
      } else {
        // If no PDF header, check first few bytes for common file signatures
        const fileSignature = String.fromCharCode(...uint8Array.slice(0, 10));
        console.log(`File signature for ${fileName}:`, fileSignature);

        // Still try to process as PDF if it might be a valid PDF with different structure
        if (uint8Array.length > 1000) {
          // Only try if file has reasonable size
          console.warn(
            `File ${fileName || 'unknown'} may be a PDF without standard header, attempting to process...`,
          );
          return blob;
        }

        console.warn(
          `File ${fileName || 'unknown'} does not appear to be a valid PDF`,
        );
        return null;
      }
    } catch (error) {
      console.error(`Error validating PDF ${fileName}:`, error);
      return null;
    }
  } else if (mimeType.startsWith('image/')) {
    // Convert images to PDF
    try {
      console.log(`Converting image ${fileName} to PDF`);
      return await convertImageToPDF(blob, fileName);
    } catch (error) {
      console.error(
        `Failed to convert image ${fileName || 'unknown'} to PDF:`,
        error,
      );
      return null;
    }
  } else {
    console.warn(
      `Unsupported file type for ${fileName || 'unknown'}: ${mimeType}`,
    );
    return null;
  }
}

export async function mergePDFs(pdfBlobs: Blob[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const blob of pdfBlobs) {
    const arrayBuffer = await blob.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
