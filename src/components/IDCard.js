'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getIdCardTemplateImageSrc,
  getQrSlotPercentStyle,
  getScaledQrPlacement,
} from '@/lib/idCardTemplateSettings';
import { useIdCardSettingsFromStorage } from '@/hooks/useIdCardSettingsFromStorage';
import { formatAttendeeSquadDisplay } from '@/lib/formatAttendeeSquadDisplay';

export default function IDCard({ attendee }) {
  const [downloading, setDownloading] = useState(false);
  const settings = useIdCardSettingsFromStorage();

  const [imageSize, setImageSize] = useState({ width: 674, height: 1024 });

  const qrSlotStyle = useMemo(
    () =>
      getQrSlotPercentStyle(
        getScaledQrPlacement(settings, imageSize.width, imageSize.height),
        imageSize.width,
        imageSize.height
      ),
    [settings, imageSize]
  );

  const previewPlacement = useMemo(
    () => getScaledQrPlacement(settings, imageSize.width, imageSize.height),
    [settings, imageSize]
  );

  const previewSlotPercent = useMemo(() => ({
    leftPct: previewPlacement.qrX / imageSize.width,
    topPct: previewPlacement.qrY / imageSize.height,
    sizePct: previewPlacement.qrWidth / imageSize.width,
  }), [previewPlacement, imageSize]);

  const qrEncodeValue = String(
    attendee.ticketNumber != null ? attendee.ticketNumber : attendee.registrationId
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCard = async () => {
    if (downloading) return;

    try {
      setDownloading(true);
      const res = await fetch('/api/id-card-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: attendee.registrationId,
          qrValue: qrEncodeValue,
          settings,
          placement: previewPlacement,
          slotPercent: previewSlotPercent,
        }),
      });

      if (!res.ok) {
        throw new Error('Download failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `id-card-${qrEncodeValue}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      window.alert('Unable to generate card image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="id-card-container">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="id-card id-card-template"
        id="printable-card"
      >
        <img
          src={getIdCardTemplateImageSrc(settings.templateFile)}
          alt="MileZero ID template"
          className="id-template-image"
          onLoad={(event) => {
            const img = event.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
            }
          }}
        />
        <div className="id-template-qr-slot" style={qrSlotStyle}>
          <div className="id-template-qr-inner">
            <QRCodeSVG 
              value={qrEncodeValue}
              size={previewPlacement.qrWidth}
              level="H"
              includeMargin={false}
            />
          </div>
        </div>
      </motion.div>

      <div className="print-actions">
        <button onClick={handleDownloadCard} className="print-btn" disabled={downloading}>
          {downloading ? 'Generating...' : 'Download Card PNG'}
        </button>
        <button onClick={handlePrint} className="print-btn">
          <Printer size={20} /> Print / Save PDF
        </button>
        <Link href="/settings" className="print-btn">Template Settings</Link>
      </div>
      
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
        {attendee.fullName} · {formatAttendeeSquadDisplay(attendee)} SQUAD · Ticket #{qrEncodeValue} ·{' '}
        {attendee.registrationId}
      </p>
    </div>
  );
}
