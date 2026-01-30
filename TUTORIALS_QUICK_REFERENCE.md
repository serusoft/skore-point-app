# Tutorials Page - Quick Reference

## 🚀 How It Works

When a user clicks **"Learn how to use Skore Point"**:

1. **Desktop Users** → See button in top navbar (on dashboard/school pages)
2. **Mobile Users** → See tab in bottom tab bar
3. **Link Destination** → `pages/marks/tutorials.html`
4. **Page Loads** → 
   - Navbar injects automatically
   - Back button appears
   - 4 tutorial cards with embedded YouTube videos display
   - Responsive to all screen sizes

## 📁 File Structure

```
pages/marks/
├── tutorials.html    (Main page with 4 tutorial cards)
├── tutorials.js      (Page initialization & navigation)
└── tutorials.css     (Professional styling & responsive design)
```

## 🎯 Navigation Flow

```
Dashboard / School Page
    ↓ (Click "Learn how to use Skore Point")
Tutorials Page
    ├─ Back Button (top-left)
    ├─ Escape Key (keyboard shortcut)
    └─ Browser Back (standard browser navigation)
        ↓
    Returns to Previous Page
```

## 📺 Tutorial Videos

Currently includes 4 tutorial cards:

| # | Title | Description |
|---|-------|-------------|
| 1 | Getting Started | Account setup & school creation |
| 2 | Managing Classes & Students | Add classes, streams, register students |
| 3 | Entering Marks | Mark entry for subjects/papers |
| 4 | Generating Reports | Report card generation & printing |

**Video IDs:** Currently using placeholder `dQw4w9WgXcQ` - replace with actual YouTube IDs

## 🎨 Responsive Design

| Screen Size | Layout | Tab Bar | Back Button |
|------------|--------|---------|------------|
| Desktop (>768px) | 2-4 columns | Hidden | Top-left circle |
| Tablet (768px) | 1-2 columns | Hidden | Top-left circle |
| Mobile (≤768px) | 1 column | Visible | Top-left circle |
| Small Mobile (≤480px) | 1 column | Visible | 40x40px circle |

## 🔧 To Customize Videos

1. Find YouTube video URLs you want to add
2. Extract video ID from URL: `https://www.youtube.com/watch?v=VIDEO_ID`
3. Open [pages/marks/tutorials.html](../pages/marks/tutorials.html)
4. Find iframe tags and update `src="https://www.youtube.com/embed/VIDEO_ID?rel=0"`

**Example:**
```html
<!-- Before -->
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0" ...></iframe>

<!-- After (with your video ID) -->
<iframe src="https://www.youtube.com/embed/YOUR_VIDEO_ID?rel=0" ...></iframe>
```

## 🛠️ Key Features

✅ **Proper Navigation**
- Correct file paths from all locations
- Back button with multiple fallback options
- Escape key shortcut

✅ **Responsive Design**
- Mobile-first approach
- Optimized layouts for all screen sizes
- Touch-friendly buttons

✅ **Professional Appearance**
- Clean, modern card design
- Smooth transitions and animations
- Proper video aspect ratio (16:9)
- Color scheme matches app theme

✅ **YouTube Integration**
- Embedded videos with security attributes
- Prevents auto-recommended videos (`rel=0`)
- Proper iframe security settings
- Responsive video containers

✅ **Accessibility**
- Keyboard navigation (Escape to go back)
- Semantic HTML structure
- ARIA labels on navigation elements
- Alt text on images

## 🔗 Integration Points

### In navbar (desktop users)
**File:** `shared/js/ui.js` line 201
```javascript
<a href="../marks/tutorials.html" data-page="tutorials" ...>
    Learn how to use Skore Point
</a>
```

### In tab bar (mobile users)
**File:** `shared/js/ui.js` line 229
```javascript
<a href="../marks/tutorials.html" data-page="tutorials" class="tab-link">
    How to Use Skore Point
</a>
```

### Navigation mapping
**File:** `shared/js/app.js` line 611
```javascript
'tutorials': '../marks/tutorials.html'
```

## 🐛 Debugging

If tutorials page doesn't work:

1. **Check console** (F12 → Console tab)
   - Look for errors related to Firebase, navbar injection, etc.
   
2. **Verify paths**
   - Navigate to `pages/marks/tutorials.html` directly
   - Should load with navbar and styling intact
   
3. **Test navigation**
   - From dashboard, click "Learn how to use Skore Point"
   - Should navigate to tutorials page without errors
   - Click back button - should return to dashboard
   
4. **Check styling**
   - If CSS doesn't load, check variables.css is linked
   - Verify base.css and components.css load
   - Back button should be visible in header

## 📊 Performance Notes

- Page loads with navbar injection
- CSS uses CSS Grid for responsive layout
- Smooth scroll behavior enabled
- YouTube videos lazy-loaded by iframe
- Service worker caches page for offline use

## 🚀 Future Enhancements

Consider adding:
- Search/filter for tutorials by topic
- Transcript/captions for videos
- Quiz/knowledge checks after videos
- Progress tracking for user's watched videos
- Download PDF guides with tutorials
- Direct links to help documentation
- Video quality/speed options
- Comments/feedback section
