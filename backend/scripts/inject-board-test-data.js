/**
 * Script to inject test board data into MongoDB
 * This tests the board save/load functionality by reverse engineering
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017/masterg';

// Test data - simulating a board with sticky notes, cards, and drawings
const testBoardData = {
  userId: 'user_test_board_123',
  sessionId: 'board_test_123',
  sessionName: 'Test Board - Photosynthesis Concepts',
  drawingPaths: [
    {
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 150 },
        { x: 300, y: 120 },
      ],
      color: '#F97316',
      strokeWidth: 3,
      tool: 'pen',
    },
    {
      points: [
        { x: 400, y: 200 },
        { x: 500, y: 250 },
        { x: 600, y: 220 },
      ],
      color: '#3B82F6',
      strokeWidth: 2,
      tool: 'pen',
    },
  ],
  cards: [
    {
      id: 'card_1',
      title: 'Light Absorption',
      content: 'Plants absorb sunlight through chlorophyll molecules in blue and red wavelengths.',
      x: 150,
      y: 300,
      width: 200,
      height: 150,
    },
    {
      id: 'card_2',
      title: 'Water Splitting',
      content: 'Light energy splits water molecules into hydrogen and oxygen in thylakoid membranes.',
      x: 400,
      y: 300,
      width: 200,
      height: 150,
    },
  ],
  stickyNotes: [
    {
      id: 'note_1',
      x: 50,
      y: 50,
      text: '# Photosynthesis Overview\n\nPhotosynthesis is the process by which plants convert light energy into chemical energy.',
      color: '#FEF3C7',
      width: 250,
      height: 200,
      enableMarkdown: true,
      ruled: false,
      fontSize: 14,
      fontFamily: 'Inter',
      isBold: false,
      isItalic: false,
      isUnderline: false,
    },
    {
      id: 'note_2',
      x: 350,
      y: 50,
      text: '## Key Components\n\n- Chlorophyll\n- Chloroplasts\n- CO₂ and H₂O\n- Glucose (C₆H₁₂O₆)',
      color: '#DBEAFE',
      width: 250,
      height: 200,
      enableMarkdown: true,
      ruled: true,
      fontSize: 14,
      fontFamily: 'Inter',
      isBold: false,
      isItalic: false,
      isUnderline: false,
    },
    {
      id: 'note_3',
      x: 650,
      y: 50,
      text: '**The Process:**\n\n1. Light absorption\n2. Water splitting\n3. CO₂ fixation\n4. Glucose production',
      color: '#D1FAE5',
      width: 250,
      height: 200,
      enableMarkdown: true,
      ruled: false,
      fontSize: 16,
      fontFamily: 'Inter',
      isBold: true,
      isItalic: false,
      isUnderline: false,
    },
    {
      id: 'note_4',
      x: 50,
      y: 300,
      text: '**Chlorophyll** is the green pigment that captures light energy. It is found in chloroplasts.',
      color: '#FCE7F3',
      width: 200,
      height: 150,
      enableMarkdown: true,
      ruled: false,
      fontSize: 14,
      fontFamily: 'Inter',
      isBold: true,
      isItalic: false,
      isUnderline: false,
    },
    {
      id: 'note_5',
      x: 300,
      y: 300,
      text: '**Calvin Cycle**\n\nConverts CO₂ into glucose using ATP and NADPH from light reactions.',
      color: '#E0E7FF',
      width: 200,
      height: 150,
      enableMarkdown: true,
      ruled: false,
      fontSize: 14,
      fontFamily: 'Inter',
      isBold: false,
      isItalic: true,
      isUnderline: false,
    },
    {
      id: 'note_6',
      x: 550,
      y: 300,
      text: '**Equation:**\n\n6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
      color: '#FED7AA',
      width: 200,
      height: 150,
      enableMarkdown: true,
      ruled: false,
      fontSize: 16,
      fontFamily: 'Inter',
      isBold: true,
      isItalic: false,
      isUnderline: true,
    },
  ],
  viewOffset: {
    x: 0,
    y: 0,
  },
  zoom: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function injectTestData() {
  let client;

  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('masterg');
    // MongoDB automatically lowercases and pluralizes model names
    // "BoardSession" becomes "boardsessions"
    const collection = db.collection('boardsessions');

    // Check if session already exists
    const existing = await collection.findOne({
      userId: testBoardData.userId,
      sessionId: testBoardData.sessionId,
    });

    if (existing) {
      console.log('⚠️  Session already exists. Updating...');
      await collection.updateOne(
        { userId: testBoardData.userId, sessionId: testBoardData.sessionId },
        { $set: testBoardData }
      );
      console.log('✅ Updated existing session');
    } else {
      console.log('📝 Inserting new board session...');
      await collection.insertOne(testBoardData);
      console.log('✅ Inserted new board session');
    }

    // Verify the data
    const inserted = await collection.findOne({
      userId: testBoardData.userId,
      sessionId: testBoardData.sessionId,
    });

    if (inserted) {
      console.log('\n📊 Session Data Summary:');
      console.log(`   User ID: ${inserted.userId}`);
      console.log(`   Session ID: ${inserted.sessionId}`);
      console.log(`   Session Name: ${inserted.sessionName}`);
      console.log(`   Drawing Paths: ${inserted.drawingPaths?.length || 0}`);
      console.log(`   Cards: ${inserted.cards?.length || 0}`);
      console.log(`   Sticky Notes: ${inserted.stickyNotes?.length || 0}`);
      console.log(`   View Offset: (${inserted.viewOffset?.x || 0}, ${inserted.viewOffset?.y || 0})`);
      console.log(`   Zoom: ${inserted.zoom || 1}`);
      console.log(`   Created: ${inserted.createdAt}`);
      console.log(`   Updated: ${inserted.updatedAt}`);
      
      console.log('\n✅ Test data injected successfully!');
      console.log('\n📋 To test in frontend:');
      console.log(`   1. Open Board page`);
      console.log(`   2. Set userId in localStorage: localStorage.setItem('board_userId', '${testBoardData.userId}')`);
      console.log(`   3. The board should auto-load or you can manually load session: '${testBoardData.sessionId}'`);
    } else {
      console.error('❌ Failed to verify inserted data');
    }
  } catch (error) {
    console.error('❌ Error injecting test data:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// Run the script
injectTestData();

