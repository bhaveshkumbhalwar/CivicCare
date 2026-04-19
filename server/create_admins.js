const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const admins = [
  {
    name: 'College Admin',
    email: 'college@admin.com',
    password: 'admin123',
    role: 'admin_colleges'
  },
  {
    name: 'Government Admin',
    email: 'gov@admin.com',
    password: 'admin123',
    role: 'admin_government'
  },
  {
    name: 'System Super Admin',
    email: 'super@admin.com',
    password: 'admin123',
    role: 'super_admin'
  }
];

const createAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    for (const admin of admins) {
      const existing = await User.findOne({ email: admin.email });
      if (existing) {
        console.log(`ℹ️ Admin ${admin.email} already exists, skipping...`);
        continue;
      }
      
      await User.create(admin);
      console.log(`✅ Admin created: ${admin.email} (${admin.role})`);
    }

    console.log('\n🚀 Setup complete! Use "admin123" as the password for all accounts.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  }
};

createAdmins();
