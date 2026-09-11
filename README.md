# Edu-IT Inventory

A simple, user-friendly IT asset inventory system for schools, hosted on GitHub Pages.

## Features

- **Login Protection** - Password-protected access with GitHub token
- **Multi-School Support** - Manage assets across multiple schools
- **Full Asset Tracking** - Laptops, desktops, tablets, printers, network equipment, peripherals, and software licenses
- **CSV Upload** - Bulk import assets from CSV files with automatic column mapping
- **Search & Filter** - Search assets and filter by type, status, location, and school
- **Dashboard** - Quick overview of asset status and distribution
- **Responsive Design** - Works on desktop and mobile

## Quick Start

1. **Clone/Download** this repository to your machine
2. **Upload** all files to your GitHub repository: `Koops1974/Edu-IT-Inventroy`
3. **Enable GitHub Pages**:
   - Go to your repo on GitHub
   - Settings → Pages
   - Select "Deploy from a branch" and choose `main` branch, `/root` folder
   - Click Save
4. **Create a GitHub Token**:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Check the `repo` scope
   - Give it an expiry date (recommended: 90 days)
   - Copy the token (starts with `ghp_`)

## Usage

1. Visit your hosted site at: `https://Koops1974.github.io/Edu-IT-Inventroy/`
2. Sign in with:
   - **GitHub Token**: Your personal access token
   - **Repository Owner**: `Koops1974`
   - **Repository Name**: `Edu-IT-Inventroy`
   - **Access Password**: `admin123` (change this in `js/config.js`)

> **Important**: Change the default `admin123` password in `js/config.js` before deploying to production.

## CSV Template

Download the template from the app's CSV Upload page, or use this format:

```csv
name,type,serial,model,manufacturer,purchaseDate,school,location,status,assignedTo,ip,notes
Office Laptop 001,laptop,SN123456,Dell Latitude 5440,Dell,2024-01-15,School 1,Room 101,available,John Smith,192.168.1.50,Standard issue laptop
```

### CSV Column Mapping

The app auto-detects common column names. Supported fields:

| CSV Column | Description |
|---|---|
| `name` | Asset name (required) |
| `type` | Laptop, desktop, tablet, printer, network, peripheral, software, other |
| `serial` | Serial number |
| `model` | Model number |
| `manufacturer` | Brand |
| `purchaseDate` | Date of purchase |
| `school` | School name (must match a school in the app) |
| `location` | Room or location |
| `status` | available, in-use, repair, retired |
| `assignedTo` | Staff/teacher name |
| `ip` | IP address |
| `notes` | Additional notes |

## Data Storage

All data is stored in JSON files in your repository:
- `data/assets.json` - Asset inventory
- `data/schools.json` - School information

Every change is saved directly to GitHub via the API, so your data is version-controlled and accessible from anywhere.

## Security Notes

- The access password is stored in `js/config.js` which is visible in the repo. For production use, consider:
  - Using a more secure authentication method
  - Regularly rotating the GitHub token
  - Setting token expiry dates

## File Structure

```
├── index.html         # Main application
├── css/
│   └── style.css      # Styling
├── js/
│   ├── config.js      # Configuration
│   ├── github-api.js  # GitHub API integration
│   ├── auth.js        # Authentication
│   ├── assets.js      # Asset management
│   ├── csv.js         # CSV parsing
│   └── app.js         # Main application logic
└── data/
    ├── assets.json    # Asset data
    └── schools.json   # School data
```