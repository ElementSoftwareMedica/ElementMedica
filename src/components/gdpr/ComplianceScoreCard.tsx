/**
 * Compliance Score Card Component
 * Displays GDPR compliance score with recommendations
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
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';

interface ComplianceRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

interface ComplianceScoreCardProps {
  score: number;
  recommendations?: ComplianceRecommendation[];
  loading?: boolean;
  error?: string | null;
}

export const ComplianceScoreCard: React.FC<ComplianceScoreCardProps> = ({
  score,
  recommendations = [],
  loading = false,
  error = null
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircleIcon color="success" />;
    if (score >= 70) return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  const getScoreDescription = (score: number) => {
    if (score >= 90) return 'Excellent compliance';
    if (score >= 70) return 'Good compliance';
    if (score >= 50) return 'Needs improvement';
    return 'Critical issues';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Stack spacing={2} alignItems="center">
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Loading compliance score...
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Alert severity="error">
            <Typography variant="body2">
              {error}
            </Typography>
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
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="h3">
              Compliance Score
            </Typography>
            <ShieldIcon color="primary" />
          </Stack>

          {/* Score Display */}
          <Box sx={{ textAlign: 'center' }}>
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
              {getScoreIcon(score)}
              <Typography variant="h3" component="div" color={`${getScoreColor(score)}.main`}>
                {score}%
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {getScoreDescription(score)}
            </Typography>
          </Box>

          {/* Progress Bar */}
          <Box>
            <LinearProgress 
              variant="determinate" 
              value={score} 
              color={getScoreColor(score)}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* Trend Indicator */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <TrendingUpIcon fontSize="small" color="success" />
            <Typography variant="body2" color="text.secondary">
              Trending upward
            </Typography>
          </Stack>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Recommendations ({recommendations.length})
              </Typography>
              <List dense>
                {recommendations.slice(0, 3).map((rec) => (
                  <ListItem key={rec.id} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Chip 
                        size="small" 
                        label={rec.priority.toUpperCase()} 
                        color={getPriorityColor(rec.priority)}
                        variant="outlined"
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={rec.title}
                      secondary={rec.description}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
              {recommendations.length > 3 && (
                <Typography variant="caption" color="text.secondary">
                  +{recommendations.length - 3} more recommendations
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};