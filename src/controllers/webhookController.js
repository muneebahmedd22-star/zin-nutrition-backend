const supabase = require('../config/db');
const { searchKnowledgeBase } = require('../services/rag');
const { generateTrainingProgram } = require('../services/gemini');
const { generateProgramPDF } = require('../services/pdf');
const { sendProgramEmail } = require('../services/email');
const { generateGeneralDietPDF, generateGeneralWorkoutPDF } = require('../services/generalPdfs');

/**
 * Executes the core Workout RAG generation pipeline
 */
async function runRAGPipeline(profile, orderId) {
  const email = profile.email.toLowerCase();
  const searchQuery = `Workout routines, exercises, splits, sets, reps for goal: ${profile.goal}. Workout frequency: ${profile.workout_frequency}. Preferences: food: ${profile.food_preference}, carbs: ${profile.carbs_preference || 'Regular Carbs'}.`;
  
  const contexts = await searchKnowledgeBase(searchQuery);
  const contextText = contexts.join('\n\n');

  const systemInstruction = `
    You are an expert Personal Trainer AI. Your task is to generate a fully customized Training Program based on the retrieved textbook contexts provided by the user.
    
    CRITICAL WORKOUT GENERATION RULES (FOR HIGH QUALITY DATA):
    1. Ground your recommendations on the provided textbook context as much as possible.
    2. If the contexts do not contain enough details, you may use your standard professional personal training knowledge base to complete the plan, ensuring it remains fully professional.
    3. Return a valid JSON object matching the structural schema below.
    4. For EACH exercise inside the "exercises" array:
       - The "notes" field MUST contain:
         - Setup & posture cue (e.g. "Keep feet shoulder-width, engage core, shoulder blades retracted").
         - Specific breathing instruction (e.g. "Inhale slowly during eccentric drop, hold 0.5s, exhale forcefully as you drive up").
         - Progressive warm-up set instruction (e.g. "Warmup: 1 set at 50% working weight x 10 reps, 1 set at 75% x 5 reps, then start working sets").
    
    Return a valid JSON object matching the following structural schema:
    {
      "weekly_split": {
        "Day 1": "Description of split",
        "Day 2": "Description of split",
        ...
      },
      "routines": [
        {
          "day_name": "Day 1 - Push Focus",
          "exercises": [
            { "name": "Exercise Name", "sets": 3, "reps": "8-12", "rest": "60s", "notes": "Detailed setup cue. Breathing cue. Warmup sets guide." }
          ]
        }
      ],
      "warm_up": "Thorough warm-up routine with specific joint prep steps",
      "cool_down": "Cool-down and mobility stretches with time/duration details",
      "progressive_overload": "Detailed progression instructions and RPE targets",
      "recovery": "Sleep, protein targets, and active recovery guidelines",
      "safety_notes": "Important injury prevention guidelines and form safety limits"
    }
    5. Do not output markdown backticks (e.g. \`\`\`json) in your final response. Return raw JSON string only.
  `;

  const userPrompt = `
    Client Assessment Profile:
    - Name: ${profile.first_name} ${profile.last_name || ''}
    - Age: ${profile.age}
    - Height: ${profile.height}
    - Weight: ${profile.weight} kg
    - Fitness Goal: ${profile.goal}
    - Workout Frequency: ${profile.workout_frequency} times/week
    - Food Preference: ${profile.food_preference}
    - Allergies: ${profile.allergies || 'None'}
    - Comments: ${profile.comments || 'None'}

    Retrieved Textbook Context:
    ${contextText}
  `;

  const rawResponse = await generateTrainingProgram(userPrompt, systemInstruction);
  const programJson = JSON.parse(rawResponse);

  if (programJson.insufficient_knowledge) {
    throw new Error(programJson.message || 'INSUFFICIENT_KNOWLEDGE_BASE');
  }

  const pdfBuffer = await generateProgramPDF(programJson, profile);

  // Generate complimentary General Diet PDF
  let generalDietPdf = null;
  try {
    // Workout buyer gets standard Type O/A/B/AB Diet Guide
    const bloodType = profile.blood_type || 'O';
    generalDietPdf = await generateGeneralDietPDF(bloodType);
    console.log(`Generated complimentary General Diet PDF for Blood Type ${bloodType}`);
  } catch (pdfErr) {
    console.error('Failed to compile General Diet PDF:', pdfErr.message);
  }

  let pdfUrl = null;
  try {
    const bucketName = 'programs';
    const filePath = `${email}/${orderId}_training_program.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });
      
    if (uploadError) {
      console.error('Supabase Storage PDF upload failed:', uploadError.message);
    } else {
      const { data: urlData } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(filePath);
      pdfUrl = urlData.publicUrl;
      console.log('PDF successfully uploaded to Supabase Storage. Public URL:', pdfUrl);
    }
  } catch (storageErr) {
    console.error('Error uploading PDF to storage:', storageErr);
  }

  // Send email with both customized Workout PDF and complimentary General Diet PDF + 50% discount coupon code
  await sendProgramEmail(email, profile.first_name, pdfBuffer, generalDietPdf, false, 'ZIN50DIET');

  const { data: program, error: upsertError } = await supabase
    .from('generated_programs')
    .upsert({
      email: email,
      order_id: orderId,
      pdf_url: pdfUrl,
      program_data: programJson,
      updated_at: new Date().toISOString()
    }, { onConflict: 'order_id' })
    .select()
    .single();

  if (upsertError) throw upsertError;
  return program;
}

/**
 * Executes the core Diet/Nutrition RAG generation pipeline
 */
async function runDietRAGPipeline(profile, orderId) {
  const email = profile.email.toLowerCase();
  
  // 1. Build Diet RAG Search Query targeting the specific Blood Type & medical context
  const searchQuery = `Blood Type ${profile.blood_type} diet guidelines, food choices, meats, poultry, seafood, grains, dairy, vegetables, fruits, condiments, supplements. Medical restrictions: ${profile.medical_history || 'None'}, carbs: ${profile.carbs_preference || 'Regular Carbs'}`;
  
  const contexts = await searchKnowledgeBase(searchQuery);
  const contextText = contexts.join('\n\n');

  // 2. Define prompt guidelines matching PDF schema
  const systemInstruction = `
    You are an expert Dietitian and Nutritionist AI. Your task is to generate a fully customized 4-Week Diet & Meal Program based on the retrieved book contexts provided by the user.
    
    CRITICAL GLOBAL LOCALIZATION RULE (APPLIES TO ENTIRE RESPONSE):
    - Since the client is in Pakistan, you MUST NOT use or suggest any imported, expensive, or unavailable food items in ANY part of the generated JSON (including the "weekly_split" overview, "routines" lists, and "cool_down" grocery lists).
    - STICTLY FORBIDDEN IN ALL SECTIONS: Quinoa, Salmon, Avocados, Blueberries, Bison, Turkey, Rye Bread, Almond Milk, Cod, Tuna, Cranberries, Raspberries, Kale, Brussels sprouts, Asparagus.
    - ALLOWED IN ALL SECTIONS: Chicken breast, lean beef, mutton, local fish (Rahu, Singari, Pomfret), eggs (desi or farm), basmati rice, chapati/roti, oats (dalia), local brown/white bread, potatoes (aloo), lentils (daal), chickpeas (safaid chana), normal cow/buffalo milk, local dahi (yogurt), cottage cheese (paneer), seasonal local fruits (apples, bananas, seasonal melons, guavas, oranges), almonds, walnuts, local vegetables (broccoli, cabbage, cauliflower, spinach, cucumbers, leafy greens, carrots).

    CRITICAL DIET GENERATION RULES:
    1. Ground your recommendations on the provided blood type book context as much as possible, but filter out forbidden foods.
    2. Customize the meals specifically matching the client's Blood Type: "${profile.blood_type}".
    3. Return a valid JSON object matching the structural schema below.
    4. For EACH meal item inside the "exercises" array (representing meals):
       - The "sets" field represents portion size (e.g. "1 Plate / 1 Bowl / 2 Eggs").
       - The "reps" field represents calories (e.g. "Approx. 450 kcal").
       - The "notes" field MUST strictly contain these exact tags, filled with allowed local Pakistani details:
         "[WHAT_TO_EAT] <precise name of meal> [INGREDIENTS] <list of local ingredients> [COOKING_WAY] <step-by-step simple pakistani cooking method> [SWAP_OPTION] <local swap alternative> [MACROS] Protein: Xg | Carbs: Yg | Fats: Zg"
    
    Return a valid JSON object matching the following structural schema:
    {
      "weekly_split": {
        "Monday": "Overview of meals for Monday (Strictly allowed local foods only)",
        "Tuesday": "Overview of meals for Tuesday (Strictly allowed local foods only)",
        "Wednesday": "Overview of meals for Wednesday (Strictly allowed local foods only)",
        "Thursday": "Overview of meals for Thursday (Strictly allowed local foods only)",
        "Friday": "Overview of meals for Friday (Strictly allowed local foods only)",
        "Saturday": "Overview of meals for Saturday (Strictly allowed local foods only)",
        "Sunday": "Overview of meals for Sunday (Strictly allowed local foods only)"
      },
      "routines": [
        {
          "day_name": "Monday Meal Schedule",
          "exercises": [
            { "name": "Meal 1: Breakfast", "sets": "Portion size", "reps": "Approx. 400 kcal", "rest": "08:00 AM", "notes": "[WHAT_TO_EAT] Oats cooked in cow's milk with sliced banana. [INGREDIENTS] 50g oats (dalia), 1 glass milk, 1 small banana. [COOKING_WAY] Cook oats in milk on medium heat. Top with banana. Avoid white sugar. [SWAP_OPTION] Swap with 3 boiled eggs + 2 slices of brown bread. [MACROS] Protein: 25g | Carbs: 55g | Fats: 8g" }
          ]
        }
      ],
      "warm_up": "Detailed daily calorie target and daily macro split calculations",
      "cool_down": "Hydration requirements, green tea guidelines & weekly grocery list",
      "progressive_overload": "Weekly diet adaptation instructions, chewing speed, and portion adjustment tips",
      "recovery": "Highly beneficial supplement timing & dosage matrix based on Blood Type",
      "safety_notes": "Food items and combinations to strictly AVOID (based on Blood Type O/A/B/AB guidelines)"
    }
    7. Do not output markdown backticks (e.g. \`\`\`json) in your final response. Return raw JSON string only.
  `;

  const userPrompt = `
    Client Diet Profile:
    - Name: ${profile.first_name}
    - Age: ${profile.age}
    - Height: ${profile.height}
    - Weight: ${profile.weight} kg
    - Goal: ${profile.goal}
    - Blood Type: ${profile.blood_type}
    - Medical History: ${profile.medical_history || 'None'}
    - Carbs Preference: ${profile.carbs_preference || 'Regular Carbs'}
    - Preference: ${profile.food_preference}
    - Allergies: ${profile.allergies || 'None'}

    Retrieved Book Context:
    ${contextText}
  `;

  const rawResponse = await generateTrainingProgram(userPrompt, systemInstruction);
  const planJson = JSON.parse(rawResponse);

  const pdfBuffer = await generateProgramPDF(planJson, profile);

  // Generate complimentary General Workout PDF based on Goal
  let generalWorkoutPdf = null;
  try {
    generalWorkoutPdf = await generateGeneralWorkoutPDF(profile.goal || 'Weight Loss');
    console.log(`Generated complimentary General Workout PDF for Goal ${profile.goal}`);
  } catch (pdfErr) {
    console.error('Failed to compile General Workout PDF:', pdfErr.message);
  }

  let pdfUrl = null;
  try {
    const bucketName = 'programs';
    const filePath = `${email}/${orderId}_diet_plan.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });
      
    if (uploadError) {
      console.error('Supabase Storage Diet PDF upload failed:', uploadError.message);
    } else {
      const { data: urlData } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(filePath);
      pdfUrl = urlData.publicUrl;
      console.log('Diet PDF successfully uploaded to Supabase Storage. Public URL:', pdfUrl);
    }
  } catch (storageErr) {
    console.error('Error uploading Diet PDF to storage:', storageErr);
  }

  // Send email with both customized Diet PDF and complimentary General Workout PDF + 50% discount coupon code
  await sendProgramEmail(email, profile.first_name, pdfBuffer, generalWorkoutPdf, true, 'ZIN50FIT');

  const { data: dietPlan, error: upsertError } = await supabase
    .from('generated_diet_plans')
    .upsert({
      email: email,
      order_id: orderId,
      pdf_url: pdfUrl,
      plan_data: planJson,
      updated_at: new Date().toISOString()
    }, { onConflict: 'order_id' })
    .select()
    .single();

  if (upsertError) throw upsertError;
  return dietPlan;
}

/**
 * Handle Shopify orders/paid Webhook
 */
async function handleOrderPaidWebhook(req, res) {
  try {
    const orderData = req.body;
    if (!orderData || !orderData.email) {
      return res.status(400).json({ success: false, message: 'Invalid order payload.' });
    }

    const email = orderData.email.toLowerCase().trim();
    const orderId = String(orderData.id);

    // Detect if order contains a diet plan or a fitness program
    let isDietOrder = false;
    if (orderData.line_items && Array.isArray(orderData.line_items)) {
      isDietOrder = orderData.line_items.some(item => {
        const title = (item.title || '').toLowerCase();
        return title.includes('diet') || title.includes('nutrition') || title.includes('meal');
      });
    }

    if (isDietOrder) {
      // 1. Process Diet Assessment
      const { data: profile, error } = await supabase
        .from('diet_assessments')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !profile) {
        console.warn(`Diet assessment profile not found for email: ${email}. Webhook deferred.`);
        return res.status(200).json({
          success: false,
          message: 'Order paid, but customer diet assessment details are missing.'
        });
      }

      const plan = await runDietRAGPipeline(profile, orderId);
      return res.status(200).json({
        success: true,
        message: 'Diet plan generated and emailed successfully.',
        planId: plan.id
      });

    } else {
      // 2. Process Workout Assessment (Default)
      const { data: profile, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !profile) {
        console.warn(`Workout assessment profile not found for email: ${email}. Webhook deferred.`);
        return res.status(200).json({
          success: false,
          message: 'Order paid, but customer workout assessment details are missing.'
        });
      }

      const program = await runRAGPipeline(profile, orderId);
      return res.status(200).json({
        success: true,
        message: 'Workout program generated and emailed successfully.',
        programId: program.id
      });
    }

  } catch (error) {
    console.error('Webhook processing failed:', error);
    if (error.message.includes('INSUFFICIENT_KNOWLEDGE_BASE')) {
      return res.status(200).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Manual/Admin trigger to regenerate a program (e.g. after updated ebook uploads)
 */
async function regenerateProgram(req, res) {
  const { id } = req.params;
  try {
    const { data: program, error: selectError } = await supabase
      .from('generated_programs')
      .select('*')
      .eq('id', id)
      .single();

    if (selectError || !program) {
      return res.status(404).json({ success: false, message: 'Program not found.' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('assessments')
      .select('*')
      .eq('email', program.email)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ success: false, message: 'Customer assessment profile not found.' });
    }

    // Rerun generator pipeline
    const updatedProgram = await runRAGPipeline(profile, program.order_id);

    return res.status(200).json({
      success: true,
      message: 'Program regenerated and emailed successfully.',
      program: updatedProgram
    });

  } catch (error) {
    console.error('Regeneration failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  handleOrderPaidWebhook,
  regenerateProgram
};
