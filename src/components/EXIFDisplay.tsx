'use client';

import React, { useMemo, useState } from 'react';
import {
  Button,
  Drawer,
  DrawerToggler,
  useDocumentInfo,
  useField,
  useDrawerSlug,
  usePayloadAPI,
} from '@payloadcms/ui';
import type { JSONFieldClientProps } from 'payload';

interface EXIFFieldValue {
  value?: string[] | string | number[] | number;
  description?: string;
}

interface EXIFData {
  [key: string]: unknown;
  exif?: {
    Make?: { value?: string[] | string; description?: string };
    Model?: { value?: string[] | string; description?: string };
    LensModel?: { value?: string[] | string; description?: string };
    FNumber?: { value?: number[] | number; description?: string };
    ExposureTime?: { value?: number[] | number; description?: string };
    ISOSpeedRatings?: { value?: number; description?: string };
    FocalLength?: { value?: number[] | number; description?: string };
    DateTimeOriginal?: { value?: string[] | string; description?: string };
    Flash?: { value?: number; description?: string };
    WhiteBalance?: { value?: number; description?: string };
    ExposureMode?: { value?: number; description?: string };
    MeteringMode?: { value?: number; description?: string };
    ExposureProgram?: { value?: number; description?: string };
    ExposureBiasValue?: { value?: number[] | number; description?: string };
  };
  xmp?: {
    Lens?: { value?: string; description?: string };
    LensModel?: { value?: string; description?: string };
    WhiteBalance?: { value?: string; description?: string };
    UprightFocalLength35mm?: { value?: string; description?: string };
  };
  composite?: {
    FocalLength35efl?: { value?: number; description?: string };
  };
}

export const EXIFDisplay: React.FC<JSONFieldClientProps> = () => {
  const { value: exifData } = useField<EXIFData | null | undefined>();
  const { id, collectionSlug } = useDocumentInfo();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drawerSlug = useDrawerSlug('exif-raw-data');
  const payloadAPI = usePayloadAPI(process.env.NEXT_PUBLIC_SERVER_URL!);

  // Check if EXIF data is empty object
  const isEmptyObject = useMemo(() => {
    if (!exifData || exifData === null || typeof exifData !== 'object') {
      return false;
    }
    return Object.keys(exifData).length === 0;
  }, [exifData]);

  // Check if EXIF data is undefined or null
  const isUndefinedOrNull = exifData === undefined || exifData === null;

  // Check if EXIF data is full or reduced
  const isFullEXIF = useMemo(() => {
    if (!exifData || exifData === null || typeof exifData !== 'object') {
      return false;
    }

    const data = exifData as Record<string, unknown>;

    // Check for presence of xmp section (strong indicator of full EXIF)
    if (!data.xmp || typeof data.xmp !== 'object') {
      return false;
    }

    // Check for key EXIF fields that indicate full data
    const exif = data.exif;
    if (!exif || typeof exif !== 'object') {
      return false;
    }

    const exifObj = exif as Record<string, unknown>;
    const hasMake = 'Make' in exifObj;
    const hasModel = 'Model' in exifObj;
    const hasFNumber = 'FNumber' in exifObj;
    const hasExposureTime = 'ExposureTime' in exifObj;

    // Full EXIF should have at least some of these key fields
    return hasMake || hasModel || hasFNumber || hasExposureTime;
  }, [exifData]);

  // Memoize the data extraction to prevent unnecessary re-renders
  const { exif, xmp, composite } = useMemo(() => {
    if (!exifData || exifData === null || typeof exifData !== 'object') {
      return { exif: {}, xmp: {}, composite: {} };
    }

    // Safely extract nested objects with defensive checks
    const exifObj =
      exifData && typeof exifData === 'object' && 'exif' in exifData && exifData.exif
        ? exifData.exif
        : {};
    const xmpObj =
      exifData && typeof exifData === 'object' && 'xmp' in exifData && exifData.xmp
        ? exifData.xmp
        : {};
    const compositeObj =
      exifData && typeof exifData === 'object' && 'composite' in exifData && exifData.composite
        ? exifData.composite
        : {};

    return { exif: exifObj, xmp: xmpObj, composite: compositeObj };
  }, [exifData]);

  try {
    const handleGenerateEXIF = async () => {
      if (!id) {
        setError('Document ID not found');
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        // Queue the job using Payload's jobs API
        const response = await fetch('/api/payload-jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskSlug: 'generateImageEXIF',
            queue: 'exif',
            input: {
              id: typeof id === 'string' ? parseInt(id, 10) : id,
              collection: collectionSlug,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || errorData.error || 'Failed to queue EXIF generation job',
          );
        }

        await response.json();

        // Job has been queued successfully
        // Show success message and reload after a short delay to allow the job to process
        // The job will run automatically via the autoRun cron configuration
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to queue EXIF generation job');
        setIsGenerating(false);
      }
    };

    // Helper to extract value from array or direct value
    const getValue = (field: EXIFFieldValue | undefined): string | null => {
      if (!field?.value) return null;
      if (Array.isArray(field.value)) {
        const val = field.value[0];
        return typeof val === 'string' ? val : String(val);
      }
      return typeof field.value === 'string' ? field.value : String(field.value);
    };

    // Helper to extract array value (for fractions like [35, 10])
    const getArrayValue = (field: EXIFFieldValue | undefined): number[] | null => {
      if (!field?.value) return null;
      if (Array.isArray(field.value) && field.value.length >= 2) {
        return field.value as number[];
      }
      return null;
    };

    const formatAperture = (): string | null => {
      const fNumber = exif.FNumber;
      if (!fNumber) return null;

      const arrayValue = getArrayValue(fNumber);
      if (arrayValue) {
        const aperture = arrayValue[0] / arrayValue[1];
        return `f/${aperture.toFixed(1)}`;
      }

      const directValue = typeof fNumber.value === 'number' ? fNumber.value : null;
      if (directValue) {
        return `f/${directValue.toFixed(1)}`;
      }

      return fNumber.description || null;
    };

    const formatShutterSpeed = (): string | null => {
      const exposureTime = exif.ExposureTime;
      if (!exposureTime) return null;

      const arrayValue = getArrayValue(exposureTime);
      if (arrayValue) {
        const time = arrayValue[0] / arrayValue[1];
        if (time >= 1) {
          return `${time.toFixed(0)}s`;
        }
        return `1/${Math.round(1 / time)}s`;
      }

      const directValue = typeof exposureTime.value === 'number' ? exposureTime.value : null;
      if (directValue) {
        if (directValue >= 1) {
          return `${directValue.toFixed(0)}s`;
        }
        return `1/${Math.round(1 / directValue)}s`;
      }

      return exposureTime.description || null;
    };

    const formatISO = (): string | null => {
      const iso = exif.ISOSpeedRatings;
      if (!iso?.value) return null;
      return `ISO ${iso.value}`;
    };

    const formatFocalLength = (): string | null => {
      const focalLength = exif.FocalLength;
      if (!focalLength) return null;

      let mm: number | null = null;
      const arrayValue = getArrayValue(focalLength);
      if (arrayValue) {
        mm = arrayValue[0] / arrayValue[1];
      } else if (typeof focalLength.value === 'number') {
        mm = focalLength.value;
      }

      if (!mm) return focalLength.description || null;

      // Check for 35mm equivalent
      const equiv35mm =
        composite.FocalLength35efl?.value ||
        (xmp.UprightFocalLength35mm?.value ? parseFloat(xmp.UprightFocalLength35mm.value) : null);

      if (equiv35mm && Math.abs(equiv35mm - mm) > 1) {
        return `${Math.round(mm)}mm (${Math.round(equiv35mm)}mm equiv)`;
      }

      return `${Math.round(mm)}mm`;
    };

    const formatDateTime = (): string | null => {
      const dateTime = exif.DateTimeOriginal;
      if (!dateTime) return null;

      const value = getValue(dateTime);
      if (!value) return null;

      // Handle format like "2020:08:13 11:14:09"
      if (typeof value === 'string') {
        const dateMatch = value.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (dateMatch) {
          const [, year, month, day, hour, minute, second] = dateMatch;
          const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
          return date.toLocaleString();
        }
        try {
          const date = new Date(value);
          return date.toLocaleString();
        } catch {
          return value;
        }
      }

      return dateTime.description || null;
    };

    const formatExposureProgram = (): string | null => {
      const program = exif.ExposureProgram;
      if (program?.description) return program.description;
      if (program?.value !== undefined) {
        const modes: { [key: number]: string } = {
          0: 'Not Defined',
          1: 'Manual',
          2: 'Program AE',
          3: 'Aperture Priority',
          4: 'Shutter Priority',
          5: 'Creative Program',
          6: 'Action Program',
          7: 'Portrait Mode',
          8: 'Landscape Mode',
        };
        return modes[program.value] || `Mode ${program.value}`;
      }
      return null;
    };

    const formatWhiteBalance = (): string | null => {
      if (xmp.WhiteBalance?.value) return xmp.WhiteBalance.value;
      if (exif.WhiteBalance?.description) return exif.WhiteBalance.description;
      if (exif.WhiteBalance?.value !== undefined) {
        return exif.WhiteBalance.value === 0 ? 'Auto' : 'Manual';
      }
      return null;
    };

    const formatMeteringMode = (): string | null => {
      const mode = exif.MeteringMode;
      if (mode?.description) return mode.description;
      if (mode?.value !== undefined) {
        const modes: { [key: number]: string } = {
          0: 'Unknown',
          1: 'Average',
          2: 'Center-weighted',
          3: 'Spot',
          4: 'Multi-spot',
          5: 'Pattern',
          6: 'Partial',
          255: 'Other',
        };
        return modes[mode.value] || `Mode ${mode.value}`;
      }
      return null;
    };

    const formatFlash = (): string | null => {
      const flash = exif.Flash;
      if (flash?.description) return flash.description;
      return null;
    };

    const formatExposureBias = (): string | null => {
      const bias = exif.ExposureBiasValue;
      if (!bias) return null;

      const arrayValue = getArrayValue(bias);
      if (arrayValue) {
        const ev = arrayValue[0] / arrayValue[1];
        if (ev === 0) return '0 EV';
        return `${ev > 0 ? '+' : ''}${ev.toFixed(1)} EV`;
      }

      return bias.description || null;
    };

    const getCamera = (): string | null => {
      const make = getValue(exif.Make);
      const model = getValue(exif.Model);
      if (make && model) {
        return `${make} ${model}`;
      }
      return make || model || null;
    };

    const getLens = (): string | null => {
      const lensModel = getValue(exif.LensModel) || xmp.LensModel?.value || xmp.Lens?.value;
      return lensModel || null;
    };

    // Render content based on state
    const renderContent = () => {
      // If undefined or null, show button to generate
      if (isUndefinedOrNull) {
        return (
          <div style={{ marginTop: '0.75rem' }}>
            <Button onClick={handleGenerateEXIF} disabled={isGenerating} buttonStyle="primary">
              {isGenerating ? 'Generating EXIF...' : 'Generate EXIF Data'}
            </Button>
            {error && (
              <div
                style={{
                  marginTop: '0.5rem',
                  color: 'var(--theme-error-500)',
                  fontSize: '0.875rem',
                }}
              >
                {error}
              </div>
            )}
          </div>
        );
      }

      // If empty object, show message
      if (isEmptyObject) {
        return (
          <div
            style={{
              marginTop: '0.75rem',
              color: 'var(--theme-elevation-600)',
              fontSize: '1rem',
            }}
          >
            No EXIF data available for this image.
          </div>
        );
      }

      // If reduced EXIF data, show warning message but still allow viewing raw data
      if (!isFullEXIF) {
        return (
          <div
            style={{
              marginTop: '0.75rem',
              color: 'var(--theme-elevation-600)',
              fontSize: '1rem',
            }}
          >
            <div style={{ marginBottom: '0.5rem' }}>
              Partial EXIF data available. Some metadata may be missing.
            </div>
          </div>
        );
      }

      // If we have data, try to format and display it
      if (typeof exifData !== 'object' || exifData === null) {
        return null;
      }

      const exifFields = [
        {
          label: 'Camera',
          value: getCamera(),
        },
        {
          label: 'Lens',
          value: getLens(),
        },
        {
          label: 'Aperture',
          value: formatAperture(),
        },
        {
          label: 'Shutter Speed',
          value: formatShutterSpeed(),
        },
        {
          label: 'ISO',
          value: formatISO(),
        },
        {
          label: 'Focal Length',
          value: formatFocalLength(),
        },
        {
          label: 'Exposure Program',
          value: formatExposureProgram(),
        },
        {
          label: 'Exposure Bias',
          value: formatExposureBias(),
        },
        {
          label: 'White Balance',
          value: formatWhiteBalance(),
        },
        {
          label: 'Metering Mode',
          value: formatMeteringMode(),
        },
        {
          label: 'Flash',
          value: formatFlash(),
        },
        {
          label: 'Date Taken',
          value: formatDateTime(),
        },
      ].filter((field) => field.value !== null);

      // If no fields to display, show message
      if (exifFields.length === 0) {
        return (
          <div
            style={{
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
              color: 'var(--theme-elevation-600)',
              fontSize: '1rem',
            }}
          >
            No EXIF data available for this image.
          </div>
        );
      }

      // Show the EXIF fields
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginTop: '0.75rem',
          }}
        >
          {exifFields.map((field, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '0.5rem 0',
                borderBottom:
                  index < exifFields.length - 1 ? '1px solid var(--theme-border-color)' : 'none',
              }}
            >
              <span
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--theme-elevation-600)',
                  fontWeight: 500,
                }}
              >
                {field.label}
              </span>
              <span
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--theme-elevation-900)',
                  textAlign: 'right',
                  maxWidth: '60%',
                }}
              >
                {field.value}
              </span>
            </div>
          ))}
        </div>
      );
    };

    // Always render the header with content
    return (
      <>
        <div style={{ marginTop: '1rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <h3 className="field-group__title" style={{ margin: 0 }}>
              EXIF Data
            </h3>
            {!isUndefinedOrNull && !isEmptyObject && (
              <DrawerToggler slug={drawerSlug}>View Raw Data</DrawerToggler>
            )}
          </div>
          {renderContent()}
        </div>

        {/* Drawer for raw EXIF data */}
        <Drawer slug={drawerSlug} title="Raw EXIF Data">
          <pre
            style={{
              fontSize: '0.875rem',
              lineHeight: '1.5',
              color: 'var(--theme-elevation-900)',
              backgroundColor: 'var(--theme-elevation-50)',
              padding: '1rem',
              borderRadius: 'var(--style-radius-s)',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {JSON.stringify(exifData, null, 2)}
          </pre>
        </Drawer>
      </>
    );
  } catch (error) {
    console.error('Error rendering EXIF display:', error);
    return (
      <div style={{ marginTop: '1rem' }}>
        <h3 className="field-group__title" style={{ marginBottom: '0.75rem' }}>
          EXIF Data
        </h3>
        <div style={{ padding: '1rem', color: 'var(--theme-error-500)' }}>
          <p>Error displaying EXIF data. Check console for details.</p>
        </div>
      </div>
    );
  }
};
