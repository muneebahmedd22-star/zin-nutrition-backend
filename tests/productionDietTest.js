const dotenv = require('dotenv');
const path = require('path');
const supabase = require('../src/config/db');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const { handleOrderPaidWebhook } = require('../src/controllers/webhookController');

const TARGET_EMAIL = 'muneebahmedd22@gmail.com';
const TEST_ORDER_ID = '88888888';

async function runProductionDietTest() {
  console.log('================================================================');
  console.log('      ZIN NUTRITION - LIVE DIET WORKFLOW VERIFICATION           ');
  console.log('================================================================');

  try {
    // 1. Ensure diet assessment profile exists
    console.log(`[1/6] Checking for diet assessment matching target: "${TARGET_EMAIL}"...`);
    const { data: existingProfile } = await supabase
      .from('diet_assessments')
      .select('*')
      .eq('email', TARGET_EMAIL)
      .single();

    if (!existingProfile) {
      console.log(`Assessment profile not found. Inserting default test assessment profile for "${TARGET_EMAIL}"...`);
      const { error: insertError } = await supabase
        .from('diet_assessments')
        .insert({
          email: TARGET_EMAIL,
          first_name: 'Muneeb',
          age: 26,
          height: "5'10",
          weight: 75,
          goal: 'Weight Loss',
          blood_type: 'O',
          food_preference: 'Veg',
          allergies: 'None'
        });

      if (insertError) throw insertError;
      console.log('Default test profile created successfully.');
    } else {
      console.log('Customer diet assessment profile successfully retrieved.');
    }

    // 2. Prepare mock Shopify webhook request
    console.log('[2/6] Preparing mock Shopify order payment webhook payload...');
    const req = {
      body: {
        id: TEST_ORDER_ID,
        email: TARGET_EMAIL,
        line_items: [
          {
            id: 111111,
            title: 'Personalized Nutrition Plan - 4 Weeks',
            quantity: 1
          }
        ]
      }
    };

    const res = {
      status(code) {
        return {
          json(data) {
            console.log(`\nWebhook returned HTTP ${code}:`, data);
            if (code === 200 && data.success) {
              console.log('\n================================================================');
              console.log('  SUCCESS: LIVE DIET WORKFLOW VERIFIED SUCCESSFULLY!           ');
              console.log('================================================================');
              process.exit(0);
            } else {
              console.log('\n================================================================');
              console.log('  FAILED: LIVE DIET WORKFLOW VERIFICATION FAILED               ');
              console.log('================================================================');
              process.exit(1);
            }
          }
        };
      }
    };

    // 3. Trigger webhook handler
    console.log('[3/6] Invoking Webhook Controller to start Diet RAG pipeline...');
    await handleOrderPaidWebhook(req, res);

  } catch (err) {
    console.error('\n================================================================');
    console.log('  FAILED: LIVE DIET WORKFLOW TEST ENCOUNTERED AN ERROR          ');
    console.log('================================================================');
    console.error(err);
    process.exit(1);
  }
}

runProductionDietTest();
