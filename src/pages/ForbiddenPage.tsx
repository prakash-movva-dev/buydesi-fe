import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Button } from '@/components/ui/Button';

export const ForbiddenPage = () => {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center' }}>
        <Typography
          variant="h1"
          sx={{ fontSize: '5rem', fontWeight: 700, color: 'text.secondary', lineHeight: 1 }}
        >
          403
        </Typography>
        <Typography variant="h6">Not allowed</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360 }}>
          Your role doesn’t have access to this page. If this looks wrong, contact a super admin.
        </Typography>
        <Button onClick={() => navigate('/')}>Back to dashboard</Button>
      </Stack>
    </Box>
  );
};
