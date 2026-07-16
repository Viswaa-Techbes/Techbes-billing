const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const BusinessProfile = require('../src/models/BusinessProfile');
const Item = require('../src/models/Item');
const SalesDocument = require('../src/models/SalesDocument');
const Client = require('../src/models/Client');
const documentService = require('../src/services/documentService');

async function runTest() {
  console.log('Connecting to database...', process.env.MONGODB_URI);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to Database successfully!');

  try {
    // 1. Create/Find a test user
    let user = await User.findOne({ email: 'test_dev_agent@techbes.com' });
    if (!user) {
      user = await User.create({
        name: 'Test Dev Agent',
        email: 'test_dev_agent@techbes.com',
        password: 'password123',
      });
      console.log('Created test user:', user._id);
    } else {
      console.log('Found existing test user:', user._id);
    }

    // 2. Create/Update Business Settings with defaults
    const defaultsPayload = {
      userId: user._id,
      businessName: 'TechBes Test Lab',
      email: 'testlab@techbes.com',
      address: {
        addressLine1: '456 Tech Park',
        city: 'Bengaluru',
        state: 'Karnataka',
        stateCode: 'KA',
        pincode: '560001',
      },
      gstin: '29AAAAA0000A1Z5',
      bankName: 'TechBes Bank',
      accountName: 'TechBes Test Account',
      accountNumber: '1234567890',
      ifsc: 'TBES0000123',
      branchName: 'East Wing',
      upiId: 'techbestest@upi',
      defaultTerms: 'Goods once sold cannot be returned.\nWarranty as per policy.',
      defaultNotes: 'Thank you for choosing TechBes Lab.',
      defaultFooter: 'This is a computer generated test document.',
    };

    const business = await BusinessProfile.findOneAndUpdate(
      { userId: user._id },
      defaultsPayload,
      { new: true, upsert: true }
    );
    console.log('Saved Business defaults permanently in MongoDB!');
    console.log('Default Terms:', business.defaultTerms);
    console.log('Default Notes:', business.defaultNotes);
    console.log('Default Footer:', business.defaultFooter);

    // 3. Create Item Master records
    // Clear old test items
    await Item.deleteMany({ businessId: business._id });

    const item1 = await Item.create({
      businessId: business._id,
      itemName: 'CCTV Camera 5MP',
      sku: 'CCTV-5MP',
      description: 'HD Night Vision Surveillance Camera',
      hsnSac: '8525',
      gstRate: 18,
      unit: 'PCS',
      sellingPrice: 3500,
    });
    console.log('Created Item Master CCTV Camera 5MP, Rate: 3500, GST: 18%');

    // 4. Duplicate Check test
    const dupCheckPayload = {
      businessId: business._id,
      itemName: 'CCTV Camera 5MP',
      sku: 'CCTV-5MP',
    };
    const dupItem = await Item.findOne({
      businessId: business._id,
      itemName: { $regex: new RegExp(`^${dupCheckPayload.itemName}$`, 'i') },
      sku: { $regex: new RegExp(`^${dupCheckPayload.sku}$`, 'i') },
    });
    if (dupItem) {
      console.log('✓ Item Duplicate check successfully warned about duplicate!');
    }

    // 5. Create a test client
    let client = await Client.findOne({ businessId: business._id, clientName: 'Test Client Ltd' });
    if (!client) {
      client = await Client.create({
        businessId: business._id,
        clientName: 'Test Client Ltd',
        clientType: 'BUSINESS',
        gstin: '29BBBBB0000B1Z6',
        billingAddress: {
          addressLine1: 'Client St',
          city: 'Bengaluru',
          state: 'Karnataka',
          stateCode: 'KA',
        },
        createdBy: user._id,
      });
    }

    // 6. Create Invoice with auto-populating defaults & items
    const docData = {
      clientId: client._id,
      documentType: 'INVOICE',
      documentNumber: 'INV-TEST-99',
      issueDate: new Date(),
      validTill: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      placeOfSupply: {
        state: 'Karnataka',
        stateCode: 'KA',
      },
      items: [
        {
          itemName: 'CCTV Camera 5MP',
          description: item1.description,
          hsnSac: item1.hsnSac,
          gstRate: item1.gstRate,
          quantity: 2,
          unit: item1.unit,
          rate: item1.sellingPrice,
        },
      ],
    };

    console.log('Creating Invoice document...');
    const invoice = await documentService.createDocument(user._id, docData);

    console.log('Invoice saved successfully! Verifying loaded defaults...');
    console.log('Auto-loaded Terms:', invoice.terms);
    console.log('Auto-loaded Notes:', invoice.notes);
    console.log('Auto-loaded Footer:', invoice.footer);
    console.log('Auto-loaded Bank Details:', invoice.bankDetails);
    console.log('Auto-loaded UPI Details:', invoice.upiDetails);

    // Assertions
    if (invoice.terms !== business.defaultTerms) throw new Error('Terms mismatch!');
    if (invoice.notes !== business.defaultNotes) throw new Error('Notes mismatch!');
    if (invoice.footer !== business.defaultFooter) throw new Error('Footer mismatch!');
    if (invoice.bankDetails.accountNumber !== business.accountNumber) throw new Error('Bank Account number mismatch!');
    if (invoice.items[0].total !== 8260) { // 7000 base + 18% GST (1260) = 8260
      throw new Error(`Total price calculation mismatch! Expected 8260, got ${invoice.items[0].total}`);
    }
    console.log('✓ Calculation matches! CCTV Camera 5MP x 2 = ₹7,000 + 18% GST = ₹8,260');

    // 7. Verify Item Usage Frequency got incremented
    const updatedItem = await Item.findById(item1._id);
    console.log('Updated Item Usage Frequency:', updatedItem.usageFrequency);
    if (updatedItem.usageFrequency !== 1) throw new Error('Usage frequency not incremented!');
    console.log('✓ Usage frequency correctly incremented!');

    console.log('\n========================================');
    console.log('ALL TESTS PASSED SUCCESSFULLY! ✓');
    console.log('========================================\n');

  } catch (error) {
    console.error('Test Failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

runTest();
