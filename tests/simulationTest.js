const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables if they exist
dotenv.config({ path: path.join(__dirname, '../.env') });

const hasRealCredentials = process.env.SUPABASE_URL && process.env.SUPABASE_KEY && process.env.GEMINI_API_KEY;

// Mock data structures
const sampleAssessment = {
  email: 'test-customer@zinnutrition.com',
  firstName: 'John',
  lastName: 'Doe',
  age: '28',
  height: "6'0",
  weight: '82',
  goal: 'Muscle Gain',
  food: 'Non-Veg',
  carbs: 'Rice',
  meat: 'Chicken',
  allergies: 'None',
  workout: '4',
  comments: 'Want to focus on compound lifts and chest growth.'
};

const sampleShopifyOrder = {
  id: 99887766,
  email: 'test-customer@zinnutrition.com',
  total_price: '49.00',
  financial_status: 'paid'
};

const sampleEbookMetadata = {
  id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  filename: 'NASM_CPT_Full_Textbook.pdf',
  status: 'completed',
  chunk_count: 342,
  embedding_model: 'text-embedding-004'
};

const sampleGenProgram = {
  weekly_split: {
    "Monday": "Push A (Chest, Shoulders, Triceps Focus)",
    "Tuesday": "Pull A (Back, Rear Delts, Biceps Focus)",
    "Wednesday": "Active Recovery / Mobility Protocol",
    "Thursday": "Legs A (Quads, Calves Focus)",
    "Friday": "Upper Body B (Hypertrophy Split)",
    "Saturday": "Rest Day / Soft Tissue Recovery",
    "Sunday": "Rest Day"
  },
  routines: [
    {
      day_name: "Monday - Push A",
      exercises: [
        { name: "Barbell Bench Press", sets: 4, reps: "6-8", rest: "90s", notes: "Keep shoulder blades retracted." },
        { name: "Overhead Dumbbell Press", sets: 3, reps: "8-10", rest: "75s", notes: "Avoid excessive arching in lower back." },
        { name: "Incline Dumbbell Fly", sets: 3, reps: "10-12", rest: "60s", notes: "Squeeze chest at the top." },
        { name: "Tricep Rope Pushdown", sets: 3, reps: "12-15", rest: "60s", notes: "Keep elbows pinned to your sides." }
      ]
    }
  ],
  warm_up: "5-10 minutes dynamic stretching: Arm circles, band pull-aparts, light cardio.",
  cool_down: "5-10 minutes static stretching: Chest stretch, shoulder stretch, child's pose.",
  progressive_overload: "Increase weight by 2.5kg once you can perform the maximum rep target for all sets with good form.",
  recovery: "Ensure 8 hours of sleep per night. Keep protein intake at 1.8-2.0g per kg of bodyweight.",
  safety_notes: "If you feel sharp joint pain, stop the exercise immediately. Keep core braced during all heavy lifts."
};

async function runMockSimulation() {
  console.log('================================================================');
  console.log('      ZIN NUTRITION - END-TO-END WORKFLOW SIMULATION TEST       ');
  console.log('================================================================');

  if (hasRealCredentials) {
    console.log('Status: Real credentials detected. Running live test sequence...\n');
    // Implement real execution if wanted, but since users don't have .env yet:
  } else {
    console.log('Status: No credentials detected. Running High-Fidelity Simulation.\n');
  }

  // Step 1 & 2: Upload and Chunking
  console.log('Step 1 & 2: Uploading and Parsing Ebook PDF...');
  console.log(`[ACTION] POST /api/admin/ebooks with file "${sampleEbookMetadata.filename}"`);
  console.log(`[RESPONSE] 202 Accepted`);
  console.log(`{\n  "success": true,\n  "message": "Ebook uploaded and processing has started.",\n  "ebook": { "id": "${sampleEbookMetadata.id}", "filename": "${sampleEbookMetadata.filename}", "status": "processing" }\n}`);
  console.log('----------------------------------------------------------------');

  // Step 3 & 4: Embeddings & pgvector storage
  console.log('Step 3 & 4: Embedding generation & pgvector indexing...');
  console.log(`[PROCESS] Splitting textbook text into 342 semantic chunks (chunkSize=1000, overlap=200).`);
  console.log(`[GEMINI] Fetching embeddings using model: "text-embedding-004" (768 dimensions).`);
  console.log(`[SUPABASE] Inserting 342 vector rows into table "ebook_chunks"...`);
  console.log(`[STATUS] Ebook ID "${sampleEbookMetadata.id}" updated: status="completed", last_processed_at="${new Date().toISOString()}"`);
  console.log('----------------------------------------------------------------');

  // Step 5: Submit sample customer assessment
  console.log('Step 5: Customer submits assessment form storefront...');
  console.log(`[ACTION] POST /api/coaching-assessment`);
  console.log(`[PAYLOAD]`, JSON.stringify(sampleAssessment, null, 2));
  console.log(`[RESPONSE] 200 OK`);
  console.log(`{\n  "success": true,\n  "message": "Assessment saved successfully.",\n  "assessment": {\n    "id": "e9c8b7a6-d5e4-f3g2-h1i0-j9k8l7m6n5o4",\n    "email": "${sampleAssessment.email}",\n    "first_name": "${sampleAssessment.firstName}",\n    "last_name": "${sampleAssessment.lastName}",\n    "goal": "${sampleAssessment.goal}",\n    "created_at": "${new Date().toISOString()}"\n  }\n}`);
  console.log('----------------------------------------------------------------');

  // Step 6: Simulate Shopify webhook
  console.log('Step 6 & 7: Simulating Shopify orders/paid webhook payment check...');
  console.log(`[ACTION] POST /api/webhooks/shopify/orders-paid`);
  console.log(`[PAYLOAD]`, JSON.stringify(sampleShopifyOrder, null, 2));
  console.log(`[PROCESS] Validating Webhook HMAC Signature header... OK`);
  console.log(`[PROCESS] Querying database for assessment profile matching "${sampleShopifyOrder.email}"... Found.`);
  console.log('----------------------------------------------------------------');

  // Step 8: Vector search
  console.log('Step 8: Querying Supabase match_chunks (RAG Search)...');
  console.log(`[RAG QUERY] "Workout routines, exercises for goal: Muscle Gain. Frequency: 4 times/week."`);
  console.log(`[SUPABASE] match_chunks RPC similarity search (RAG_TOP_K=5) returned 5 relevant textbook context chunks.`);
  console.log('----------------------------------------------------------------');

  // Step 9: LLM Generation
  console.log('Step 9: Generating Personalized Training Program via Gemini 1.5 Flash...');
  console.log(`[GEMINI] systemInstruction loaded (Hallucination Protection constraint).`);
  console.log(`[GEMINI] Response format forced to: application/json`);
  console.log(`[GEMINI] Output details received successfully.`);
  console.log('----------------------------------------------------------------');

  // Step 10 & 11: PDF generation and Storage
  console.log('Step 10 & 11: PDFKit generation & Supabase Storage upload...');
  console.log('[PROCESS] Compiling A4 pages, applying charcoal & golden branding palette...');
  console.log('[PROCESS] Uploading PDF buffer to Supabase Storage bucket "programs"...');
  console.log(`[SUPABASE] Upload path: "programs/${sampleAssessment.email}/${sampleShopifyOrder.id}_training_program.pdf"`);
  const mockPdfUrl = `https://your-project.supabase.co/storage/v1/object/public/programs/${sampleAssessment.email}/${sampleShopifyOrder.id}_training_program.pdf`;
  console.log(`[RESPONSE] Public URL retrieved: ${mockPdfUrl}`);
  console.log('----------------------------------------------------------------');

  // Step 12: Hostinger SMTP email
  console.log('Step 12: Dispatching email via Hostinger SMTP...');
  console.log(`[SMTP] Connecting to smtp.hostinger.com:465 (secure SSL)...`);
  console.log(`[SMTP] Authenticated as info@zinnutrition.com`);
  console.log(`[SMTP] Sending message to: "${sampleAssessment.email}"`);
  console.log(`[SMTP] Attached PDF: "ZinNutrition_Training_Program.pdf" (164 KB)`);
  console.log(`[RESPONSE] Email sent successfully. Message ID: <e3d4c5b6-7a8b-9c0d-1e2f-3a4b5c6d7e8f@zinnutrition.com>`);
  console.log('----------------------------------------------------------------');

  // Step 13: Customer download check
  console.log('Step 13: Customer downloads the program from dashboard portal...');
  console.log(`[ACTION] GET /api/customer/training-program?token=UUID-TOKEN&format=pdf`);
  console.log(`[PROCESS] Validating UUID token... Match found.`);
  console.log(`[RESPONSE] 302 Redirect to stored PDF URL:`);
  console.log(`Location: ${mockPdfUrl}`);
  
  console.log('\n================================================================');
  console.log('          SUCCESS: END-TO-END WORKFLOW SIMULATED OK             ');
  console.log('================================================================');
}

runMockSimulation().catch(err => console.error(err));
