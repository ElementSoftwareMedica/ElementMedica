/**
 * GDPR Overview Card Component
 * Displays overview statistics for GDPR dashboard
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Stack,
  Chip
} from '@mui/material';

interface GDPROverviewCardProps {
  title: string;
  icon: React.ReactNode;
  stats: {
    total: number;
    granted?: number;
    pending?: number;
    completed?: number;
    active?: number;
  };
  loading?: boolean;
  error?: string | null;
}

export const GDPROverviewCard: React.FC<GDPROverviewCardProps> = ({
  title,
  icon,
  stats,
  loading = false,
  error = null
}) => {
  const getMainValue = () => {
    if (stats.granted !== undefined) return stats.granted;
    if (stats.completed !== undefined) return stats.completed;
    if (stats.active !== undefined) return stats.active;
    return stats.total;
  };

  const getSecondaryValue = () => {
    if (stats.pending !== undefined) return stats.pending;
    return null;
  };

  const getPercentage = () => {
    const main = getMainValue();
    return stats.total > 0 ? Math.round((main / stats.total) * 100) : 0;
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={120}>
            <CircularProgress size={40} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Alert severity="error" sx={{ height: '100%' }}>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={1}>
            {icon}
            <Typography variant="h6" component="h3" noWrap>
              {title}
            </Typography>
          </Stack>

          {/* Main Stats */}
          <Box>
            <Typography variant="h3" component="div" color="primary">
              {getMainValue()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              of {stats.total} total
            </Typography>
          </Box>

          {/* Secondary Stats */}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              label={`${getPercentage()}%`}
              color={getPercentage() >= 80 ? 'success' : getPercentage() >= 60 ? 'warning' : 'error'}
              size="small"
            />
            {getSecondaryValue() !== null && (
              <Chip
                label={`${getSecondaryValue()} pending`}
                variant="outlined"
                size="small"
              />
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};