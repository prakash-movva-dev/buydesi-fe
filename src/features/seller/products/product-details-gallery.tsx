import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import ButtonBase from '@mui/material/ButtonBase';
import { alpha } from '@mui/material/styles';

import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
  images: string[];
  alt: string;
};

/**
 * The product's photos as the buyer sees them — one large image with a strip
 * of thumbnails beneath it. Broken links fall back to a placeholder rather
 * than a torn image, since S3 keys occasionally outlive their objects.
 */
export function ProductDetailsGallery({ images, alt }: Props) {
  const [active, setActive] = useState(0);

  const [broken, setBroken] = useState<Record<number, boolean>>({});

  // A different product (or a re-upload) starts the gallery over.
  useEffect(() => {
    setActive(0);
    setBroken({});
  }, [images]);

  const current = images[active];
  const showPlaceholder = !current || broken[active];

  return (
    <Card sx={{ p: 1 }}>
      <Box
        sx={{
          width: 1,
          borderRadius: 1.5,
          overflow: 'hidden',
          position: 'relative',
          aspectRatio: '1 / 1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
        }}
      >
        {showPlaceholder ? (
          <Stack spacing={1} alignItems="center" sx={{ color: 'text.disabled' }}>
            <Iconify icon="solar:gallery-wide-bold" width={40} />
            <Box component="span" sx={{ typography: 'caption' }}>
              No photo
            </Box>
          </Stack>
        ) : (
          <Box
            component="img"
            src={current}
            alt={alt}
            onError={() => setBroken((prev) => ({ ...prev, [active]: true }))}
            sx={{ width: 1, height: 1, objectFit: 'cover' }}
          />
        )}
      </Box>

      {images.length > 1 && (
        <Scrollbar sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1} sx={{ p: 0.5 }}>
            {images.map((src, index) => (
              <ButtonBase
                key={`${src}-${index}`}
                onClick={() => setActive(index)}
                sx={{
                  width: 72,
                  height: 72,
                  flexShrink: 0,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  transition: (theme) => theme.transitions.create(['opacity', 'box-shadow']),
                  bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                  ...(index === active
                    ? { boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}` }
                    : { opacity: 0.64, '&:hover': { opacity: 1 } }),
                }}
              >
                {broken[index] ? (
                  <Iconify icon="solar:gallery-wide-bold" width={20} sx={{ color: 'text.disabled' }} />
                ) : (
                  <Box
                    component="img"
                    src={src}
                    alt={`${alt} ${index + 1}`}
                    onError={() => setBroken((prev) => ({ ...prev, [index]: true }))}
                    sx={{ width: 1, height: 1, objectFit: 'cover' }}
                  />
                )}
              </ButtonBase>
            ))}
          </Stack>
        </Scrollbar>
      )}
    </Card>
  );
}
