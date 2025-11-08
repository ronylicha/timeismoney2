# Google Calendar Integration Setup Guide

This guide will help you set up Google Calendar integration for Time Is Money.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Backend integration already completed

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter project name: `Time Is Money Calendar Integration`
5. Click "Create"

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, ensure your project is selected
2. Go to **APIs & Services** > **Library**
3. Search for "Google Calendar API"
4. Click on "Google Calendar API"
5. Click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type
3. Click "Create"
4. Fill in the required information:
   - **App name**: Time Is Money
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click "Save and Continue"
6. On the Scopes page, click "Add or Remove Scopes"
7. Add these scopes:
   - `https://www.googleapis.com/auth/calendar` (See, edit, share, and permanently delete all the calendars you can access using Google Calendar)
   - `https://www.googleapis.com/auth/calendar.events` (View and edit events on all your calendars)
8. Click "Update" then "Save and Continue"
9. Add test users (your email) if in testing mode
10. Click "Save and Continue"
11. Review and click "Back to Dashboard"

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click "Create Credentials" > "OAuth client ID"
3. Select **Web application**
4. Enter name: `Time Is Money OAuth Client`
5. Under "Authorized JavaScript origins", add:
   ```
   http://localhost:8000
   http://localhost:3000
   ```
6. Under "Authorized redirect URIs", add:
   ```
   http://localhost:8000/api/auth/google/callback
   http://localhost:3000/google-calendar/callback
   ```
7. Click "Create"
8. **Important**: Copy your Client ID and Client Secret (you'll need these for the .env file)

## Step 5: Configure Environment Variables

Add the following to your `.env` file:

```env
# Google OAuth & Calendar Configuration
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
GOOGLE_REDIRECT_URI="${APP_URL}/api/auth/google/callback"
```

Replace `your-client-id-here` and `your-client-secret-here` with the credentials from Step 4.

## Step 6: Test the Integration

### Backend API Endpoints

The following endpoints are now available:

#### Get Connection Status
```bash
GET /api/google-calendar/status
```

#### Initiate OAuth Flow
```bash
GET /api/google-calendar/connect
```
Returns: `{ "authorization_url": "https://accounts.google.com/..." }`

#### Handle OAuth Callback
```bash
POST /api/google-calendar/callback
Body: { "code": "authorization_code_from_google" }
```

#### Get User's Calendars
```bash
GET /api/google-calendar/calendars
```

#### Update Calendar Settings
```bash
POST /api/google-calendar/settings
Body: {
  "calendar_id": "primary",
  "enabled": true
}
```

#### Toggle Sync
```bash
POST /api/google-calendar/toggle-sync
Body: { "enabled": true }
```

#### Disconnect
```bash
POST /api/google-calendar/disconnect
```

## Step 7: Production Deployment

### For Production Use:

1. **Update OAuth consent screen** to "Production" instead of "Testing"
2. **Add production redirect URIs**:
   ```
   https://yourdomain.com/api/auth/google/callback
   https://yourdomain.com/google-calendar/callback
   ```
3. **Update environment variables** with production URLs
4. **Verify the app** through Google's verification process (required for production)

### Security Considerations:

- Google tokens are stored encrypted in the database
- Access tokens are automatically refreshed when expired
- Tokens are securely hidden from API responses
- OAuth redirect URIs are strictly validated

## How It Works

### OAuth Flow:

1. User clicks "Connect Google Calendar" in settings
2. Frontend redirects to Google's OAuth consent screen
3. User authorizes the application
4. Google redirects back with authorization code
5. Backend exchanges code for access token and refresh token
6. Tokens are stored encrypted in the database
7. User's primary calendar is automatically selected

### Time Entry Sync:

When a time entry is created or updated:
- An event is automatically created/updated in Google Calendar
- Event includes:
  - **Summary**: Task or project name
  - **Description**: Detailed information including duration, billable status, hourly rate
  - **Time**: Start and end time from the time entry
  - **Color**: Green for billable entries, gray for non-billable

### Token Management:

- Access tokens expire after ~1 hour
- Refresh tokens are used to automatically get new access tokens
- No user interaction required for token refresh
- Tokens can be revoked by disconnecting

## Troubleshooting

### "Access blocked: Authorization Error"
- Make sure the OAuth consent screen is properly configured
- Add your email as a test user if in testing mode
- Verify all required scopes are added

### "Redirect URI mismatch"
- Ensure the redirect URI in your .env matches exactly what's configured in Google Cloud Console
- Check for trailing slashes
- Verify protocol (http vs https)

### "Invalid refresh token"
- User needs to reconnect their Google Calendar
- This can happen if the app is disconnected from Google account settings
- Use the disconnect endpoint and reconnect

### Token expired errors
- The service automatically refreshes tokens
- If refresh fails, user will need to reconnect
- Check logs for specific error messages

## API Response Examples

### Connection Status
```json
{
  "connected": true,
  "enabled": true,
  "calendar_id": "primary",
  "token_expires_at": "2025-11-08T15:30:00.000000Z"
}
```

### List Calendars
```json
{
  "data": [
    {
      "id": "primary",
      "summary": "john.doe@example.com",
      "primary": true,
      "access_role": "owner"
    },
    {
      "id": "work_calendar@group.calendar.google.com",
      "summary": "Work Calendar",
      "primary": false,
      "access_role": "writer"
    }
  ]
}
```

## Support

For issues or questions:
- Check the logs: `storage/logs/laravel.log`
- Review Google Cloud Console error messages
- Verify all environment variables are set correctly
- Ensure database migrations have been run

## Related Documentation

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Laravel Google API Client](https://github.com/googleapis/google-api-php-client)
