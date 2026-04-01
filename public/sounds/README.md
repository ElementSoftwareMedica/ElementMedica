# Queue System Audio Files

## Required Files

### queue-chime.wav (o .mp3)
A short chime sound to play when a patient number is called.

**Status:** ✅ PRESENTE - `queue-chime.wav`

**Supported formats:**
- WAV (recommended - no licensing issues, universal support)
- MP3 (also supported)

**Recommended specifications:**
- Duration: 1-2 seconds
- Size: < 100KB
- Content: Clear, pleasant chime/ding sound

## Suggested Sources

1. **Free Sound Effects:**
   - [Mixkit](https://mixkit.co/free-sound-effects/notification/)
   - [Freesound](https://freesound.org/)
   - [Zapsplat](https://www.zapsplat.com/)

2. **Search Terms:**
   - "notification chime"
   - "queue ding"
   - "bell sound effect"
   - "call attention sound"

## Installation

1. Download a suitable MP3 file
2. Rename it to `queue-chime.mp3`
3. Place it in this directory (`/public/sounds/`)

## Testing

The sound is used in:
- `src/pages/clinica/coda/QueueDisplayPage.tsx` (useQueueAudio hook)

If no file is present, the system will continue to function but without audio alerts.
