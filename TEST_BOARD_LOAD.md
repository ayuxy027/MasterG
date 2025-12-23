# Board Save/Load Test Instructions

## Test Data Injected ✅

Test board data has been injected into MongoDB with:
- **User ID**: `user_test_board_123`
- **Session ID**: `board_test_123`
- **6 Sticky Notes** with various content, colors, and formatting
- **2 Cards** with Photosynthesis content
- **2 Drawing Paths** (orange and blue strokes)
- **View State**: Zoom 1x, Offset (0, 0)

## How to Test

### Option 1: Auto-Load (Recommended)
1. Open the Board page in your browser
2. Open browser console (F12)
3. Set the test userId:
   ```javascript
   localStorage.setItem('board_userId', 'user_test_board_123')
   ```
4. Refresh the page
5. The board should automatically load the test session with all 6 sticky notes, 2 cards, and 2 drawing paths

### Option 2: Manual Load
1. Open the Board page
2. Set userId in localStorage:
   ```javascript
   localStorage.setItem('board_userId', 'user_test_board_123')
   ```
3. In the browser console, manually trigger load:
   ```javascript
   // The handleLoadBoard function should be accessible or you can call the API directly
   ```

## What to Verify

✅ **Sticky Notes Load**:
- 6 sticky notes should appear on the canvas
- Check positions: (50,50), (350,50), (650,50), (50,300), (300,300), (550,300)
- Verify colors: yellow, blue, green, pink, purple, orange
- Check markdown rendering (if enabled)
- Verify text content matches injected data

✅ **Cards Load**:
- 2 cards should appear
- Positions: (150,300) and (400,300)
- Titles: "Light Absorption" and "Water Splitting"

✅ **Drawing Paths Load**:
- 2 drawing paths should be visible
- Orange path: (100,100) → (200,150) → (300,120)
- Blue path: (400,200) → (500,250) → (600,220)

✅ **View State**:
- Zoom should be 1x
- View offset should be (0, 0)

## Test Saving

After verifying the load works:
1. Make some changes (add a sticky note, draw something, move items)
2. Wait 3 seconds (auto-save) OR click the Save button
3. Refresh the page
4. Verify your changes persisted

## Clean Up

To remove test data:
```bash
cd backend
node -e "const {MongoClient}=require('mongodb');(async()=>{const c=await MongoClient.connect('mongodb://localhost:27017/masterg');await c.db('masterg').collection('boardsessions').deleteOne({userId:'user_test_board_123',sessionId:'board_test_123'});await c.close();})()"
```

Or use MongoDB Compass/CLI to delete the document.
