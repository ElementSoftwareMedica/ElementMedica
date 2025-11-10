# Google Cloud Console Setup Guide

## Overview
This guide walks through setting up Google OAuth2 credentials for the Template Management system to enable importing documents from Google Docs and Google Slides.

## Prerequisites
- Google account with access to Google Cloud Console
- Project admin permissions

## Step 1: Create/Select Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Either:
   - **Create New Project**: Click "Select a project" → "New Project" → Enter name: "ElementMedica Training Platform"
   - **Use Existing Project**: Select your existing project from the dropdown

## Step 2: Enable Required APIs

1. Navigate to **APIs & Services** → **Library**
2. Search and enable the following APIs:
   - ✅ **Google Docs API**
   - ✅ **Google Slides API** 
   - ✅ **Google Drive API**

For each API:
- Click on the API name
- Click **"Enable"** button
- Wait for activation (takes ~1 minute)

## Step 3: Configure OAuth2 Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **User Type**:
   - **Internal**: If using Google Workspace (recommended)
   - **External**: For public access (requires verification for production)
3. Click **"Create"**

### App Information
- **App name**: `ElementMedica Training Platform`
- **User support email**: Your admin email
- **App logo**: (Optional) Upload company logo
- **Application home page**: `https://your-domain.com`
- **Application privacy policy**: `https://your-domain.com/privacy`
- **Application terms of service**: `https://your-domain.com/terms`
- **Authorized domains**: Add `your-domain.com`

### Scopes
Click **"Add or Remove Scopes"** and add:
- ✅ `https://www.googleapis.com/auth/documents.readonly` - View Google Docs
- ✅ `https://www.googleapis.com/auth/presentations.readonly` - View Google Slides
- ✅ `https://www.googleapis.com/auth/drive.readonly` - View Drive files

Click **"Update"** → **"Save and Continue"**

### Test Users (For External Apps)
If using External user type:
- Add email addresses of users who can test before verification
- Click **"Save and Continue"**

## Step 4: Create OAuth2 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. **Application type**: Select **"Web application"**
4. **Name**: `ElementMedica Training Platform - Web Client`

### Authorized JavaScript Origins
Add both development and production URLs:
```
http://localhost:5173
http://localhost:3000
https://your-production-domain.com
```

### Authorized Redirect URIs
Add callback URLs for OAuth2 flow:
```
http://localhost:5173/settings/templates/google-callback
http://localhost:3000/settings/templates/google-callback
https://your-production-domain.com/settings/templates/google-callback
```

5. Click **"Create"**

## Step 5: Save Credentials

After creation, you'll see a dialog with:
- **Client ID**: `123456789-abc123def456.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx`

**IMPORTANT**: Save these immediately! You can also download the JSON file.

## Step 6: Update Backend Configuration

Add the credentials to your backend `.env` file:

```bash
# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GOOGLE_REDIRECT_URI=http://localhost:5173/settings/templates/google-callback
```

### Production Configuration
For production, use:
```bash
GOOGLE_REDIRECT_URI=https://your-production-domain.com/settings/templates/google-callback
```

## Step 7: Verify Setup

Run this command to verify the credentials are loaded:

```bash
cd backend
node -e "console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing')"
```

## Security Best Practices

### Development
- ✅ Use localhost redirect URIs
- ✅ Test with Internal user type if possible
- ✅ Keep credentials in `.env` (gitignored)

### Production
- ✅ Use HTTPS redirect URIs only
- ✅ Restrict authorized domains
- ✅ Store credentials in secure vault (AWS Secrets Manager, etc.)
- ✅ Enable Google Cloud Console audit logs
- ✅ Rotate credentials periodically (every 90 days)
- ✅ Implement token encryption at rest
- ✅ Monitor API usage quotas

### Token Storage
The system stores OAuth2 tokens in the `GoogleTokens` table:
- ✅ Access tokens: Short-lived (1 hour)
- ✅ Refresh tokens: Long-lived (encrypted)
- ✅ Automatic token refresh on expiry
- ✅ Revocation on user request

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Cause**: Redirect URI not registered in Google Console
**Fix**: Add exact URL to "Authorized redirect URIs" in credentials

### Error: "access_denied"
**Cause**: User not in test users list (External app)
**Fix**: Add user email to OAuth consent screen → Test users

### Error: "invalid_client"
**Cause**: Wrong Client ID or Secret
**Fix**: Verify credentials in `.env` match Google Console

### Error: "insufficient_scope"
**Cause**: Missing required API scopes
**Fix**: Add scopes to OAuth consent screen and re-authorize

### API Quota Exceeded
**Cause**: Too many API calls
**Fix**: Check quotas in Google Console → APIs & Services → Quotas

## API Quotas & Limits

### Google Docs API
- **Reads**: 300 requests per minute per user
- **Quota**: Sufficient for normal usage

### Google Slides API
- **Reads**: 300 requests per minute per user
- **Quota**: Sufficient for normal usage

### Google Drive API
- **Queries**: 1000 requests per 100 seconds per user
- **Downloads**: 20,000 requests per 100 seconds per user

**Optimization**:
- Cache imported documents
- Implement rate limiting
- Use batch requests where possible

## Next Steps

After completing this setup:
1. ✅ Backend OAuth2 routes implementation
2. ✅ Google Docs/Slides import services
3. ✅ Frontend OAuth2 integration
4. ✅ End-to-end testing

## Support Resources

- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Docs API Reference](https://developers.google.com/docs/api)
- [Google Slides API Reference](https://developers.google.com/slides/api)
- [OAuth2 Playground](https://developers.google.com/oauthplayground/) - Test API calls

## Maintenance

### Monthly Tasks
- Review API usage in Google Console
- Check for security alerts
- Verify test user list is up to date

### Quarterly Tasks
- Rotate OAuth2 credentials
- Review and update scopes
- Audit token usage in database

### Yearly Tasks
- Review OAuth consent screen information
- Update privacy policy and terms
- Renew app verification (if External)
