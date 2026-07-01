const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = require('../src/config/db');
const { searchKnowledgeBase } = require('../src/services/rag');
const { generateTrainingProgram } = require('../src/services/gemini');
const { generateProgramPDF } = require('../src/services/pdf');
const { sendProgramEmail } = require('../src/services/email');

const TARGET_EMAIL = 'muneebahmedd22@gmail.com';
const TEST_ORDER_ID = '99999999';

async function runProductionFlowTest() {
  console.log('================================================================');
  console.log('      ZIN NUTRITION - LIVE PRODUCTION WORKFLOW VERIFICATION     ');
  console.log('================================================================');
  
  // Verify configuration keys are present
  if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-supabase-project')) {
    console.error('ERROR: Live SUPABASE_URL is not configured in your .env file.');
    process.exit(1);
  }
  if (!process.env.SUPABASE_KEY || process.env.SUPABASE_KEY.includes('your-supabase-service-role-key')) {
    console.error('ERROR: Live SUPABASE_KEY (service_role) is not configured in your .env file.');
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your-gemini-api-key')) {
    console.error('ERROR: Live GEMINI_API_KEY is not configured in your .env file.');
    process.exit(1);
  }

  try {
    console.log(`[1/8] Checking for customer assessment matching target: "${TARGET_EMAIL}"...`);
    
    // First retrieve or insert a test assessment profile to guarantee execution
    const { data: existingProfile, error: profileError } = await supabase
      .from('assessments')
      .select('*')
      .eq('email', TARGET_EMAIL)
      .maybeSingle();

    let profile;
    if (profileError) {
      throw new Error(`Supabase query failed: ${profileError.message}`);
    }

    if (!existingProfile) {
      console.log(`Assessment profile not found. Inserting default test assessment profile for "${TARGET_EMAIL}"...`);
      const { data: newProfile, error: insertError } = await supabase
        .from('assessments')
        .insert({
          email: TARGET_EMAIL,
          first_name: 'Muneeb',
          last_name: 'Ahmed',
          age: 25,
          height: "5'11",
          weight: 75.0,
          goal: 'Muscle Gain',
          food_preference: 'Non-Veg',
          carbs_preference: 'Rice',
          meat_preference: 'Chicken',
          allergies: 'None',
          workout_frequency: '4 times per week',
          comments: 'Focus on shoulder health and progressive overload.'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to insert test profile: ${insertError.message}`);
      }
      profile = newProfile;
      console.log('Default test profile created successfully.');
    } else {
      profile = existingProfile;
      console.log('Customer assessment profile successfully retrieved.');
    }

    // 2. Search Ebook Chunks using pgvector similarity search
    console.log(`[2/8] Generating query embedding & performing similarity search on Supabase (pgvector)...`);
    const searchQuery = `Workout splits, exercises, sets, reps for Muscle Gain. Frequency: 4 times/week.`;
    const contexts = await searchKnowledgeBase(searchQuery);

    if (!contexts || contexts.length === 0) {
      throw new Error('No textbook contexts retrieved. Make sure you have uploaded and embedded an ebook first using tests/mockFlow.js.');
    }
    console.log(`Retrieved ${contexts.length} relevant ebook text chunks from Supabase.`);

    // 3. Generate Program via Gemini
    console.log(`[3/8] Requesting program generation from Google Gemini (Hallucination protected RAG)...`);
    const systemInstruction = `
      You are an expert Personal Trainer AI. Your task is to generate a fully customized Training Program based on the retrieved textbook contexts provided by the user.
      
      CRITICAL SAFETY RULES (HALLUCINATION PROTECTION):
      1. Ground your recommendations on the provided textbook context as much as possible.
      2. If the contexts do not contain enough details, you may use your standard professional personal training knowledge base to complete the plan, ensuring it remains fully professional.
      3. Return a valid JSON object matching the following structural schema:
      {
        "weekly_split": {
          "Day 1": "Description of split"
        },
        "routines": [
          {
            "day_name": "Day 1",
            "exercises": [
              { "name": "Exercise Name", "sets": 3, "reps": "8-12", "rest": "60s", "notes": "Cues" }
            ]
          }
        ],
        "warm_up": "Warm-up steps",
        "cool_down": "Cool-down steps",
        "progressive_overload": "Detailed progression instructions",
        "recovery": "Sleep, nutrition guidelines",
        "safety_notes": "Precautions"
      }
      4. Return raw JSON string only.
    `;

    const userPrompt = `
      Client Profile:
      - Name: ${profile.first_name} ${profile.last_name}
      - Goal: ${profile.goal}
      - Frequency: ${profile.workout_frequency}
      - Preferences: ${profile.food_preference}

      Textbook Context:
      ${contexts.join('\n\n')}
    `;

    const rawResponse = await generateTrainingProgram(userPrompt, systemInstruction);
    const programJson = JSON.parse(rawResponse);

    if (programJson.insufficient_knowledge) {
      throw new Error(programJson.message || 'INSUFFICIENT_KNOWLEDGE_BASE');
    }
    console.log('Personalized program generated by Gemini.');

    // 4. Generate PDF Report
    console.log('[4/8] Building branded PDF file using PDFKit...');
    const pdfBuffer = await generateProgramPDF(programJson, profile);
    console.log(`PDF buffer created successfully (${Math.round(pdfBuffer.length / 1024)} KB).`);

    // 5. Upload PDF to Supabase Storage
    console.log('[5/8] Uploading PDF buffer to Supabase Storage bucket "programs"...');
    const bucketName = 'programs';
    const filePath = `${TARGET_EMAIL}/${TEST_ORDER_ID}_training_program.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Supabase Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(filePath);
    const pdfUrl = urlData.publicUrl;
    console.log(`PDF successfully stored. Public URL: ${pdfUrl}`);

    // 6. Save PDF Link to Database
    console.log('[6/8] Saving generated program to database...');
    const { data: savedProgram, error: dbError } = await supabase
      .from('generated_programs')
      .upsert({
        email: TARGET_EMAIL,
        order_id: TEST_ORDER_ID,
        pdf_url: pdfUrl,
        program_data: programJson,
        updated_at: new Date().toISOString()
      }, { onConflict: 'order_id' })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to save program to database: ${dbError.message}`);
    }
    console.log(`Program metadata successfully stored in DB. Program ID: ${savedProgram.id}`);

    // 7. Send Email via Hostinger SMTP
    console.log(`[7/8] Dispatching program email via Hostinger SMTP to "${TARGET_EMAIL}"...`);
    const emailInfo = await sendProgramEmail(TARGET_EMAIL, profile.first_name, pdfBuffer);
    console.log('Email sent successfully. Hostinger relay response:', emailInfo.response);

    // 8. Completed
    console.log('\n================================================================');
    console.log('  SUCCESS: LIVE PRODUCTION WORKFLOW VERIFIED SUCCESSFULLY!       ');
    console.log('================================================================');
    console.log(`PDF Link: ${pdfUrl}`);
    console.log(`Program ID Token: ${savedProgram.id}`);

  } catch (error) {
    console.error('\n================================================================');
    console.error('  FAILED: LIVE PRODUCTION WORKFLOW TEST ENCOUNTERED AN ERROR    ');
    console.error('================================================================');
    console.error(error.message || error);
    process.exit(1);
  }
}

runProductionFlowTest();
