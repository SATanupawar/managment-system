import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Set the MONGODB_URI environment variable in .env');
}

// Catch common Atlas connection string mistakes early
function assertValidMongoUri(uri) {
  const match = uri.match(/^mongodb(\+srv)?:\/\/([^/?]+)/);
  if (!match) return;

  const credentials = match[2];
  if (!credentials.includes('@')) return;

  const userPass = credentials.split('@')[0];
  if (!userPass.includes(':')) {
    throw new Error(
      'MONGODB_URI is missing the database password. Use: mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/hr_recruitment'
    );
  }

  const password = userPass.split(':').slice(1).join(':');
  if (!password) {
    throw new Error(
      'MONGODB_URI has an empty password. Copy the full connection string from MongoDB Atlas.'
    );
  }
}

assertValidMongoUri(MONGODB_URI);

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).catch((error) => {
      cached.promise = null;
      if (error?.code === 8000 || error?.codeName === 'AtlasError') {
        throw new Error(
          'MongoDB login failed. Check DB username/password in MONGODB_URI and confirm the user exists in Atlas → Database Access.'
        );
      }
      throw error;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
