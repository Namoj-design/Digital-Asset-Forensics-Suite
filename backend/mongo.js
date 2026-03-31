import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dafs';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('✅ Connected to MongoDB (Investigator Canvas Data)');
}).catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.error('⚠️ The Investigator Canvas feature requires MongoDB to be running.');
});

export default mongoose;
